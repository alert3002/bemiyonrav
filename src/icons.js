import Svg, { Circle, Path, Rect } from 'react-native-svg'

export function Icon({ name, size = 22, color = '#1f3b5c', filled = false }) {
  const p = {
    fill: filled ? color : 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  const box = { width: size, height: size, viewBox: '0 0 24 24' }
  if (name === 'scale') {
    return (
      <Svg {...box}>
        <Path {...p} d="M12 3v18" />
        <Path {...p} d="M7 21h10" />
        <Path {...p} d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        <Path {...p} d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <Path {...p} d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      </Svg>
    )
  }
  if (name === 'heart') {
    return (
      <Svg {...box}>
        <Path {...p} d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </Svg>
    )
  }
  if (name === 'reels') {
    return (
      <Svg {...box}>
        <Rect {...p} x="4" y="4" width="16" height="16" rx="4" />
        <Path d="M10 9.2v5.6l5-2.8-5-2.8Z" fill={color} stroke="none" />
      </Svg>
    )
  }
  if (name === 'camera') {
    return (
      <Svg {...box}>
        <Path {...p} d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <Circle {...p} cx="12" cy="13" r="3" />
      </Svg>
    )
  }
  if (name === 'message') {
    return (
      <Svg {...box}>
        <Path {...p} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </Svg>
    )
  }
  if (name === 'user') {
    return (
      <Svg {...box}>
        <Path {...p} d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <Circle {...p} cx="12" cy="7" r="4" />
      </Svg>
    )
  }
  if (name === 'plus') {
    return (
      <Svg {...box}>
        <Path {...p} d="M5 12h14" />
        <Path {...p} d="M12 5v14" />
      </Svg>
    )
  }
  if (name === 'check') {
    return (
      <Svg {...box}>
        <Path {...p} d="M20 6 9 17l-5-5" />
      </Svg>
    )
  }
  if (name === 'x') {
    return (
      <Svg {...box}>
        <Path {...p} d="M18 6 6 18" />
        <Path {...p} d="m6 6 12 12" />
      </Svg>
    )
  }
  if (name === 'bell') {
    return (
      <Svg {...box}>
        <Path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <Path {...p} d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
      </Svg>
    )
  }
  if (name === 'chevron') {
    return (
      <Svg {...box}>
        <Path {...p} d="m9 18 6-6-6-6" />
      </Svg>
    )
  }
  if (name === 'pin') {
    return (
      <Svg {...box}>
        <Path {...p} d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <Circle {...p} cx="12" cy="10" r="3" />
      </Svg>
    )
  }
  if (name === 'whatsapp') {
    return (
      <Svg {...box}>
        <Path {...p} d="M20 11.5A8.5 8.5 0 0 1 7.4 18.6L4 20l1.5-3.3A8.5 8.5 0 1 1 20 11.5Z" />
        <Path {...p} d="M9 10.2c.2 1.6 1.6 3.2 3.2 3.6.5.1.9 0 1.2-.3l.6-.7c.2-.2.1-.4 0-.6l-.7-.8c-.2-.2-.4-.2-.6 0l-.3.3c-.7-.3-1.3-.9-1.6-1.6l.3-.3c.2-.2.2-.4 0-.6l-.8-.7c-.2-.1-.4-.2-.6 0l-.7.6c-.3.3-.4.7-.3 1.1Z" />
      </Svg>
    )
  }
  if (name === 'telegram') {
    return (
      <Svg {...box}>
        <Path {...p} d="M21 4 3.5 11.1l6.1 2.2L16.8 8l-5.6 6.2.2 4.3 3.1-2.8 4 3.1L21 4Z" />
      </Svg>
    )
  }
  if (name === 'home') {
    return (
      <Svg {...box}>
        <Path {...p} d="M4 10.5 12 4l8 6.5" />
        <Path {...p} d="M6.5 9.8V20h11V9.8" />
      </Svg>
    )
  }
  if (name === 'suggest') {
    return (
      <Svg {...box}>
        <Path {...p} d="M9 18h6" />
        <Path {...p} d="M10 21h4" />
        <Path {...p} d="M12 3a6 6 0 0 0-4 10.5V15h8v-1.5A6 6 0 0 0 12 3Z" />
      </Svg>
    )
  }
  if (name === 'assist') {
    return (
      <Svg {...box}>
        <Path {...p} d="M12 8V4H8" />
        <Rect {...p} x="4" y="8" width="16" height="12" rx="2" />
        <Path {...p} d="M2 14h2" />
        <Path {...p} d="M20 14h2" />
        <Path {...p} d="M9 13v2" />
        <Path {...p} d="M15 13v2" />
      </Svg>
    )
  }
  if (name === 'filter') {
    return (
      <Svg {...box}>
        <Path {...p} d="M4 6h16" />
        <Path {...p} d="M7 12h10" />
        <Path {...p} d="M10 18h4" />
      </Svg>
    )
  }
  if (name === 'locate') {
    return (
      <Svg {...box}>
        <Circle {...p} cx="12" cy="12" r="3" />
        <Circle {...p} cx="12" cy="12" r="7" />
        <Path {...p} d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </Svg>
    )
  }
  if (name === 'ac') {
    return (
      <Svg {...box}>
        <Rect {...p} x="3" y="5" width="18" height="10" rx="2" />
        <Path {...p} d="M7 9h10M7 12h10" />
        <Path {...p} d="M8 19h8" />
      </Svg>
    )
  }
  if (name === 'fridge') {
    return (
      <Svg {...box}>
        <Rect {...p} x="6" y="2" width="12" height="20" rx="2" />
        <Path {...p} d="M6 10h12" />
        <Path {...p} d="M9 6v1.5M9 13.5V16" />
      </Svg>
    )
  }
  if (name === 'sofa') {
    return (
      <Svg {...box}>
        <Path {...p} d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        <Path {...p} d="M3 11h18v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z" />
        <Path {...p} d="M6 18v2M18 18v2" />
      </Svg>
    )
  }
  if (name === 'washer') {
    return (
      <Svg {...box}>
        <Rect {...p} x="3" y="3" width="18" height="18" rx="2" />
        <Circle {...p} cx="12" cy="13" r="4" />
        <Path {...p} d="M8 6h.01M11 6h3" />
      </Svg>
    )
  }
  if (name === 'tv') {
    return (
      <Svg {...box}>
        <Rect {...p} x="3" y="5" width="18" height="12" rx="2" />
        <Path {...p} d="M8 21h8" />
        <Path {...p} d="M12 17v4" />
      </Svg>
    )
  }
  if (name === 'flag') {
    return (
      <Svg {...box}>
        <Path {...p} d="M5 21V4" />
        <Path {...p} d="M5 4h11l-1.6 3.2L16 10.4H5" />
      </Svg>
    )
  }
  if (name === 'eye') {
    return (
      <Svg {...box}>
        <Path {...p} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <Circle {...p} cx="12" cy="12" r="3" />
      </Svg>
    )
  }
  if (name === 'megaphone') {
    return (
      <Svg {...box}>
        <Path {...p} d="M4 10v4a2 2 0 0 0 2 2h1l4 4V4L7 8H6a2 2 0 0 0-2 2Z" />
        <Path {...p} d="M15 9.5a3.5 3.5 0 0 1 0 5" />
        <Path {...p} d="M11 16.5 9.5 20" />
      </Svg>
    )
  }
  if (name === 'card') {
    return (
      <Svg {...box}>
        <Rect {...p} x="3" y="6" width="18" height="12" rx="2" />
        <Path {...p} d="M3 10h18" />
      </Svg>
    )
  }
  if (name === 'gear') {
    return (
      <Svg {...box}>
        <Circle {...p} cx="12" cy="12" r="3" />
        <Path {...p} d="M19.4 13.2a7.6 7.6 0 0 0 .1-2.4l2-1.2-2-3.4-2.2.7a7.8 7.8 0 0 0-2-1.2L14.8 3h-3.6L10.7 5.7a7.8 7.8 0 0 0-2 1.2l-2.2-.7-2 3.4 2 1.2a7.6 7.6 0 0 0 0 2.4l-2 1.2 2 3.4 2.2-.7a7.8 7.8 0 0 0 2 1.2l.5 2.7h3.6l.5-2.7a7.8 7.8 0 0 0 2-1.2l2.2.7 2-3.4-2-1.2Z" />
      </Svg>
    )
  }
  if (name === 'share') {
    return (
      <Svg {...box}>
        <Circle {...p} cx="18" cy="5" r="3" />
        <Circle {...p} cx="6" cy="12" r="3" />
        <Circle {...p} cx="18" cy="19" r="3" />
        <Path {...p} d="m8.6 13.5 6.8 4" />
        <Path {...p} d="m15.4 6.5-6.8 4" />
      </Svg>
    )
  }
  if (name === 'copy') {
    return (
      <Svg {...box}>
        <Rect {...p} x="9" y="9" width="13" height="13" rx="2" />
        <Path {...p} d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </Svg>
    )
  }
  if (name === 'calendar') {
    return (
      <Svg {...box}>
        <Rect {...p} x="3" y="5" width="18" height="16" rx="2" />
        <Path {...p} d="M3 10h18" />
        <Path {...p} d="M8 3v4" />
        <Path {...p} d="M16 3v4" />
      </Svg>
    )
  }
  if (name === 'info') {
    return (
      <Svg {...box}>
        <Circle {...p} cx="12" cy="12" r="9" />
        <Path {...p} d="M12 10v6" />
        <Path {...p} d="M12 7h.01" />
      </Svg>
    )
  }
  return null
}
