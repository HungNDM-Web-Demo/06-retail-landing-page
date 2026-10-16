#!/usr/bin/env node
/**
 * Sinh dữ liệu mẫu đơn hàng, lượt truy cập, chi phí quảng cáo cho demo Landing Page Bán hàng.
 * Chạy: `pnpm seed:orders` (trong FE/). Hạt giống cố định → chạy lại ra đúng file cũ.
 *
 * - Đọc `src/mock/seed/demo-data.json`, GIỮ NGUYÊN phần viết tay (product, promotion, combos, blocks,
 *   reviews, telesales), ghi đè 3 mảng: `orders`, `visitStats`, `adCosts`.
 * - Khóa gọn, quy tắc suy ra trường: docs/06-THIET-KE-CSDL.md §5.4 (seeder BE và FE mock làm giống hệt).
 * - Lịch sử: ô ngày d = −59…−1, giờ "HH:mm" giờ Việt Nam; mọi việc xảy ra từ 00:00 hôm nay trở đi bị cắt
 *   (đơn dừng ở trạng thái trước đó). Hôm nay: đơn viết tay ở FIXTURES, giờ là số phút so với lúc nạp (âm).
 * - Tự kiểm ràng buộc test (docs/05 §1, docs/06 §5.5) trước khi ghi; sai thì dừng, không ghi file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SEED = 20261015
const DAYS = 59 // d = −59 … −1
const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(here, '../src/mock/seed/demo-data.json')

// ───────────────────────── Ngẫu nhiên xác định ─────────────────────────

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(SEED)
const randInt = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
/** pairs: [[value, weight], …] */
function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rnd() * total
  for (const [v, w] of pairs) {
    r -= w
    if (r < 0) return v
  }
  return pairs[pairs.length - 1][0]
}

// ───────────────────────── Thông số mô phỏng ─────────────────────────

/** Trọng số theo giờ Việt Nam 0–23: cao điểm 11–13h và 20–22h (NFR-07) */
const HOUR_W = [2, 1, 1, 0.5, 0.5, 1, 2, 4, 6, 7, 8, 10, 11, 10, 7, 6, 6, 7, 8, 10, 12, 12, 9, 5]

/** Nguồn: tỉ trọng lượt truy cập, tỉ lệ chuyển đổi, điều chỉnh xác nhận, tỉ lệ hoàn, thiết bị */
const SOURCES = {
  facebook: { visitShare: 0.54, conv: 0.017, confirmAdj: 0, returnRate: 0.12 },
  tiktok: { visitShare: 0.3, conv: 0.0138, confirmAdj: -0.07, returnRate: 0.19 },
  google: { visitShare: 0.06, conv: 0.027, confirmAdj: 0.06, returnRate: 0.06 },
  zalo: { visitShare: 0.03, conv: 0.029, confirmAdj: 0.05, returnRate: 0.05 },
  direct: { visitShare: 0.07, conv: 0.014, confirmAdj: 0, returnRate: 0.09 },
}
/** Chiến dịch: [nguồn, kênh, chiến dịch, nội dung[], trọng số trong nguồn, hệ số chuyển đổi, CPC (₫/lượt) | 0, referrer khi không UTM] */
const CAMPAIGNS = [
  ['facebook', 'cpc', 'serum_t10', ['video_a', 'video_b'], 0.5, 1.0, 2600],
  ['facebook', 'cpc', 'serum_review', ['carousel_1'], 0.2, 0.95, 2400],
  ['facebook', 'cpc', 'retarget_7d', ['anh_2'], 0.15, 1.35, 1900],
  ['facebook', null, '', [], 0.15, 0.8, 0, ['m.facebook.com', 'l.facebook.com']],
  ['tiktok', 'cpc', 'tt_video_ugc', ['ugc_1', 'ugc_2'], 0.65, 1.0, 1500],
  ['tiktok', 'cpc', 'tt_spark', ['spark_1'], 0.35, 1.0, 1700],
  ['google', 'cpc', 'gg_search_serum', ['kw_serum_rau_ma'], 0.7, 1.1, 4200],
  ['google', 'cpc', 'gg_pmax', [], 0.3, 0.8, 3000],
  ['zalo', 'oa', 'zalo_oa_t10', ['tin_1'], 1, 1, 3200],
  ['direct', null, '', [], 1, 1, 0],
]
const TELESALES = [
  // [username, tỉ trọng chia đơn, tỉ lệ xác nhận nền, tỉ lệ upsell khi xác nhận, cộng tỉ lệ hoàn]
  ['nhanvien', 0.45, 0.77, 0.25, 0],
  ['nhanvien2', 0.3, 0.81, 0.35, -0.01],
  ['nhanvien3', 0.25, 0.69, 0.15, 0.03],
]
const TS = Object.fromEntries(TELESALES.map((t) => [t[0], { confirm: t[2], upsell: t[3], returnAdj: t[4] }]))

const COMBO_PRICE = { C01: 390000, C02: 740000, C03: 990000 } // giá khuyến mãi (mọi đơn mẫu dùng giá khuyến mãi)

