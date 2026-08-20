import argparse
import os
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

NS = {"android": "http://schemas.android.com/apk/res/android"}
VIEW = 108
SUPERSAMPLE = 4


def hex_to_rgb(code):
    code = code.lstrip("#")
    if len(code) == 8:
        code = code[:6]
    elif len(code) == 3:
        code = "".join(c * 2 for c in code)
    return tuple(int(code[i : i + 2], 16) for i in (0, 2, 4))


def tokenize(data):
    toks = []
    num = ""
    for ch in data:
        if ch.isalpha():
            if num:
                toks.append(float(num))
                num = ""
            toks.append(ch)
        elif ch in "+-":
            if num:
                toks.append(float(num))
                num = ""
            num = ch
        elif ch.isdigit() or ch == ".":
            num += ch
        else:
            if num:
                toks.append(float(num))
                num = ""
    if num:
        toks.append(float(num))
    return toks


def parse_path(data):
    """Parse SVG/Android pathData into absolute segments (Android space, y down).

    Returns list of (cmd, coords), cmd in M L C Z. Handles relative h/v
    commands and implicit repetition of a command.
    """
    toks = tokenize(data)
    segs = []
    i = 0
    cur = (0.0, 0.0)
    start = (0.0, 0.0)
    implicit = None

    def num():
        nonlocal i
        v = toks[i]
        i += 1
        return v

    while i < len(toks):
        t = toks[i]
        if isinstance(t, str):
            cmd = t
            implicit = None
            i += 1
        elif implicit:
            cmd = implicit
        else:
            break

        if cmd in "Mm":
            x = num()
            y = num()
            p = (x, y) if cmd == "M" else (cur[0] + x, cur[1] + y)
            if cmd == "M":
                cur = start = p
            else:
                cur = p
            segs.append(("M", p))
            implicit = "l" if cmd == "M" else "l"
        elif cmd in "Ll":
            x = num()
            y = num()
            p = (x, y) if cmd == "L" else (cur[0] + x, cur[1] + y)
            cur = p
            segs.append(("L", p))
            implicit = "l" if cmd == "l" else "L"
        elif cmd in "Hh":
            v = num()
            p = (v, cur[1]) if cmd == "H" else (cur[0] + v, cur[1])
            cur = p
            segs.append(("L", p))
            implicit = cmd
        elif cmd in "Vv":
            v = num()
            p = (cur[0], v) if cmd == "V" else (cur[0], cur[1] + v)
            cur = p
            segs.append(("L", p))
            implicit = cmd
        elif cmd in "Cc":
            a = num()
            b = num()
            c = num()
            d = num()
            e = num()
            f = num()
            p1 = (a, b) if cmd == "C" else (cur[0] + a, cur[1] + b)
            p2 = (c, d) if cmd == "C" else (cur[0] + c, cur[1] + d)
            p3 = (e, f) if cmd == "C" else (cur[0] + e, cur[1] + f)
            segs.append(("C", (cur, p1, p2, p3)))
            cur = p3
            implicit = "c" if cmd == "c" else "C"
        elif cmd in "Zz":
            segs.append(("Z", None))
            cur = start
            implicit = None
        else:
            raise ValueError(f"unsupported command {cmd!r}")

    return segs


def load_vector(xml_path):
    """Return list of (fill_rgba, segs) in Android space, y down."""
    root = ET.parse(xml_path).getroot()

    def walk(elem, tx, ty):
        out = []
        for child in elem:
            tag = child.tag.split("}")[-1]
            if tag == "path":
                fill = hex_to_rgb(child.get(f"{{{NS['android']}}}fillColor"))
                path_data = child.get(f"{{{NS['android']}}}pathData")
                segs = parse_path(path_data)
                translated = []
                for kind, data in segs:
                    if kind in ("M", "L"):
                        x, y = data
                        translated.append((kind, (x + tx, y + ty)))
                    elif kind == "C":
                        spos, (a, b), (c, d), (e, f) = data
                        translated.append((kind, ((spos[0] + tx, spos[1] + ty), (a + tx, b + ty), (c + tx, d + ty), (e + tx, f + ty))))
                    else:
                        translated.append((kind, data))
                out.append((fill, translated))
            elif tag == "group":
                gtx = float(child.get(f"{{{NS['android']}}}translateX") or 0)
                gty = float(child.get(f"{{{NS['android']}}}translateY") or 0)
                out.extend(walk(child, tx + gtx, ty + gty))
        return out

    return walk(root, 0.0, 0.0)


def bezier_points(segs, scale, size):
    """Flatten segments into polygon points in image space (y up)."""
    pts = []
    for kind, data in segs:
        if kind == "M":
            x, y = data
            pts.append((x * scale, size - y * scale))
        elif kind == "L":
            x, y = data
            pts.append((x * scale, size - y * scale))
        elif kind == "C":
            (x0, y0), (x1, y1), (x2, y2), (x3, y3) = data
            a = [(x0 * scale, size - y0 * scale),
                 (x1 * scale, size - y1 * scale),
                 (x2 * scale, size - y2 * scale),
                 (x3 * scale, size - y3 * scale)]
            steps = 64
            for k in range(1, steps + 1):
                t = k / steps
                mt = 1 - t
                px = mt**3 * a[0][0] + 3 * mt**2 * t * a[1][0] + 3 * mt * t**2 * a[2][0] + t**3 * a[3][0]
                py = mt**3 * a[0][1] + 3 * mt**2 * t * a[1][1] + 3 * mt * t**2 * a[2][1] + t**3 * a[3][1]
                pts.append((px, py))
    return pts


def main():
    ap = argparse.ArgumentParser(description="Render Android adaptive launcher icon to PNG")
    ap.add_argument("--background", required=True, help="path to ic_launcher_background.xml")
    ap.add_argument("--foreground", required=True, help="path to ic_launcher_foreground.xml")
    ap.add_argument("--out", required=True, help="output PNG path")
    ap.add_argument("--size", type=int, default=1024, help="output size in px")
    ap.add_argument("--round", action="store_true", help="circle mask instead of rounded square")
    args = ap.parse_args()

    bg_shapes = load_vector(args.background)
    fg_shapes = load_vector(args.foreground)
    bg_color = bg_shapes[0][0]

    inner = args.size * SUPERSAMPLE
    scale = inner / VIEW
    img = Image.new("RGBA", (inner, inner), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)

    if args.round:
        radius = inner // 2
    else:
        radius = int(inner * 0.22)

    dr.rounded_rectangle((0, 0, inner - 1, inner - 1), radius=radius, fill=bg_color + (255,))

    for fill, segs in fg_shapes:
        pts = bezier_points(segs, scale, inner)
        if pts:
            dr.polygon(pts, fill=fill + (255,))

    out_size = (args.size, args.size)
    img = img.resize(out_size, Image.LANCZOS)
    img.save(args.out)
    print(f"wrote {args.out} ({os.path.getsize(args.out)} bytes)")


if __name__ == "__main__":
    main()