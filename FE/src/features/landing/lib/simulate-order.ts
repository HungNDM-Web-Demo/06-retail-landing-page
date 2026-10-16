import { provinces, sourceLabel } from '@/config/landing-labels'
import { newId } from '@/mock/mock-helpers'
import type { DeviceType, PlaceOrderResult } from '@/types/landing'
import { publicApi } from '../services/public-api'

/**
 * "Giả lập đơn từ quảng cáo" (07 §4.2 bước 2): nguồn ngẫu nhiên theo tỉ trọng (facebook 55%, tiktok 25%,
 * google 10%, zalo 5%, trực tiếp 5%) và chiến dịch tương ứng (06 §5.1), khách ngẫu nhiên hợp lệ BR-04,
 * combo 45/40/15, số lượng 1. Gửi qua CHÍNH API công khai (`visits` rồi `orders`) với visitorId mới mỗi lần,
 * nên đơn đi đúng mọi quy tắc (chia đơn, nhãn, pixel) ở cả chế độ mock và api.
 */

type Channel = { source?: string; medium?: string; campaigns: string[]; weight: number }

const CHANNELS: Channel[] = [
  { source: 'facebook', medium: 'cpc', campaigns: ['serum_t10', 'serum_review', 'retarget_7d'], weight: 55 },
  { source: 'tiktok', medium: 'cpc', campaigns: ['tt_video_ugc', 'tt_spark'], weight: 25 },
  { source: 'google', medium: 'cpc', campaigns: ['gg_search_serum', 'gg_pmax'], weight: 10 },
  { source: 'zalo', medium: 'oa', campaigns: ['zalo_oa_t10'], weight: 5 },
  { campaigns: [], weight: 5 },
]
const COMBO_WEIGHTS = [45, 40, 15]

const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
const MIDDLES = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Minh', 'Hồng', 'Mỹ', 'Bảo', 'Kim', 'Phương', 'Thùy', 'Diệu']
const GIVEN = ['Hoa', 'Lan', 'Mai', 'Hương', 'Trang', 'Linh', 'Thảo', 'Ngân', 'Vy', 'Yến', 'Hà', 'Quỳnh', 'Nhung', 'Tâm', 'Châu', 'Oanh', 'Uyên', 'Hạnh']
const STREETS = ['Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Lý Thường Kiệt', 'Hùng Vương', 'Phan Chu Trinh', 'Nguyễn Trãi', 'Quang Trung', 'Lê Duẩn']
const WARDS = ['khu phố 1', 'khu phố 3', 'tổ 5', 'tổ 12', 'thôn Đông', 'ấp 2']
const PREFIXES = ['032', '033', '035', '036', '037', '038', '039', '056', '058', '070', '076', '077', '078', '079', '081', '083', '085', '086', '088', '091', '093', '094', '096', '097', '098']

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]
function weighted<T extends { weight: number }>(items: T[]): T {
  let r = Math.random() * items.reduce((s, i) => s + i.weight, 0)
  for (const item of items) {
    r -= item.weight
    if (r < 0) return item
  }
  return items[items.length - 1]
}
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('')

export async function simulateAdOrder(): Promise<{ result: PlaceOrderResult; sourceText: string }> {
  const channel = weighted(CHANNELS)
  const campaign = channel.campaigns.length ? pick(channel.campaigns) : undefined
  const visitorId = `demo-sim-${newId()}`
  const device: DeviceType = Math.random() < 0.85 ? 'DienThoai' : Math.random() < 0.5 ? 'MayTinh' : 'MayTinhBang'

  const visit = await publicApi.recordVisit({
    visitorId,
    utmSource: channel.source,
    utmMedium: channel.source ? channel.medium : undefined,
    utmCampaign: campaign,
    device,
    path: '/',
  })

  const landing = await publicApi.landing()
  if (landing.combos.length === 0) throw new Error('Không có combo đang hiện để đặt')
  const combo = weighted(landing.combos.map((c, i) => ({ ...c, weight: COMBO_WEIGHTS[i] ?? 5 })))
  const result = await publicApi.placeOrder({
    clientRequestId: newId(),
    visitorId,
    visitId: visit.visitId,
    customerName: `${pick(SURNAMES)} ${pick(MIDDLES)} ${pick(GIVEN)}`,
    phone: `${pick(PREFIXES)}${digits(7)}`,
    province: pick([...provinces]),
    address: `Số ${1 + Math.floor(Math.random() * 250)} đường ${pick(STREETS)}, ${pick(WARDS)}`,
    comboId: combo.id,
    quantity: 1,
    expectedPrice: combo.price,
    attribution: visit.attribution,
    device,
  })
  const sourceText = `${sourceLabel(visit.attribution.source)}${visit.attribution.campaign ? ` · ${visit.attribution.campaign}` : ''}`
  return { result, sourceText }
}