// ───────────────────────── Tên, số điện thoại, địa chỉ ─────────────────────────

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Trương', 'Mai', 'Tạ']
const HO_W = [30, 11, 9, 7, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1]
const DEM_NU = ['Thị', 'Thu', 'Ngọc', 'Thanh', 'Minh', 'Phương', 'Thùy', 'Hồng', 'Kim', 'Bảo', 'Mỹ', 'Diệu', 'Khánh', 'Quỳnh', 'Hải']
const TEN_NU = ['Hương', 'Lan', 'Linh', 'Trang', 'Hà', 'Thảo', 'Ngân', 'Nhung', 'Yến', 'Hạnh', 'Vy', 'Anh', 'Phương', 'Tâm', 'Mai', 'Hằng', 'Ly', 'Nga', 'Duyên', 'Quyên', 'Châu', 'Giang', 'Oanh', 'Thư', 'Uyên', 'Trâm', 'Hiền', 'Loan', 'My', 'Nhi']
const DEM_NAM = ['Văn', 'Minh', 'Quốc', 'Đức', 'Thành', 'Hoàng', 'Gia', 'Hữu', 'Anh', 'Tuấn']
const TEN_NAM = ['Hùng', 'Dũng', 'Khoa', 'Long', 'Phúc', 'Tài', 'Thắng', 'Vinh', 'Quân', 'Hiếu', 'Bảo', 'Đạt']
const PROVINCES = [
  ['TP. Hồ Chí Minh', 22], ['Hà Nội', 18], ['Hải Phòng', 4], ['Đà Nẵng', 4], ['Cần Thơ', 3], ['Huế', 2], ['Đồng Nai', 4],
  ['Bắc Ninh', 3], ['Nghệ An', 3], ['Thanh Hóa', 3], ['Khánh Hòa', 2], ['Lâm Đồng', 2], ['An Giang', 2], ['Đồng Tháp', 2],
  ['Tây Ninh', 2], ['Vĩnh Long', 2], ['Gia Lai', 2], ['Đắk Lắk', 2], ['Quảng Ninh', 2], ['Hưng Yên', 2], ['Ninh Bình', 2],
  ['Phú Thọ', 2], ['Thái Nguyên', 1], ['Quảng Ngãi', 1], ['Quảng Trị', 1], ['Hà Tĩnh', 1], ['Cà Mau', 1], ['Lào Cai', 1],
  ['Tuyên Quang', 1], ['Lạng Sơn', 1], ['Sơn La', 1], ['Cao Bằng', 0.5], ['Điện Biên', 0.5], ['Lai Châu', 0.5],
]
const STREETS = ['Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Lý Thường Kiệt', 'Quang Trung', 'Nguyễn Trãi', 'Lê Duẩn', 'Phan Chu Trinh', 'Nguyễn Văn Linh', 'Hùng Vương', 'Trần Phú', 'Điện Biên Phủ', 'Võ Thị Sáu', 'Nguyễn Thị Minh Khai', 'Lạc Long Quân', 'Bạch Đằng', 'Ngô Quyền', 'Phạm Văn Đồng', 'Lê Thánh Tông', 'Hoàng Diệu', 'Cách Mạng Tháng 8', 'Tôn Đức Thắng', 'Nguyễn Du']
const AREAS = ['khu phố 1', 'khu phố 2', 'khu phố 3', 'khu phố 4', 'tổ 5', 'tổ 12', 'tổ 21', 'thôn Đông', 'thôn Trung', 'ấp 2', 'ấp 3', 'khu dân cư Nam Long', 'chung cư Hoa Sen, tầng 9']
const NOTES = ['Giao giờ hành chính', 'Gọi trước khi giao', 'Giao sau 17 giờ', 'Giao cuối tuần giúp em', 'Để ở phòng bảo vệ nếu không có nhà']
const PHONE_PREFIX = ['032', '033', '034', '035', '036', '037', '038', '039', '056', '058', '070', '076', '077', '078', '079', '081', '082', '083', '084', '085', '086', '088', '089', '090', '091', '093', '094', '096', '097', '098']

/** Số cấm: số test (docs/05 §1), số demo, số của khách mẫu */
const RESERVED = new Set(['0987654321', '0912000111', '0901000088'])
for (let i = 1; i <= 19; i++) RESERVED.add(`09010000${String(i).padStart(2, '0')}`)
const usedPhones = new Set(RESERVED)
function newPhone() {
  for (;;) {
    const p = pick(PHONE_PREFIX) + String(randInt(0, 9999999)).padStart(7, '0')
    if (p.startsWith('090100') || usedPhones.has(p)) continue
    usedPhones.add(p)
    return p
  }
}
function newCustomer() {
  const female = rnd() < 0.86
  const ho = weighted(HO.map((h, i) => [h, HO_W[i]]))
  const name = female ? `${ho} ${pick(DEM_NU)} ${pick(TEN_NU)}` : `${ho} ${pick(DEM_NAM)} ${pick(TEN_NAM)}`
  const province = weighted(PROVINCES)
  const no = rnd() < 0.35 ? `Số ${randInt(2, 180)} ngõ ${randInt(3, 120)}` : `Số ${randInt(1, 450)}`
  return { n: name, p: newPhone(), pv: province, a: `${no} ${pick(STREETS)}, ${pick(AREAS)}` }
}

// ───────────────────────── Thời gian ─────────────────────────
// Thời điểm tuyệt đối A (phút) tính từ 00:00 hôm nay giờ VN; lịch sử A < 0.

