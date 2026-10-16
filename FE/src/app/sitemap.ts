import type { MetadataRoute } from 'next'
import { siteUrl } from '@/features/landing/lib/site-url'

/** Sitemap chỉ có landing `/` (07 §4.1) */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 }]
}
