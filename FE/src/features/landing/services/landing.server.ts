import { apiRoutes } from '@/config/api-routes'
import { serverFetch } from '@/lib/server-fetch'
import { floorMinute } from '@/features/sales/lib/vn-time'
import { systemSeed } from '@/mock/system-seed'
import type { LandingPageDto } from '@/types/landing'
import { buildLandingPage } from '../lib/landing-mapper'
import { buildCatalogSeed } from '../mock/landing.seed'

/**
 * Dữ liệu landing phía máy chủ (NFR-04, 07 §4.1): chế độ api gọi `GET /api/public/landing` (cache 60 giây);
 * chế độ mock dựng từ seed gốc (máy chủ không đọc được localStorage; trình duyệt gọi lại sau khi tải, 07 §5 #29).
 */
export function seedLandingPage(now: number = Date.now()): LandingPageDto {
  const catalog = buildCatalogSeed(floorMinute(now))
  const settings = Object.fromEntries(systemSeed.settings.map((s) => [s.key, s.value]))
  return buildLandingPage({ ...catalog, settings }, now)
}

export function getLandingPage(): Promise<LandingPageDto> {
  return serverFetch<LandingPageDto>(apiRoutes.public.landing, {
    mock: () => seedLandingPage(),
    revalidate: 60,
  })
}