const hhmm = (minuteOfDay) => `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`
const mod = (a, n) => ((a % n) + n) % n
/** Giờ làm việc telesale 8:00–21:00: đưa A vào giờ làm việc gần nhất (kèm trễ ngẫu nhiên đầu ca) */
function nextWorking(A) {
  const m = mod(A, 1440)
  if (m < 8 * 60) return A - m + 8 * 60 + randInt(2, 40)
  if (m >= 21 * 60) return A - m + 1440 + 8 * 60 + randInt(2, 40)
  return A
}
function atClock(dayStartA, fromH, toH) {
  return dayStartA + randInt(fromH * 60, toH * 60 - 1)
}
const dayStart = (A) => A - mod(A, 1440)

// ───────────────────────── Mô phỏng một đơn ─────────────────────────

/**
 * Sinh vòng đời đơn bằng phút tuyệt đối, rồi cắt mọi việc từ `cutoff` (0 = 00:00 hôm nay) trở đi.
 * Trả về các khóa gọn §5.4 (phút tính từ lúc đặt).
 */
function simulate(o, placedA, src, cutoff) {
  const as = o.as
  const ts = TS[as]
  const steps = [] // { A, kind, data }
  let A = nextWorking(placedA + randInt(3, 25))
  const pc = Math.min(0.95, ts.confirm + SOURCES[src].confirmAdj)
  const r = rnd()
  const outcome = r < pc ? 'confirm' : weighted([['unreachable', 0.4], ['customer', 0.45], ['wrong', 0.15]])
  const fail = () => {
    steps.push({ A, kind: 'call', code: rnd() < 0.75 ? 'KNM' : 'TB' })
    A = nextWorking(A + 120 + randInt(0, 40))
  }
  if (outcome === 'confirm') {
    const k = weighted([[0, 0.6], [1, 0.28], [2, 0.12]])
    for (let i = 0; i < k; i++) fail()
    if (rnd() < 0.07) {
      const cb = A + randInt(60, 300)
      steps.push({ A, kind: 'call', code: 'HGL', extra: cb })
      A = nextWorking(cb + randInt(0, 15))
    }
    // Upsell (BR-12) hoặc đổi xuống
    let ch = null
    if (rnd() < ts.upsell) {
      if (o.cb === 'C01' && o.q === 1) ch = rnd() < 0.7 ? ['C02', 1] : ['C01', 2]
      else if (o.cb === 'C01' && o.q === 2) ch = ['C03', 1]
      else if (o.cb === 'C02' && o.q === 1) ch = ['C03', 1]
      else if (o.cb === 'C03' && o.q === 1 && rnd() < 0.3) ch = ['C03', 2]
    } else if (o.cb === 'C02' && o.q === 1 && rnd() < 0.03) ch = ['C01', 1]
    steps.push({ A, kind: 'call', code: 'XN', ch })
    const confirmA = A
    if (rnd() < 0.015) {
      steps.push({ A: confirmA + randInt(30, 300), kind: 'cancel', reason: 'KhachDoiY' })
    } else {
      // Kho đóng gói, bàn giao theo lô 10:00–11:00 sáng hôm sau ngày xác nhận
      const handA = atClock(dayStart(confirmA) + 1440, 10, 11)
      const carrier = weighted([['GHTK', 0.4], ['GHN', 0.3], ['VTP', 0.15], ['JT', 0.15]])
      steps.push({ A: handA, kind: 'ship', carrier })
      const pr = SOURCES[src].returnRate + ts.returnAdj
      if (rnd() < pr) {
        const reason = weighted([['KhachTuChoiNhan', 0.45], ['KhachKhongNgheMay', 0.35], ['SaiDiaChi', 0.12], ['Khac', 0.08]])
        steps.push({ A: atClock(dayStart(handA) + 1440 * randInt(3, 6), 10, 17), kind: 'return', reason })
      } else {
        steps.push({ A: atClock(dayStart(handA) + 1440 * randInt(1, 3), 9, 18), kind: 'deliver' })
      }
    }
  } else if (outcome === 'unreachable') {
    for (let i = 0; i < 3; i++) fail()
  } else if (outcome === 'customer') {
    if (rnd() < 0.3) fail()
    const reason = weighted([['KhachDoiY', 0.3], ['CheGiaCao', 0.35], ['DatNham', 0.1], ['DaMuaNoiKhac', 0.15], ['Khac', 0.1]])
    steps.push({ A, kind: 'call', code: 'KH', extra: reason })
  } else {
    if (rnd() < 0.3) fail()
    steps.push({ A, kind: 'call', code: 'SS' })
  }

  // Cắt theo cutoff, rồi ghi khóa gọn
  const rel = (x) => x - placedA
  const cl = []
  for (const s of steps) {
    if (s.A >= cutoff) break
    if (s.kind === 'call') {
      const row = [rel(s.A), s.code]
      if (s.code === 'HGL') row.push(rel(s.extra))
      if (s.code === 'KH') {
        row.push(s.extra)
        if (s.extra === 'Khac') row.push('Khách nói chưa có nhu cầu')
      }
      cl.push(row)
      if (s.code === 'XN' && s.ch) o.ch = s.ch
    } else if (s.kind === 'cancel') o.x = [s.reason, rel(s.A)]
    else if (s.kind === 'ship') o.sh = [s.carrier, rel(s.A)]
    else if (s.kind === 'deliver') o.dl = rel(s.A)
    else if (s.kind === 'return') {
      o.rt = [s.reason, rel(s.A)]
      if (s.reason === 'Khac') o.rt.push('Khách đi vắng dài ngày')
    }
  }
  if (cl.length) o.cl = cl
  // A tuyệt đối của mọi bước đã giữ (để kiểm và thống kê)
  return steps.filter((s) => s.A < cutoff)
}

