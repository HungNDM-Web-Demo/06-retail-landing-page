/**
 * Giờ máy chủ cho chế độ mock (07 §4.8, TC-04): handler `public.landing`, `public.promotion` lấy `asOf` từ đây
 * nên đổi giờ máy người xem không làm đồng hồ đếm ngược sai. Không cache.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ now: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
}
