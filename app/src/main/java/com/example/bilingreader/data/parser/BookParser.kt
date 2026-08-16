package com.example.bilingreader.data.parser

import com.example.bilingreader.data.model.AlignedPair
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.model.BookNode
import com.example.bilingreader.data.model.Chapter
import com.example.bilingreader.data.model.ChapterNode
import com.example.bilingreader.data.model.ContainerNode
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStream

object BookParser {

    fun parse(inputStream: InputStream): Book {
        val text = inputStream.bufferedReader().use { it.readText() }
        val root = JSONArray(text)

        // Detect format: nested tree has "type" / "children" / "pairs" on intermediate nodes;
        // legacy flat format has top-level objects with "pair_num" + "pairs".
        val isNested = root.length() > 0 && root.getJSONObject(0).let { obj ->
            obj.has("type") || obj.has("children") ||
                (obj.has("pairs") && !obj.has("pair_num"))
        }

        return if (isNested) parseNested(root) else parseFlat(root)
    }

    // ── Legacy flat format ──────────────────────────────────────────────────

    private fun parseFlat(jsonArray: JSONArray): Book {
        val chapters = mutableListOf<Chapter>()
        for (i in 0 until jsonArray.length()) {
            val obj = jsonArray.getJSONObject(i)
            chapters += Chapter(
                pairNum = obj.optInt("pair_num", i + 1),
                titleSrc = obj.optStringOrNull("title_src"),
                titleTgt = obj.optStringOrNull("title_tgt"),
                pairs = parsePairs(obj.optJSONArray("pairs"))
            )
        }
        return Book(roots = emptyList(), chapters = chapters)
    }

    // ── Nested tree format ──────────────────────────────────────────────────

    private fun parseNested(root: JSONArray): Book {
        val roots = mutableListOf<BookNode>()
        for (i in 0 until root.length()) {
            roots += parseNode(root.getJSONObject(i))
        }
        val chapters = flatten(roots)
        return Book(roots = roots, chapters = chapters)
    }

    private fun parseNode(obj: JSONObject): BookNode {
        val titleSrc = obj.optStringOrNull("title_src")
        val titleTgt = obj.optStringOrNull("title_tgt")
        val type = obj.optString("type", "")
        val number = when {
            obj.has("subchapter_num") -> obj.optInt("subchapter_num")
            obj.has("chapter_num") -> obj.optInt("chapter_num")
            obj.has("pair_num") -> obj.optInt("pair_num")
            else -> null
        }

        // Leaf: has a non-empty "pairs" array
        val pairsArray = obj.optJSONArray("pairs")
        if (pairsArray != null && pairsArray.length() > 0) {
            return ChapterNode(
                number = number,
                titleSrc = titleSrc,
                titleTgt = titleTgt,
                pairs = parsePairs(pairsArray)
            )
        }

        // Container (or empty leaf treated as container with no children)
        val children = mutableListOf<BookNode>()
        val childrenArray = obj.optJSONArray("children")
        if (childrenArray != null) {
            for (i in 0 until childrenArray.length()) {
                children += parseNode(childrenArray.getJSONObject(i))
            }
        }
        return ContainerNode(
            type = type.ifBlank { "container" },
            number = number,
            titleSrc = titleSrc,
            titleTgt = titleTgt,
            children = children
        )
    }

    /**
     * Walk the tree depth-first and produce a flat list of [Chapter]s.
     * Ancestor titles are collected into [Chapter.pathSrc] / [Chapter.pathTgt].
     */
    private fun flatten(nodes: List<BookNode>): List<Chapter> {
        val out = mutableListOf<Chapter>()
        var pairNum = 1

        fun walk(node: BookNode, pathSrc: List<String>, pathTgt: List<String>) {
            when (node) {
                is ChapterNode -> {
                    out += Chapter(
                        pairNum = pairNum++,
                        titleSrc = node.titleSrc,
                        titleTgt = node.titleTgt,
                        pairs = node.pairs,
                        pathSrc = pathSrc,
                        pathTgt = pathTgt
                    )
                }
                is ContainerNode -> {
                    val nextSrc = pathSrc + listOfNotNull(node.titleSrc?.takeIf { it.isNotBlank() })
                    val nextTgt = pathTgt + listOfNotNull(node.titleTgt?.takeIf { it.isNotBlank() })
                    for (child in node.children) {
                        walk(child, nextSrc, nextTgt)
                    }
                }
            }
        }

        for (n in nodes) walk(n, emptyList(), emptyList())
        return out
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private fun parsePairs(array: JSONArray?): List<AlignedPair> {
        if (array == null) return emptyList()
        return List(array.length()) { index ->
            val p = array.getJSONObject(index)
            AlignedPair(
                src = p.getString("src"),
                tgt = p.getString("tgt")
            )
        }
    }

    private fun JSONObject.optStringOrNull(key: String): String? {
        if (!has(key) || isNull(key)) return null
        return optString(key).ifBlank { null }
    }
}