// ───────────────────────── Sinh lịch sử ─────────────────────────

const orders = [] // { o (khóa gọn), placedA, src, cmp, meta }
const visitStats = []
const adCosts = []
const customers = []

function hourlySplit(total) {
  const h = new Array(24).fill(0)
  const sum = HOUR_W.reduce((s, w) => s + w, 0)
  for (let i = 0; i < total; i++) {
    let r = rnd() * sum
    for (let k = 0; k < 24; k++) {
      r -= HOUR_W[k]
      if (r < 0) {
        h[k]++
        break
      }
    }
  }
  return h
}
function sampleHour() {
  return weighted(HOUR_W.map((w, k) => [k, w]))
}

for (let d = -DAYS; d <= -1; d++) {
  const progress = (d + DAYS) / DAYS
  const factor = 1 + 0.12 * Math.sin(d / 3.7) + 0.1 * progress + (rnd() - 0.5) * 0.18
  const totalVisits = Math.max(400, Math.min(700, Math.round(540 * factor)))
  for (const [src, cfg] of Object.entries(SOURCES)) {
    const srcVisits = Math.round(totalVisits * cfg.visitShare * (1 + (rnd() - 0.5) * 0.16))
    const camps = CAMPAIGNS.filter((c) => c[0] === src)
    const wSum = camps.reduce((s, c) => s + c[4], 0)
    let left = srcVisits
    camps.forEach((c, i) => {
      const v = i === camps.length - 1 ? left : Math.round((srcVisits * c[4]) / wSum)
      left -= v
      const [, medium, campaign, contents, , mult, cpc, referrers] = c
      visitStats.push({ d, s: src, c: campaign, h: hourlySplit(v) })
      if (cpc > 0) adCosts.push([d, src, campaign, Math.round((v * cpc * (0.9 + rnd() * 0.2)) / 1000) * 1000])
      const expected = v * cfg.conv * mult
      const count = Math.floor(expected) + (rnd() < expected - Math.floor(expected) ? 1 : 0)
      for (let k = 0; k < count; k++) {
        const minute = sampleHour() * 60 + randInt(0, 59)
        const placedA = d * 1440 + minute
        const repeat = customers.length > 20 && rnd() < 0.05 ? pick(customers) : null
        const cust = repeat && repeat.lastA < placedA - 3 * 1440 ? repeat : newCustomer()
        if (cust !== repeat) customers.push(cust)
        cust.lastA = placedA
        const cb = weighted([['C01', 0.45], ['C02', 0.4], ['C03', 0.15]])
        const q = cb === 'C01' && rnd() < 0.08 ? 2 : 1
        const o = { d, t: hhmm(minute), n: cust.n, p: cust.p, pv: cust.pv, a: cust.a }
        if (rnd() < 0.12) o.nt = pick(NOTES)
        o.cb = cb
        o.q = q
        if (medium !== null || campaign) {
          const u = [src, medium, campaign || null, contents.length ? pick(contents) : null]
          while (u.length && u[u.length - 1] === null) u.pop()
          o.u = u
        } else if (referrers) o.rf = pick(referrers)
        const dv = src === 'google' ? weighted([['D', 0.7], ['M', 0.25], ['B', 0.05]]) : weighted([['D', 0.9], ['M', 0.06], ['B', 0.04]])
        if (dv !== 'D') o.dv = dv
        o.as = weighted(TELESALES.map((t) => [t[0], t[1]]))
        orders.push({ o, placedA, src, cmp: campaign })
      }
    })
  }
}

// Khách mẫu "Lê Thị Hoa" (docs/05 §1): 2 đơn Hoàn hàng trong lịch sử, 1 đơn Chờ gọi lại 30 giờ trước (FIXTURES)
const HOA = { n: 'Lê Thị Hoa', p: '0987654321', pv: 'Hà Nội', a: 'Số 18 ngõ 72 Tôn Thất Tùng, khu phố 3' }
orders.push({
  o: { d: -26, t: '12:15', ...HOA, cb: 'C01', q: 1, u: ['facebook', 'cpc', 'serum_t10', 'video_a'], as: 'nhanvien',
    cl: [[11, 'XN']], sh: ['GHTK', 330], rt: ['KhachTuChoiNhan', 4 * 1440 + 210] },
  placedA: -26 * 1440 + 735, src: 'facebook', cmp: 'serum_t10', fixed: true,
})
orders.push({
  o: { d: -13, t: '20:40', ...HOA, cb: 'C02', q: 1, u: ['tiktok', 'cpc', 'tt_video_ugc', 'ugc_1'], as: 'nhanvien2',
    cl: [[740, 'XN']], sh: ['GHN', 840], rt: ['KhachKhongNgheMay', 5 * 1440 + 100] },
  placedA: -13 * 1440 + 1240, src: 'tiktok', cmp: 'tt_video_ugc', fixed: true,
})

