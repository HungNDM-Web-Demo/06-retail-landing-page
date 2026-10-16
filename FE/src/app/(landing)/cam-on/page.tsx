import type { Metadata } from 'next'
import { ThankYouPage } from '@/features/landing/pages/ThankYouPage'
import { getLandingPage } from '@/features/landing/services/landing.server'

export const revalidate = 60

export const metadata: Metadata = {
  title: { absolute: 'Đặt hàng thành công' },
  robots: { index: false, follow: false },
}

/** Trang cảm ơn (SCR-03): thông tin đơn đọc ở sessionStorage của tab */
export default async function ThankYouRoute() {
  const page = await getLandingPage()
  return <ThankYouPage hotline={page.store.hotline} storeName={page.store.name} />
}
