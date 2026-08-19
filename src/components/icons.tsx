import React from 'react'

export interface IconProps { size?: number; color?: string }

function base(size: number, color: string, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IconOpenFolder = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, (
  <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>
))

export const IconMoon = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />)

export const IconSun = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, (
  <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>
))

export const IconSwap = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, (
  <><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>
))

export const IconExpand = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />)

export const IconCollapse = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />)

export const IconMinus = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M5 12h14" />)

export const IconPlus = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M12 5v14M5 12h14" />)

export const IconClose = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M18 6 6 18M6 6l12 12" />)

export const IconLibrary = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, (
  <><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>
))

export const IconMenu = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="M3 12h18M3 6h18M3 18h18" />)

export const IconPrev = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />)

export const IconNext = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />)

export const IconDropup = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="m18 15-6-6-6 6" />)

export const IconDropdown = ({ size = 18, color = 'currentColor' }: IconProps) => base(size, color, <path d="m6 9 6 6 6-6" />)

export const IconSpeaker = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4z" fill={color} stroke="none" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
)

export const IconStop = ({ size = 18, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><rect width="14" height="14" x="5" y="5" rx="2" fill={color} /></svg>
)