// Sắp theo thời điểm đặt rồi mô phỏng (đơn trùng chen ngay sau đơn gốc)
orders.sort((a, b) => a.placedA - b.placedA)
const all = []
for (const item of orders) {
  all.push(item)
  if (item.fixed) continue
  const steps = simulate(item.o, item.placedA, item.src, 0)
  item.steps = steps
  // Đơn trùng: khách bấm gửi lần nữa sau 1–6 phút (BR-14); telesale hủy "Đơn trùng" ở lần gọi đầu
  if (rnd() < 0.035) {
    const gap = randInt(1, 6)
    const twin = { ...item.o, t: hhmm(mod(item.placedA + gap, 1440)), d: item.o.d }
    if (mod(item.placedA, 1440) + gap >= 1440) twin.d = item.o.d + 1
    for (const k of ['cl', 'ch', 'x', 'sh', 'dl', 'rt', 'nt']) delete twin[k]
    if (rnd() < 0.3) twin.cb = twin.cb === 'C01' ? 'C02' : 'C01'
    const firstCall = steps[0]
    const twinA = item.placedA + gap
    if (twin.d >= 0) continue // không chen sang hôm nay
    const cancelA = firstCall ? Math.max(firstCall.A, twinA + 2) : null
    if (cancelA !== null && cancelA < 0) twin.x = ['DonTrung', cancelA - twinA]
    all.push({ o: twin, placedA: twinA, src: item.src, cmp: item.cmp, twinOf: item })
  }
}

// ───────────────────────── Đơn hôm nay (viết tay, phút so với lúc nạp) ─────────────────────────

const FIXTURES = [
  { t: -8, n: 'Hồ Ngọc Bích', p: '0352418806', pv: 'TP. Hồ Chí Minh', a: 'Số 41 đường Võ Thị Sáu, khu phố 2', cb: 'C02', q: 1, u: ['facebook', 'cpc', 'serum_t10', 'video_a'], as: 'nhanvien' },
  { t: -15, n: 'Trịnh Thùy Linh', p: '0778203145', pv: 'Đồng Nai', a: 'Số 9 đường Phạm Văn Đồng, tổ 12', cb: 'C01', q: 1, u: ['tiktok', 'cpc', 'tt_video_ugc', 'ugc_2'], as: 'nhanvien' },
  { t: -27, n: 'Nguyễn Diệu Hiền', p: '0915662073', pv: 'Hà Nội', a: 'Số 7 ngõ 15 Lạc Long Quân, tổ 21', cb: 'C02', q: 1, u: ['google', 'cpc', 'gg_search_serum', 'kw_serum_rau_ma'], dv: 'M', as: 'nhanvien' },
  { t: -52, n: 'Phạm Bảo Châu', p: '0388154920', pv: 'Hải Phòng', a: 'Số 120 đường Ngô Quyền, khu phố 4', cb: 'C03', q: 1, u: ['facebook', 'cpc', 'serum_review', 'carousel_1'], as: 'nhanvien', cl: [[12, 'KNM']] },
  { t: -95, n: 'Lương Thị Mỹ Duyên', p: '0868417355', pv: 'Cần Thơ', a: 'Số 25 đường Trần Phú, ấp 3', cb: 'C01', q: 1, u: ['zalo', 'oa', 'zalo_oa_t10', 'tin_1'] },
  { t: -140, n: 'Vương Kim Oanh', p: '0942357718', pv: 'Nghệ An', a: 'Số 66 đường Lê Lợi, khối 5', cb: 'C02', q: 1, u: ['tiktok', 'cpc', 'tt_spark', 'spark_1'], as: 'nhanvien', cl: [[5, 'TB']] },
  { t: -180, n: 'Đào Thị Thanh Hương', p: '0337720914', pv: 'Bắc Ninh', a: 'Số 3 ngõ 8 Nguyễn Du, khu phố 1', cb: 'C01', q: 1, u: ['facebook', 'cpc', 'retarget_7d', 'anh_2'], as: 'nhanvien', cl: [[9, 'XN']], ch: ['C02', 1] },
  { t: -200, n: 'Cao Minh Thư', p: '0703118462', pv: 'Đà Nẵng', a: 'Số 14 đường Bạch Đằng, tổ 5', cb: 'C01', q: 1, u: ['tiktok', 'cpc', 'tt_video_ugc', 'ugc_1'], as: 'nhanvien', cl: [[6, 'KH', 'CheGiaCao']] },
  { t: -250, n: 'Lâm Ngọc Trâm', p: '0583690217', pv: 'TP. Hồ Chí Minh', a: 'Số 88 đường Nguyễn Thị Minh Khai, khu phố 3', cb: 'C01', q: 1, rf: 'm.facebook.com', as: 'nhanvien', cl: [[30, 'XN']] },
  // Khách mẫu "Nguyễn Văn Nam" (docs/05 §1): đã 2 lần không nghe máy, đến giờ gọi lại
  { t: -300, n: 'Nguyễn Văn Nam', p: '0912000111', pv: 'Thanh Hóa', a: 'Số 52 đường Hùng Vương, khu phố 2', cb: 'C01', q: 1, u: ['facebook', 'cpc', 'serum_t10', 'video_b'], as: 'nhanvien', cl: [[10, 'KNM'], [150, 'KNM']] },
  { t: -330, n: 'Tô Hải Yến', p: '0896235510', pv: 'Hà Nội', a: 'Số 19 ngõ 61 Hoàng Diệu, tổ 12', cb: 'C01', q: 2, u: ['facebook', 'cpc', 'serum_t10', 'video_a'], as: 'nhanvien2', cl: [[20, 'XN']] },
  { t: -400, n: 'Quách Thị Ngọc Hà', p: '0976402281', pv: 'Khánh Hòa', a: 'Số 7 đường Trần Hưng Đạo, khu phố 4', cb: 'C02', q: 1, u: ['google', 'cpc', 'gg_pmax'], as: 'nhanvien2', cl: [[12, 'XN']], sh: ['GHTK', 280] },
  { t: -480, n: 'Ninh Thị Hồng Nhung', p: '0817503366', pv: 'TP. Hồ Chí Minh', a: 'Số 230 đường Cách Mạng Tháng 8, khu phố 1', cb: 'C02', q: 1, u: ['facebook', 'cpc', 'serum_t10', 'video_b'], as: 'nhanvien', cl: [[15, 'XN']], ch: ['C03', 1] },
  // Khách mẫu "Lê Thị Hoa": đơn Chờ gọi lại đặt 30 giờ trước, hẹn gọi lại 20 phút trước, nhãn Rủi ro hoàn
  { t: -1800, ...HOA, cb: 'C02', q: 1, u: ['facebook', 'cpc', 'retarget_7d', 'anh_2'], as: 'nhanvien', cl: [[10, 'KNM'], [200, 'HGL', 1780]], tg: ['R'] },
]
for (const f of FIXTURES) usedPhones.add(f.p)

