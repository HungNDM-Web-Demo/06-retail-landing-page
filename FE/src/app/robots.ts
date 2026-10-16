import type { MetadataRoute } from 'next'
import { siteUrl } from '@/features/landing/lib/site-url'

/** Cho máy tìm kiếm đọc landing; chặn trang cảm ơn, khu quản trị, đăng nhập (NFR-04) */
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/cam-on', '/admin/', '/login', '/settings/', '/profile', '/dashboard', '/forbidden', '/server-time'],
      },
    ],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  }
}
