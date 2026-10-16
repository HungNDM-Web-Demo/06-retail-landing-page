import type { Viewport } from 'next'

/**
 * Khu công khai (07 §4.1): không AuthGuard, không AppShell, không DemoToolbar. Landing tối ưu điện thoại dọc.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F766E',
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