// ───────────────────────── Nhãn (BR-14, BR-15) theo trạng thái lúc nạp ─────────────────────────

all.sort((a, b) => a.placedA - b.placedA)
const returnsByPhone = new Map() // phone → [A của sự kiện hoàn]
for (const it of all) {
  if (it.o.rt) {
    const list = returnsByPhone.get(it.o.p) ?? []
    list.push(it.placedA + it.o.rt[1])
    returnsByPhone.set(it.o.p, list)
  }
}
for (const it of all) {
  const tg = []
  if (it.twinOf) {
    tg.push('T')
    if (!it.o.x) {
      // Đơn trùng chưa được xử lý lúc nạp (khách đặt khuya hôm qua): cả hai đơn còn nhãn
      it.twinOf.o.tg = ['T', ...(it.twinOf.o.tg ?? [])]
    }
  }
  const prior = (returnsByPhone.get(it.o.p) ?? []).filter((A) => A < it.placedA).length
  if (prior >= 2) tg.push('R')
  if (tg.length) it.o.tg = [...new Set([...(it.o.tg ?? []), ...tg])]
}

// ───────────────────────── Lượt truy cập hôm nay (12 khung giờ gần nhất) ─────────────────────────

const avgByPair = new Map()
for (const v of visitStats) {
  const key = `${v.s}|${v.c}`
  avgByPair.set(key, (avgByPair.get(key) ?? 0) + v.h.reduce((s, x) => s + x, 0) / DAYS)
}
for (const [key, avg] of avgByPair) {
  const [s, c] = key.split('|')
  const r = Array.from({ length: 12 }, () => Math.max(0, Math.round((avg / 17) * (0.8 + rnd() * 0.4))))
  visitStats.push({ s, c, r })
}

// ───────────────────────── Thống kê + kiểm ràng buộc ─────────────────────────

const statusOf = (o) => {
  if (o.x) return 'DaHuy'
  const codes = (o.cl ?? []).map((c) => c[1])
  if (codes.includes('KH') || codes.includes('SS')) return 'DaHuy'
  if (codes.filter((c) => c === 'KNM' || c === 'TB').length >= 3) return 'DaHuy'
  if (o.rt) return 'HoanHang'
  if (o.dl !== undefined) return 'DaGiao'
  if (o.sh) return 'DangGiao'
  if (codes.includes('XN')) return 'DaXacNhan'
  if (codes.length) return 'ChoGoiLai'
  return 'Moi'
}
const subtotalOf = (cb, q) => COMBO_PRICE[cb] * q

const history = all.map((x) => x.o)
const everything = [...history, ...FIXTURES]
const errors = []
const check = (cond, msg) => {
  if (!cond) errors.push(msg)
}

