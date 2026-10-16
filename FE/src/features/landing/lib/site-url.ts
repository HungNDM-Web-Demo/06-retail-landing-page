/** Địa chỉ công khai của landing (metadataBase, canonical, sitemap): `NEXT_PUBLIC_PUBLIC_URL`, mặc định cổng dev 3106 */
export function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_PUBLIC_URL?.trim().replace(/\/+$/, '')
  return value || 'http://localhost:3106'
}
