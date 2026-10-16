import type { Metadata } from 'next'
import { LandingView } from '@/features/landing/components/LandingView'
import { siteUrl } from '@/features/landing/lib/site-url'
import { getLandingPage } from '@/features/landing/services/landing.server'

/** Landing `/` render phía máy chủ (NFR-04, 07 §4.1); trình duyệt gọi lại API để thấy sửa đổi mới nhất. */
export const revalidate = 60

const OG_IMAGE = { url: '/seed/og-landing.jpg', width: 1200, height: 630 }

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLandingPage()
  const title = `${page.product.name} | ${page.store.name}`
  const description = page.product.shortDescription
  return {
    metadataBase: new URL(siteUrl()),
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: page.store.name,
      locale: 'vi_VN',
      url: '/',
      images: [{ ...OG_IMAGE, alt: page.product.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
  }
}

export default async function LandingPage() {
  const page = await getLandingPage()
  return <LandingView initialData={page} />
}