// Ràng buộc chung
for (const o of everything) {
  check(/^0(3|5|7|8|9)\d{8}$/.test(o.p), `SĐT sai mẫu ${o.p}`)
  check(o.a.length >= 10 && o.a.length <= 200, `Địa chỉ sai độ dài ${o.a}`)
  check(o.q >= 1 && o.q <= 5, `Số lượng sai ${o.q}`)
  const fails = (o.cl ?? []).filter((c) => c[1] === 'KNM' || c[1] === 'TB').length
  check(fails <= 3, `Quá 3 lần không liên lạc ${o.n}`)
}
for (const p of RESERVED) {
  const n = everything.filter((o) => o.p === p).length
  if (p === '0987654321') check(n === 3, `Lê Thị Hoa phải có 3 đơn, có ${n}`)
  else if (p === '0912000111') check(n === 1, `Nguyễn Văn Nam phải có 1 đơn, có ${n}`)
  else check(n === 0, `Số test ${p} không được có trong dữ liệu mẫu`)
}
check(everything.every((o) => !o.p.startsWith('090100')), 'Có số bắt đầu 090100 (dành cho test)')
const hoa = everything.filter((o) => o.p === '0987654321')
check(hoa.filter((o) => statusOf(o) === 'HoanHang').length === 2, 'Lê Thị Hoa cần đúng 2 đơn Hoàn hàng')
const nam = FIXTURES.find((o) => o.p === '0912000111')
check(statusOf(nam) === 'ChoGoiLai' && nam.cl.length === 2, 'Nguyễn Văn Nam cần Chờ gọi lại sau 2 lần không nghe máy')

// Số liệu
const counted = history.filter((o) => !(o.x && o.x[0] === 'DonTrung'))
const byStatus = {}
for (const o of history) byStatus[statusOf(o)] = (byStatus[statusOf(o)] ?? 0) + 1
const everConfirmed = (o) => ['DaXacNhan', 'DangGiao', 'DaGiao', 'HoanHang'].includes(statusOf(o))
const confirmedN = counted.filter(everConfirmed).length
const delivered = history.filter((o) => statusOf(o) === 'DaGiao')
const returned = history.filter((o) => statusOf(o) === 'HoanHang')
const finalCombo = (o) => (o.ch ? o.ch : [o.cb, o.q])
const deliveredRevenue = delivered.reduce((s, o) => s + subtotalOf(...finalCombo(o)), 0)
const srcOf = (o) => (o.u ? o.u[0] : o.rf ? 'facebook' : 'direct')
const bySrc = {}
for (const o of counted) bySrc[srcOf(o)] = (bySrc[srcOf(o)] ?? 0) + 1
const visitsTotal = visitStats.filter((v) => v.h).reduce((s, v) => s + v.h.reduce((a, b) => a + b, 0), 0)
const visitsToday = visitStats.filter((v) => v.r).reduce((s, v) => s + v.r.reduce((a, b) => a + b, 0), 0)
const adTotal = adCosts.reduce((s, x) => s + x[3], 0)
const upsells = counted.filter((o) => o.ch && subtotalOf(...o.ch) > subtotalOf(o.cb, o.q) && everConfirmed(o))
const upsellValue = upsells.reduce((s, o) => s + subtotalOf(...o.ch) - subtotalOf(o.cb, o.q), 0)
const byTs = {}
for (const o of counted) {
  const t = (byTs[o.as] ??= { assigned: 0, confirmed: 0, upsell: 0, upsellValue: 0, delivered: 0, returned: 0 })
  t.assigned++
  if (everConfirmed(o)) t.confirmed++
  if (upsells.includes(o)) {
    t.upsell++
    t.upsellValue += subtotalOf(...o.ch) - subtotalOf(o.cb, o.q)
  }
  if (statusOf(o) === 'DaGiao') t.delivered++
  if (statusOf(o) === 'HoanHang') t.returned++
}
const bySrcDetail = {}
for (const o of counted) {
  const s = (bySrcDetail[srcOf(o)] ??= { orders: 0, confirmed: 0, delivered: 0, returned: 0, revenue: 0, visits: 0, cost: 0 })
  s.orders++
  if (everConfirmed(o)) s.confirmed++
  if (statusOf(o) === 'DaGiao') {
    s.delivered++
    s.revenue += subtotalOf(...finalCombo(o))
  }
  if (statusOf(o) === 'HoanHang') s.returned++
}
for (const v of visitStats.filter((x) => x.h)) bySrcDetail[v.s].visits += v.h.reduce((a, b) => a + b, 0)
for (const c of adCosts) bySrcDetail[c[1]].cost += c[3]
const cancelReasons = {}
for (const o of history) {
  if (statusOf(o) !== 'DaHuy') continue
  let r = o.x ? o.x[0] : null
  const codes = (o.cl ?? []).map((c) => c[1])
  if (!r) r = codes.includes('SS') ? 'SaiSoDienThoai' : codes.includes('KH') ? o.cl.find((c) => c[1] === 'KH')[2] : 'KhongLienLacDuoc'
  cancelReasons[r] = (cancelReasons[r] ?? 0) + 1
}
const pct = (a, b, k = 1) => (b ? ((a / b) * 100).toFixed(k) : '—')

const confirmRate = (confirmedN / counted.length) * 100
const returnRate = (returned.length / (delivered.length + returned.length)) * 100
check(history.length + FIXTURES.length >= 560 && history.length + FIXTURES.length <= 660, `Tổng đơn ${history.length + FIXTURES.length} ngoài 560–660`)
check(confirmRate >= 70 && confirmRate <= 80, `Tỉ lệ xác nhận ${confirmRate.toFixed(1)}% ngoài 70–80%`)
check(returnRate >= 10 && returnRate <= 15, `Tỉ lệ hoàn ${returnRate.toFixed(1)}% ngoài 10–15%`)
const fbShare = (bySrc.facebook / counted.length) * 100
check(fbShare >= 50 && fbShare <= 60, `Facebook ${fbShare.toFixed(1)}% ngoài 50–60%`)
for (const v of visitStats.filter((x) => x.h)) check(v.h.length === 24, 'visitStats.h phải 24 số')
const perDay = new Map()
for (const v of visitStats.filter((x) => x.h)) perDay.set(v.d, (perDay.get(v.d) ?? 0) + v.h.reduce((a, b) => a + b, 0))
for (const [d, n] of perDay) check(n >= 380 && n <= 720, `Lượt truy cập ngày ${d} = ${n} ngoài khoảng`)

if (errors.length) {
  console.error('Dừng, dữ liệu sinh ra vi phạm ràng buộc:')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}

// ───────────────────────── Ghi file ─────────────────────────

const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const outOrders = [...history, ...FIXTURES]
const generated = { orders: outOrders, visitStats, adCosts }
const lines = ['{']
const keys = [...Object.keys(data).filter((k) => !(k in generated)), ...Object.keys(generated)]
keys.forEach((key, i) => {
  const value = key in generated ? generated[key] : data[key]
  const comma = i < keys.length - 1 ? ',' : ''
  if (key in generated) {
    lines.push(`  ${JSON.stringify(key)}: [`)
    value.forEach((row, j) => lines.push(`    ${JSON.stringify(row)}${j < value.length - 1 ? ',' : ''}`))
    lines.push(`  ]${comma}`)
  } else {
    const body = JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')
    lines.push(`  ${JSON.stringify(key)}: ${body}${comma}`)
  }
})
lines.push('}')
const text = lines.join('\n') + '\n'
JSON.parse(text)
fs.writeFileSync(file, text, 'utf8')

// ───────────────────────── Báo cáo ─────────────────────────

const fmt = (n) => n.toLocaleString('vi-VN')
console.log(`Đã ghi ${path.relative(process.cwd(), file)} (${(text.length / 1024).toFixed(0)} KB)`)
console.log(`Đơn: ${outOrders.length} = ${history.length} lịch sử (gồm ${all.filter((x) => x.twinOf).length} đơn trùng, 2 đơn của Lê Thị Hoa) + ${FIXTURES.length} viết tay (13 hôm nay + 1 đơn 30 giờ trước)`)
console.log('Lịch sử theo trạng thái:', JSON.stringify(byStatus))
console.log(`Đơn tính (bỏ Đơn trùng): ${counted.length}; xác nhận ${confirmedN} (${pct(confirmedN, counted.length)}%); giao ${delivered.length}, hoàn ${returned.length} (tỉ lệ hoàn ${pct(returned.length, delivered.length + returned.length)}%)`)
console.log('Nguồn (đơn tính):', Object.entries(bySrc).map(([k, v]) => `${k} ${v} (${pct(v, counted.length)}%)`).join(', '))
console.log(`Lượt truy cập lịch sử: ${fmt(visitsTotal)} (${fmt(Math.round(visitsTotal / DAYS))}/ngày); 12 khung giờ hôm nay: ${fmt(visitsToday)}; tỉ lệ chuyển đổi lịch sử ${pct(counted.length, visitsTotal, 2)}%`)
console.log(`Doanh thu đã giao lịch sử: ${fmt(deliveredRevenue)} ₫; chi phí quảng cáo: ${fmt(adTotal)} ₫; ROAS ${(deliveredRevenue / adTotal).toFixed(2)}`)
console.log(`Upsell: ${upsells.length} đơn, ${fmt(upsellValue)} ₫`)
console.log('Theo nguồn:')
for (const [k, s] of Object.entries(bySrcDetail))
  console.log(`  ${k}: lượt ${fmt(s.visits)}, đơn ${s.orders}, CĐ ${pct(s.orders, s.visits, 2)}%, XN ${s.confirmed} (${pct(s.confirmed, s.orders)}%), giao ${s.delivered}, hoàn ${s.returned} (${pct(s.returned, s.delivered + s.returned)}%), DT ${fmt(s.revenue)}, CP ${fmt(s.cost)}, ROAS ${s.cost ? (s.revenue / s.cost).toFixed(2) : '—'}`)
console.log('Theo telesale:')
for (const [k, t] of Object.entries(byTs))
  console.log(`  ${k}: chia ${t.assigned}, XN ${t.confirmed} (${pct(t.confirmed, t.assigned)}%), upsell ${t.upsell} / ${fmt(t.upsellValue)} ₫, giao ${t.delivered}, hoàn ${t.returned} (${pct(t.returned, t.delivered + t.returned)}%)`)
console.log('Lý do hủy (lịch sử):', JSON.stringify(cancelReasons))
const openHist = history.filter((o) => ['Moi', 'ChoGoiLai', 'DaXacNhan', 'DangGiao'].includes(statusOf(o)))
const openBy = {}
for (const o of openHist) openBy[`${o.as}:${statusOf(o)}`] = (openBy[`${o.as}:${statusOf(o)}`] ?? 0) + 1
console.log('Đơn lịch sử còn mở theo telesale:', JSON.stringify(openBy))
console.log('Đơn còn nhãn Trùng:', history.filter((o) => o.tg?.includes('T') && statusOf(o) !== 'DaHuy').length, '· nhãn Rủi ro hoàn:', everything.filter((o) => o.tg?.includes('R')).length)
