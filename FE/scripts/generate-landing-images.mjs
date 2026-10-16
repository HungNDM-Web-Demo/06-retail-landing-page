// Sinh ảnh minh họa cho landing page shop hư cấu "Diệp Lam" (Serum Rau Má Phục Hồi 30 ml) vào public/
// theo đúng đường dẫn mà src/mock/seed/demo-data.json tham chiếu, cùng logo:
//   public/logo/logo.svg, logo-mark.svg, src/app/icon.svg        logo ngang và biểu tượng lá rau má
//   seed/product/serum-rau-ma-30ml.webp (800), hero.webp (1080)  ảnh sản phẩm, ảnh hero chừa khoảng trống phía trên
//   seed/product/sua-rua-mat-rau-ma-100ml.webp (600)             quà tặng: sữa rửa mặt dạng tuýp
//   seed/combos/c01..c03.webp (600)                              1 chai; 2 chai + tuýp; 3 chai + tuýp
//   seed/landing/thanh-phan-*.webp (400)                         rau má, B5, niacinamide, HA
//   seed/landing/truoc-sau-{1..3}-{truoc,sau}.webp (600)         cận cảnh vùng da, cặp cùng bố cục cho thanh kéo
//   seed/reviews/avatar-01..20.webp (160, ≤ 10 KB)               avatar minh họa phẳng
//   seed/reviews/anh-01..08.webp (600)                           ảnh khách gửi (không mặt người)
//   seed/og-landing.jpg (1200×630)                               ảnh chia sẻ mạng xã hội
// Minh họa phẳng bằng SVG hình học, render qua sharp. Chữ chỉ có trên logo, nhãn chai và ảnh OG
// (font hệ thống có dấu tiếng Việt: Palatino Linotype, Segoe UI; máy khác font sẽ cho byte khác).
// Xác định: ngẫu nhiên có hạt giống cố định, chạy lại cho cùng byte. Không ghi gì vào file JSON.
// Cách làm (SVG → sharp → WebP, hạ chất lượng đến khi đủ nhỏ) theo scripts/generate-menu-images.mjs
// của 03-fnb-quan-ly-nha-hang và 04-fnb-menu-qr.
//
// Chạy:      pnpm seed:images
// Tùy chọn:  --only <chuỗi>       chỉ vẽ ảnh có đường dẫn chứa chuỗi
//            --preview <thư mục>  xuất thêm PNG để xem nhanh
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = join(ROOT, 'public')
const SEED_DIR = join(ROOT, 'src', 'mock', 'seed')
const KB = 1000

const args = process.argv.slice(2)
const argVal = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const ONLY = argVal('--only')
const PREVIEW = argVal('--preview')

// ============================================================ Tiện ích SVG
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const r2 = (n) => Math.round(n * 100) / 100
function attrs(o) {
  let out = ''
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === false) continue
    out += ` ${k}="${typeof v === 'number' ? r2(v) : esc(v)}"`
  }
  return out
}
const el = (tag, o = {}, body = '') =>
  body ? `<${tag}${attrs(o)}>${body}</${tag}>` : `<${tag}${attrs(o)}/>`
const rect = (x, y, w, h, o = {}) => el('rect', { x, y, width: w, height: h, ...o })
const circle = (cx, cy, r, o = {}) => el('circle', { cx, cy, r, ...o })
const ellipse = (cx, cy, rx, ry, o = {}) => el('ellipse', { cx, cy, rx, ry, ...o })
const path = (d, o = {}) => el('path', { d, ...o })
const g = (o, body) => el('g', o, body)
const text = (x, y, str, o = {}) => el('text', { x, y, ...o }, esc(str))
// Chuỗi path có số làm tròn 2 chữ số: D`M${x} ${y}`
const D = (s, ...v) => s.reduce((a, str, i) => a + str + (i < v.length ? r2(v[i]) : ''), '')
const at = (x, y, a = 0, s = 1) =>
  `translate(${r2(x)} ${r2(y)})${a ? ` rotate(${r2(a)})` : ''}${s !== 1 ? ` scale(${r2(s)})` : ''}`
const put = (x, y, a, s, body) => g({ transform: at(x, y, a, s) }, body)
const stroke = (color, width, extra = {}) => ({
  fill: 'none',
  stroke: color,
  'stroke-width': width,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  ...extra,
})

const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16))
const rgbToHex = (c) =>
  '#' +
  c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase()
const mix = (a, b, t) => {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t))
}
const tint = (c, t) => mix(c, '#FFFFFF', t)
const shade = (c, t) => mix(c, '#000000', t)
const range = (n) => Array.from({ length: n }, (_, i) => i)
const DEG = Math.PI / 180

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619)
  return h >>> 0
}

// ============================================================ Định nghĩa dùng chung trong một ảnh
let defs = []
let uid = 0
let filterCache = new Map()
let SHADOW = '#3F4A3C'
function resetDefs(shadow) {
  defs = []
  uid = 0
  filterCache = new Map()
  SHADOW = shadow
}
const newId = (p) => `${p}${++uid}`
// stops: [[offset, màu, độ đục?], ...]
function grad(tag, stops, a) {
  const id = newId(tag === 'linearGradient' ? 'lg' : 'rg')
  const body = stops
    .map(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }))
    .join('')
  defs.push(el(tag, { id, ...a }, body))
  return `url(#${id})`
}
const lin = (stops, x1 = 0, y1 = 0, x2 = 1, y2 = 0) =>
  grad('linearGradient', stops, { x1, y1, x2, y2 })
const vlin = (stops) => lin(stops, 0, 0, 0, 1)
const rad = (stops, cx = 0.5, cy = 0.5, r = 0.5) => grad('radialGradient', stops, { cx, cy, r })
function clipOf(inner) {
  const id = newId('cp')
  defs.push(el('clipPath', { id }, inner))
  return `url(#${id})`
}
function cachedFilter(key, body) {
  if (!filterCache.has(key)) {
    const id = newId('f')
    defs.push(el('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, body))
    filterCache.set(key, `url(#${id})`)
  }
  return filterCache.get(key)
}
function maskOf(inner) {
  const id = newId('mk')
  defs.push(el('mask', { id }, inner))
  return `url(#${id})`
}
const blur = (std) => cachedFilter(`b${r2(std)}`, el('feGaussianBlur', { stdDeviation: std }))
const dropShadow = (dx, dy, std, color, op) =>
  cachedFilter(
    `d${dx},${dy},${std},${color},${op}`,
    el('feDropShadow', { dx, dy, stdDeviation: std, 'flood-color': color, 'flood-opacity': op })
  )
const softShadow = (cx, cy, rx, ry, op = 0.3, std = 12) =>
  ellipse(cx, cy, rx, ry, { fill: SHADOW, 'fill-opacity': op, filter: blur(std) })
const svgDoc = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs>${body}</svg>`

// ============================================================ Bảng màu thương hiệu
const TEAL = '#0F766E'
const TEAL_D = '#134E4A'
const LEAF = '#5FA35A'
const LEAF_L = '#86BF73'
const LEAF_D = '#3F8445'
const IVORY = '#FBF6EA'
const GOLD = '#C9A766'
const SERIF = "'Palatino Linotype', 'Book Antiqua', Palatino, Cambria, serif"
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const SKIN_HAND = '#EDC3A3'

// ============================================================ Lá rau má
// Phiến lá hình thận, mép khía tròn, cuống đính ở chỗ lõm. Gốc tọa độ = điểm đính cuống, lá hướng lên (-y).
function rauMaLeaf(R, o = {}) {
  const c = o.color ?? LEAF
  const cy = -R * 0.6
  const notch = o.notch ?? 32
  const n = o.lobes ?? 13
  const a0 = 90 + notch
  const a1 = 450 - notch
  const sx = 1.1
  const P = (a, k = 1) =>
    `${r2(Math.cos(a * DEG) * R * k * sx)} ${r2(cy + Math.sin(a * DEG) * R * k)}`
  let d = `M0 0L${P(a0)}`
  for (let i = 0; i < n; i++) {
    const tm = a0 + ((a1 - a0) * (i + 0.5)) / n
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n
    d += `Q${P(tm, 1.08)} ${P(t1)}`
  }
  d += 'Z'
  const flat = o.flat
  let out = path(d, {
    fill: flat
      ? c
      : rad(
          [
            [0, tint(c, 0.3)],
            [0.65, c],
            [1, shade(c, 0.14)],
          ],
          0.5,
          0.42,
          0.6
        ),
    stroke: flat ? undefined : shade(c, 0.2),
    'stroke-width': flat ? undefined : R * 0.022,
    'stroke-linejoin': 'round',
  })
  const veinColor = o.vein ?? tint(c, 0.42)
  let veins = ''
  const nv = 7
  for (let i = 0; i < nv; i++) {
    const a = a0 + 14 + ((a1 - a0 - 28) * i) / (nv - 1)
    // Gân tỏa từ chỗ đính cuống, hơi cong theo phiến lá
    const [ex, ey] = P(a, 0.74).split(' ').map(Number)
    const mx = ex * 0.5 + (ey - cy) * 0.06
    const my = ey * 0.5 - ex * 0.06
    veins += `M${r2(ex * 0.08)} ${r2(ey * 0.08)}Q${r2(mx)} ${r2(my)} ${r2(ex)} ${r2(ey)}`
  }
  out += path(
    veins,
    stroke(veinColor, o.veinW ?? Math.max(0.8, R * 0.032), { 'stroke-opacity': 0.85 })
  )
  if (!flat)
    out += g(
      { 'clip-path': clipOf(path(d)) },
      ellipse(-R * 0.3, cy - R * 0.45, R * 0.55, R * 0.28, {
        fill: '#FFFFFF',
        'fill-opacity': 0.13,
        transform: `rotate(-30 ${r2(-R * 0.3)} ${r2(cy - R * 0.45)})`,
      })
    )
  return out
}
// Lá kèm cuống dài L; gốc tọa độ ở chân cuống
function leafStem(R, L, o = {}) {
  const c = o.color ?? LEAF
  const bend = o.bend ?? 0.12
  return (
    path(D`M0 0Q${L * bend} ${-L * 0.5} 0 ${-L}`, stroke(shade(c, 0.1), Math.max(1.5, R * 0.075))) +
    put(0, -L, o.tilt ?? 0, 1, rauMaLeaf(R, o))
  )
}
const leafAt = (x, y, a, R, L, o) => put(x, y, a, 1, leafStem(R, L, o))
// Một nhóm lá đổ bóng nhẹ xuống nền
const leafGroup = (body, op = 0.16) => g({ filter: dropShadow(3, 7, 6, '#2C4A33', op) }, body)

// ============================================================ Giọt nước, bọt
// Giọt tròn đọng trên bề mặt
function bead(r) {
  return (
    ellipse(r * 0.2, r * 0.3, r, r * 0.85, { fill: '#1F3A2A', 'fill-opacity': 0.12 }) +
    circle(0, 0, r, {
      fill: rad([
        [0, '#FFFFFF', 0.12],
        [0.75, '#FFFFFF', 0.3],
        [1, '#FFFFFF', 0.75],
      ]),
      stroke: '#FFFFFF',
      'stroke-opacity': 0.8,
      'stroke-width': Math.max(0.8, r * 0.08),
    }) +
    ellipse(-r * 0.36, -r * 0.38, r * 0.3, r * 0.18, {
      fill: '#FFFFFF',
      'fill-opacity': 0.95,
      transform: `rotate(-35 ${r2(-r * 0.36)} ${r2(-r * 0.38)})`,
    })
  )
}
// Giọt hình nước mắt, đầu nhọn ở trên; tâm phần tròn tại gốc, bán kính s
function teardrop(s, color = '#FFFFFF', op = 0.55) {
  const d = D`M0 ${-s * 2.1}C${s * 0.35} ${-s * 1.3} ${s} ${-s * 0.75} ${s} 0A${s} ${s} 0 0 1 ${-s} 0C${-s} ${-s * 0.75} ${-s * 0.35} ${-s * 1.3} 0 ${-s * 2.1}Z`
  return (
    path(d, {
      fill: vlin([
        [0, color, op * 0.4],
        [1, color, op],
      ]),
      stroke: '#FFFFFF',
      'stroke-opacity': 0.85,
      'stroke-width': Math.max(1, s * 0.08),
    }) +
    path(D`M${-s * 0.55} ${-s * 0.2}Q${-s * 0.5} ${-s * 0.9} ${-s * 0.15} ${-s * 1.35}`, {
      ...stroke('#FFFFFF', s * 0.2),
      'stroke-opacity': 0.9,
    }) +
    path(D`M${s * 0.15} ${s * 0.7}Q${s * 0.6} ${s * 0.55} ${s * 0.72} ${s * 0.15}`, {
      ...stroke('#FFFFFF', s * 0.12),
      'stroke-opacity': 0.6,
    })
  )
}
// Bong bóng trong suốt (HA, bọt sữa rửa mặt)
function bubble(r, edge = '#7CCAD6') {
  return (
    circle(0, 0, r, {
      fill: rad([
        [0, '#FFFFFF', 0.08],
        [0.72, tint(edge, 0.5), 0.22],
        [1, edge, 0.55],
      ]),
      stroke: '#FFFFFF',
      'stroke-opacity': 0.85,
      'stroke-width': Math.max(1, r * 0.035),
    }) +
    path(D`M${-r * 0.7} ${-r * 0.1}A${r * 0.72} ${r * 0.72} 0 0 1 ${-r * 0.1} ${-r * 0.7}`, {
      ...stroke('#FFFFFF', Math.max(1.2, r * 0.1)),
      'stroke-opacity': 0.9,
    }) +
    circle(-r * 0.5, -r * 0.52, Math.max(1, r * 0.07), { fill: '#FFFFFF' }) +
    path(D`M${r * 0.25} ${r * 0.68}A${r * 0.72} ${r * 0.72} 0 0 0 ${r * 0.68} ${r * 0.25}`, {
      ...stroke('#FFFFFF', Math.max(1, r * 0.06)),
      'stroke-opacity': 0.55,
    })
  )
}
// Lấp lánh 4 cánh
const sparkle = (s, c = '#FFFFFF', op = 0.9) =>
  path(
    D`M0 ${-s}Q${s * 0.12} ${-s * 0.12} ${s} 0Q${s * 0.12} ${s * 0.12} 0 ${s}Q${-s * 0.12} ${s * 0.12} ${-s} 0Q${-s * 0.12} ${-s * 0.12} 0 ${-s}Z`,
    { fill: c, 'fill-opacity': op }
  )

// ============================================================ Chai serum bóp giọt
// Gốc tọa độ ở giữa đáy chai, cao H (tính cả núm bóp). Thủy tinh hổ phách, nhãn ngà, cổ vàng champagne,
// núm bóp xanh teal đậm. o.shadow = false khi chai nằm (bóng do nhóm ngoài lo), o.text = false để nhãn không chữ.
function serumBottle(H, o = {}) {
  const W = H * 0.4
  const L = -W / 2
  const R = W / 2
  const top = -H * 0.6
  const nw = W * 0.36
  const br = W * 0.1
  const sY = top + W * 0.3
  const neckTop = top - H * 0.04
  const body = D`M${L} ${-br}L${L} ${sY}C${L} ${top + W * 0.06} ${-nw / 2 - W * 0.1} ${top} ${-nw / 2} ${top}L${-nw / 2} ${neckTop}L${nw / 2} ${neckTop}L${nw / 2} ${top}C${nw / 2 + W * 0.1} ${top} ${R} ${top + W * 0.06} ${R} ${sY}L${R} ${-br}Q${R} 0 ${R - br} 0L${L + br} 0Q${L} 0 ${L} ${-br}Z`
  let out = ''
  if (o.shadow !== false) {
    out += ellipse(W * 0.1, 0, W * 0.64, W * 0.08, {
      fill: SHADOW,
      'fill-opacity': 0.34,
      filter: blur(W * 0.045),
    })
    out += ellipse(W * 0.5, W * 0.015, W * 0.5, W * 0.055, {
      fill: '#E39A45',
      'fill-opacity': 0.22,
      filter: blur(W * 0.05),
    })
  }
  out += path(body, {
    fill: lin([
      [0, '#6E340D'],
      [0.16, '#B46A25'],
      [0.3, '#D59446'],
      [0.52, '#B76B22'],
      [0.84, '#8A4513'],
      [1, '#5E2B09'],
    ]),
  })
  // Nhãn
  const lt = top + W * 0.42
  const lb = -H * 0.06
  const lh = lb - lt
  let inner = rect(L, -W * 0.08, W, W * 0.08, { fill: '#4A2006', 'fill-opacity': 0.35 })
  inner += rect(L, lt, W, lh, { fill: IVORY })
  inner += rect(L, lt + lh * 0.045, W, Math.max(0.8, lh * 0.012), { fill: GOLD })
  inner += rect(L, lb - lh * 0.057, W, Math.max(0.8, lh * 0.012), { fill: GOLD })
  inner += put(
    0,
    lt + lh * 0.3,
    0,
    1,
    rauMaLeaf(lh * 0.085, { color: LEAF_D, flat: true, vein: IVORY })
  )
  if (o.text !== false && W >= 70) {
    inner += text(0, lt + lh * 0.55, 'Diệp Lam', {
      'font-family': SERIF,
      'font-size': W * 0.15,
      'text-anchor': 'middle',
      fill: TEAL_D,
    })
    inner += rect(-W * 0.14, lt + lh * 0.625, W * 0.28, Math.max(0.8, W * 0.006), { fill: GOLD })
    inner += text(0, lt + lh * 0.76, 'SERUM RAU MÁ', {
      'font-family': SANS,
      'font-size': W * 0.068,
      'font-weight': 600,
      'letter-spacing': W * 0.01,
      'text-anchor': 'middle',
      fill: TEAL,
    })
    inner += text(0, lt + lh * 0.875, '30 ml', {
      'font-family': SANS,
      'font-size': W * 0.056,
      'text-anchor': 'middle',
      fill: '#6B7F7A',
    })
  } else {
    inner += rect(-W * 0.26, lt + lh * 0.48, W * 0.52, lh * 0.07, { rx: lh * 0.035, fill: TEAL_D })
    inner += rect(-W * 0.18, lt + lh * 0.66, W * 0.36, lh * 0.045, { rx: lh * 0.02, fill: TEAL })
  }
  // Đổ bóng hình trụ và vệt sáng
  inner += rect(L, neckTop, W, -neckTop, {
    fill: lin([
      [0, '#000000', 0.3],
      [0.2, '#000000', 0],
      [0.7, '#000000', 0],
      [1, '#000000', 0.34],
    ]),
  })
  inner += rect(L + W * 0.1, sY + W * 0.05, W * 0.055, -sY - W * 0.18, {
    rx: W * 0.027,
    fill: '#FFFFFF',
    'fill-opacity': 0.38,
  })
  inner += rect(L + W * 0.19, sY + W * 0.12, W * 0.018, -sY - W * 0.3, {
    rx: W * 0.009,
    fill: '#FFFFFF',
    'fill-opacity': 0.26,
  })
  inner += rect(R - W * 0.1, sY + W * 0.08, W * 0.03, -sY - W * 0.25, {
    rx: W * 0.015,
    fill: '#FFFFFF',
    'fill-opacity': 0.16,
  })
  inner += path(
    D`M${L + W * 0.07} ${sY + W * 0.02}C${L + W * 0.07} ${top + W * 0.1} ${-nw / 2 - W * 0.05} ${top + W * 0.045} ${-nw / 2 + W * 0.01} ${top + W * 0.04}`,
    { ...stroke('#FFFFFF', W * 0.03), 'stroke-opacity': 0.45 }
  )
  out += g({ 'clip-path': clipOf(path(body)) }, inner)
  // Cổ vàng champagne có gân dọc
  const cw = W * 0.5
  const cTop = top - H * 0.12
  const cH = H * 0.128
  out += rect(-cw / 2, cTop, cw, cH, {
    rx: W * 0.02,
    fill: lin([
      [0, '#8E6C36'],
      [0.2, '#E3CC97'],
      [0.36, '#F6EACB'],
      [0.62, '#C7A563'],
      [1, '#80602D'],
    ]),
  })
  let ribs = ''
  for (let x = -cw / 2 + W * 0.04; x < cw / 2 - W * 0.02; x += W * 0.035)
    ribs += `M${r2(x)} ${r2(cTop + cH * 0.12)}V${r2(cTop + cH * 0.9)}`
  out += path(ribs, stroke('#6F5428', Math.max(0.6, W * 0.008), { 'stroke-opacity': 0.28 }))
  out += rect(-cw / 2, cTop + cH - Math.max(1, H * 0.008), cw, Math.max(1, H * 0.008), {
    fill: '#6F5428',
    'fill-opacity': 0.35,
  })
  // Núm bóp cao su
  const bw = W * 0.4
  const bb = cTop - H * 0.016
  const bh = H + bb
  out += rect(-W * 0.24, bb, W * 0.48, H * 0.02, {
    rx: H * 0.008,
    fill: lin([
      [0, '#0A3632'],
      [0.3, '#1F7A71'],
      [1, '#0A3632'],
    ]),
  })
  const bulb = D`M${-bw / 2} ${bb}L${-bw * 0.44} ${bb - bh * 0.5}C${-bw * 0.46} ${-H + bw * 0.25} ${-bw * 0.3} ${-H} 0 ${-H}C${bw * 0.3} ${-H} ${bw * 0.46} ${-H + bw * 0.25} ${bw * 0.44} ${bb - bh * 0.5}L${bw / 2} ${bb}Z`
  out += path(bulb, {
    fill: lin([
      [0, '#0A3632'],
      [0.22, '#1C6E66'],
      [0.4, '#2B8B81'],
      [0.7, '#145A54'],
      [1, '#082E2B'],
    ]),
  })
  out += rect(-bw * 0.3, -H + bw * 0.22, bw * 0.12, bh * 0.62, {
    rx: bw * 0.06,
    fill: '#FFFFFF',
    'fill-opacity': 0.28,
  })
  return out
}

// ============================================================ Tuýp sữa rửa mặt 100 ml
// Gốc tọa độ ở giữa đáy nắp (tuýp đứng trên nắp), cao H. o.bow: thắt nơ quà tặng ở mép ép trên.
function cleanserTube(H, o = {}) {
  const Wt = H * 0.46
  const cw = H * 0.3
  const ch = H * 0.13
  const yC = -H + H * 0.075
  const body = D`M${-cw * 0.48} ${-ch + 2}C${-cw * 0.5} ${-ch - H * 0.3} ${-Wt / 2} ${yC + H * 0.3} ${-Wt / 2} ${yC}L${Wt / 2} ${yC}C${Wt / 2} ${yC + H * 0.3} ${cw * 0.5} ${-ch - H * 0.3} ${cw * 0.48} ${-ch + 2}Z`
  let out = ''
  if (o.shadow !== false)
    out += ellipse(cw * 0.15, 0, cw * 0.85, cw * 0.13, {
      fill: SHADOW,
      'fill-opacity': 0.32,
      filter: blur(cw * 0.06),
    })
  out += path(body, {
    fill: lin([
      [0, '#DCD2BC'],
      [0.22, '#FCFAF4'],
      [0.6, '#F3EDDF'],
      [1, '#CFC4AB'],
    ]),
  })
  let inner = path(
    D`M${-Wt} ${-ch - H * 0.2}Q${-Wt * 0.25} ${-ch - H * 0.3} 0 ${-ch - H * 0.22}T${Wt} ${-ch - H * 0.24}L${Wt} 0L${-Wt} 0Z`,
    { fill: '#D6EBCF' }
  )
  inner += path(
    D`M${-Wt} ${-ch - H * 0.1}Q${-Wt * 0.3} ${-ch - H * 0.2} ${Wt * 0.1} ${-ch - H * 0.1}T${Wt} ${-ch - H * 0.12}L${Wt} 0L${-Wt} 0Z`,
    { fill: '#AFD7A3' }
  )
  inner += put(
    0,
    yC + H * 0.3,
    0,
    1,
    rauMaLeaf(Wt * 0.11, { color: LEAF_D, flat: true, vein: IVORY })
  )
  inner += rect(-Wt * 0.24, yC + H * 0.36, Wt * 0.48, H * 0.024, { rx: H * 0.012, fill: TEAL_D })
  inner += rect(-Wt * 0.16, yC + H * 0.41, Wt * 0.32, H * 0.016, {
    rx: H * 0.008,
    fill: '#8AA39D',
  })
  inner += rect(-Wt * 0.12, yC + H * 0.445, Wt * 0.24, H * 0.016, {
    rx: H * 0.008,
    fill: '#8AA39D',
  })
  inner += rect(-Wt, -H, Wt * 2, H, {
    fill: lin([
      [0, '#000000', 0.16],
      [0.18, '#000000', 0],
      [0.75, '#000000', 0],
      [1, '#000000', 0.2],
    ]),
  })
  inner += rect(-Wt * 0.36, yC + H * 0.08, Wt * 0.06, H * 0.55, {
    rx: Wt * 0.03,
    fill: '#FFFFFF',
    'fill-opacity': 0.55,
  })
  out += g({ 'clip-path': clipOf(path(body)) }, inner)
  // Mép ép
  out += rect(-Wt / 2 - 1, -H, Wt + 2, H * 0.075 + 1, { rx: 2, fill: '#ECE5D5' })
  let ridges = ''
  for (let x = -Wt / 2 + Wt / 20; x < Wt / 2; x += Wt / 20)
    ridges += `M${r2(x)} ${r2(-H + H * 0.012)}V${r2(yC - H * 0.012)}`
  out += path(ridges, stroke('#CFC4AB', Math.max(0.6, H * 0.004)))
  out += rect(-Wt / 2 - 1, yC - 1, Wt + 2, 2, { fill: '#C9BEA5' })
  // Nắp lật
  out += rect(-cw / 2, -ch, cw, ch, {
    rx: cw * 0.1,
    fill: lin([
      [0, '#0A4B45'],
      [0.25, '#1A8A80'],
      [0.45, '#23998E'],
      [1, '#0B4E48'],
    ]),
  })
  out += rect(-cw / 2, -ch * 0.62, cw, Math.max(1.2, H * 0.007), { fill: '#083B37' })
  out += rect(-cw * 0.32, -ch * 0.9, cw * 0.08, ch * 0.75, {
    rx: cw * 0.04,
    fill: '#FFFFFF',
    'fill-opacity': 0.25,
  })
  if (o.bow) out += put(0, -H + H * 0.03, 0, 1, bow(H * 0.09, '#D9867A'))
  return out
}
// Nơ quà tặng
function bow(s, c) {
  const loop = (k) =>
    path(
      D`M0 0C${k * s * 0.4} ${-s * 1.1} ${k * s * 1.7} ${-s * 0.9} ${k * s * 1.5} ${-s * 0.1}C${k * s * 1.4} ${s * 0.5} ${k * s * 0.5} ${s * 0.3} 0 0Z`,
      {
        fill: lin([
          [0, tint(c, 0.2)],
          [1, shade(c, 0.15)],
        ]),
      }
    )
  const tail = (k) =>
    path(D`M0 0L${k * s * 0.9} ${s * 1.6}L${k * s * 0.55} ${s * 1.5}L${k * s * 0.4} ${s * 1.75}Z`, {
      fill: shade(c, 0.1),
    })
  return (
    tail(-1) +
    tail(1) +
    loop(-1) +
    loop(1) +
    ellipse(0, 0, s * 0.3, s * 0.34, { fill: shade(c, 0.2) })
  )
}

// ============================================================ Bệ, vòm, hộp
function podium(cx, topY, rx, h, color) {
  const ry = rx * 0.16
  return (
    softShadow(cx, topY + h + ry * 0.4, rx * 1.02, ry * 0.9, 0.22, 16) +
    path(
      D`M${cx - rx} ${topY}L${cx - rx} ${topY + h}A${rx} ${ry} 0 0 0 ${cx + rx} ${topY + h}L${cx + rx} ${topY}Z`,
      {
        fill: lin([
          [0, shade(color, 0.08)],
          [0.35, tint(color, 0.25)],
          [1, shade(color, 0.14)],
        ]),
      }
    ) +
    ellipse(cx, topY, rx, ry, {
      fill: vlin([
        [0, tint(color, 0.45)],
        [1, tint(color, 0.15)],
      ]),
    }) +
    ellipse(cx, topY, rx - 1, ry - 1, { ...stroke('#FFFFFF', 2), 'stroke-opacity': 0.55 })
  )
}
const arch = (cx, bottom, w, h, fill) =>
  path(
    D`M${cx - w / 2} ${bottom}L${cx - w / 2} ${bottom - h + w / 2}A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${bottom - h + w / 2}L${cx + w / 2} ${bottom}Z`,
    { fill }
  )
// Hộp giấy phối cảnh xiên: mặt trước góc trái dưới (x, y), rộng w, cao h, chiều sâu (dx, dy < 0).
// o.front/top/side: màu; o.open: vẽ lòng hộp thay cho mặt trên; o.decor(x, y, w, h): trang trí mặt trước
function carton(x, y, w, h, dx, dy, o) {
  const front = D`M${x} ${y}L${x + w} ${y}L${x + w} ${y - h}L${x} ${y - h}Z`
  const topF = D`M${x} ${y - h}L${x + w} ${y - h}L${x + w + dx} ${y - h + dy}L${x + dx} ${y - h + dy}Z`
  const side = D`M${x + w} ${y}L${x + w + dx} ${y + dy}L${x + w + dx} ${y - h + dy}L${x + w} ${y - h}Z`
  let out = softShadow(x + w / 2 + dx * 0.6, y + 4, w * 0.62, 18, 0.3, 14)
  out += path(side, { fill: o.side })
  out += path(topF, { fill: o.open ? shade(o.top, 0.18) : o.top })
  if (o.open && o.inside) out += o.inside
  if (o.mid) out += o.mid
  out += path(front, { fill: o.front })
  if (o.decor) out += g({ 'clip-path': clipOf(path(front)) }, o.decor(x, y, w, h))
  if (o.sideDecor) out += g({ 'clip-path': clipOf(path(side)) }, o.sideDecor(x, y, w, h))
  return out
}
// Trang trí hộp sản phẩm: dải teal, lá rau má, chỉ vàng
const productBoxDecor = (x, y, w, h) =>
  rect(x, y - h * 0.42, w, h * 0.2, { fill: TEAL }) +
  rect(x, y - h * 0.445, w, h * 0.012, { fill: GOLD }) +
  rect(x, y - h * 0.21, w, h * 0.012, { fill: GOLD }) +
  put(
    x + w / 2,
    y - h * 0.62,
    0,
    1,
    rauMaLeaf(Math.min(w, h) * 0.1, { color: LEAF_D, flat: true, vein: IVORY })
  ) +
  rect(x + w * 0.3, y - h * 0.335, w * 0.4, h * 0.03, {
    rx: h * 0.015,
    fill: IVORY,
    'fill-opacity': 0.85,
  }) +
  rect(x, y - h, w, h, {
    fill: lin([
      [0, '#000000', 0.06],
      [0.3, '#000000', 0],
      [1, '#000000', 0.05],
    ]),
  })
const productSideDecor = (x, y, w, h) =>
  rect(x + w, y - h * 0.5, w, h * 0.2, { fill: shade(TEAL, 0.2) })

// Ống nhỏ giọt rời; đầu nhỏ giọt ở gốc (0,0), thân hướng lên
function pipette(H, liquid = '#F1CF7A') {
  const tw = H * 0.085
  const glass = D`M${-tw * 0.16} 0L${-tw / 2} ${-H * 0.22}L${-tw / 2} ${-H * 0.66}L${tw / 2} ${-H * 0.66}L${tw / 2} ${-H * 0.22}L${tw * 0.16} 0Z`
  let out = path(glass, { fill: '#FFFFFF', 'fill-opacity': 0.4 })
  out += g(
    { 'clip-path': clipOf(path(glass)) },
    rect(-tw, -H * 0.36, tw * 2, H * 0.36, { fill: liquid, 'fill-opacity': 0.75 }) +
      rect(-tw * 0.32, -H * 0.62, tw * 0.16, H * 0.55, { fill: '#FFFFFF', 'fill-opacity': 0.7 })
  )
  out += path(glass, {
    fill: 'none',
    stroke: '#8FAEA8',
    'stroke-opacity': 0.7,
    'stroke-width': Math.max(1, tw * 0.07),
  })
  out += rect(-tw * 0.75, -H * 0.72, tw * 1.5, H * 0.07, {
    rx: tw * 0.12,
    fill: lin([
      [0, '#8E6C36'],
      [0.3, '#F1E2BC'],
      [1, '#8E6C36'],
    ]),
  })
  out += path(
    D`M${-tw * 0.62} ${-H * 0.72}L${-tw * 0.58} ${-H * 0.9}C${-tw * 0.58} ${-H} ${tw * 0.58} ${-H} ${tw * 0.58} ${-H * 0.9}L${tw * 0.62} ${-H * 0.72}Z`,
    {
      fill: lin([
        [0, '#0A3632'],
        [0.35, '#2B8B81'],
        [1, '#082E2B'],
      ]),
    }
  )
  return out
}

// ============================================================ Nền chung
const bg = (w, h, top, bottom) =>
  rect(0, 0, w, h, {
    fill: vlin([
      [0, top],
      [1, bottom],
    ]),
  })
const vignette = (w, h, color = '#3B2A1A', op = 0.2) =>
  rect(0, 0, w, h, {
    fill: rad(
      [
        [0.55, color, 0],
        [1, color, op],
      ],
      0.5,
      0.5,
      0.75
    ),
  })

// ============================================================ Ảnh sản phẩm
function productShot(W, H) {
  resetDefs('#5B4A33')
  let b = bg(W, H, '#FBF8F2', '#F0E8D9')
  b += circle(400, 360, 285, {
    fill: vlin([
      [0, '#E8F4EF'],
      [1, '#D3EAE2'],
    ]),
  })
  b += circle(668, 142, 36, { fill: '#E3F1EC' })
  b += circle(126, 600, 22, { fill: '#E3F1EC' })
  b += leafGroup(
    leafAt(318, 640, -40, 96, 120, { color: LEAF }) +
      leafAt(300, 632, -74, 70, 96, { color: LEAF_L, tilt: -8 }) +
      leafAt(486, 640, 36, 104, 128, { color: LEAF_D, tilt: 6 }) +
      leafAt(500, 636, 72, 72, 96, { color: LEAF })
  )
  b += podium(400, 640, 215, 64, '#EFE5D3')
  b += put(400, 646, 0, 1, serumBottle(440))
  b += leafGroup(leafAt(244, 662, -104, 42, 26, { color: LEAF_L }), 0.12)
  b += put(560, 656, 0, 1, bead(8)) + put(584, 646, 0, 1, bead(5)) + put(270, 640, 0, 1, bead(5))
  return svgDoc(W, H, b)
}

function heroShot(W, H) {
  resetDefs('#24514A')
  let b = bg(W, H, '#EAF6F2', '#C6E6DE')
  b += circle(900, 190, 170, { fill: '#FFFFFF', 'fill-opacity': 0.35, filter: blur(40) })
  b += circle(150, 320, 140, { fill: '#D2EDE5', 'fill-opacity': 0.8, filter: blur(36) })
  b += arch(
    540,
    900,
    600,
    560,
    vlin([
      [0, '#F4FBF8'],
      [1, '#D5EDE6'],
    ])
  )
  b += leafGroup(
    leafAt(420, 900, -14, 78, 250, { color: LEAF_L, tilt: -10 }) +
      leafAt(400, 902, -42, 112, 200, { color: LEAF }) +
      leafAt(380, 898, -74, 84, 150, { color: LEAF_D, tilt: -6 }) +
      leafAt(664, 902, 16, 82, 270, { color: LEAF, tilt: 8 }) +
      leafAt(684, 902, 44, 118, 210, { color: LEAF_D, tilt: 4 }) +
      leafAt(704, 898, 76, 86, 150, { color: LEAF_L })
  )
  b += podium(540, 900, 320, 88, '#F5EEE1')
  b += put(540, 908, 0, 1, serumBottle(530))
  b += leafGroup(
    leafAt(96, 1110, 34, 74, 50, { color: LEAF_L }) +
      leafAt(990, 1112, -34, 78, 50, { color: LEAF })
  )
  b += put(790, 520, 0, 1, teardrop(15))
  b += put(300, 600, 0, 1, teardrop(11))
  b += put(838, 700, 0, 1, teardrop(8))
  b += put(400, 914, 0, 1, bead(9)) + put(700, 920, 0, 1, bead(7)) + put(724, 908, 0, 1, bead(4))
  return svgDoc(W, H, b)
}

function cleanserShot(W, H) {
  resetDefs('#2E5249')
  let b = bg(W, H, '#F5FAF7', '#E0F0EA')
  b += circle(300, 280, 210, {
    fill: vlin([
      [0, '#DDF0E9'],
      [1, '#CBE7DD'],
    ]),
  })
  b += leafGroup(
    leafAt(250, 470, -42, 70, 96, { color: LEAF }) +
      leafAt(236, 466, -76, 52, 70, { color: LEAF_L }) +
      leafAt(352, 470, 40, 76, 100, { color: LEAF_D })
  )
  b += podium(300, 470, 160, 48, '#F3EBDD')
  b += put(300, 478, 0, 1, cleanserTube(330))
  const foam = [
    [178, 470, 16],
    [160, 458, 10],
    [198, 458, 9],
    [150, 476, 7],
    [420, 472, 12],
    [438, 462, 7],
  ]
  b += foam.map(([x, y, r]) => put(x, y, 0, 1, bubble(r, '#9FCFC5'))).join('')
  return svgDoc(W, H, b)
}

// Combo: n chai (+ tuýp quà tặng)
function comboShot(W, H, n, gift) {
  resetDefs('#5B4A33')
  let b = bg(W, H, '#FBF7EF', '#F0E7D7')
  b += circle(300, 286, 228, {
    fill: vlin([
      [0, '#E7F3EE'],
      [1, '#D3E9E1'],
    ]),
  })
  b += leafGroup(
    leafAt(200, 470, -34, 54, 140, { color: LEAF }) +
      leafAt(186, 466, -66, 40, 90, { color: LEAF_L }) +
      leafAt(400, 470, 34, 56, 144, { color: LEAF_D }) +
      leafAt(414, 466, 66, 40, 90, { color: LEAF })
  )
  b += podium(300, 470, 230, 52, '#EFE5D3')
  if (n === 1) {
    b += put(300, 478, 0, 1, serumBottle(340))
  } else if (n === 2) {
    b += put(196, 474, 0, 1, serumBottle(300))
    b += put(306, 486, 0, 1, serumBottle(300))
    b += put(420, 488, 0, 1, cleanserTube(236, { bow: gift }))
  } else {
    b += put(146, 472, 0, 1, serumBottle(262))
    b += put(232, 486, 0, 1, serumBottle(262))
    b += put(318, 472, 0, 1, serumBottle(262))
    b += put(430, 488, 0, 1, cleanserTube(224, { bow: gift }))
  }
  return svgDoc(W, H, b)
}

// ============================================================ Thành phần (400×400)
function ingredientFrame(W, H, top, bottom, disc1, disc2, body) {
  return (
    bg(W, H, top, bottom) +
    circle(200, 200, 150, {
      fill: vlin([
        [0, disc1],
        [1, disc2],
      ]),
    }) +
    body
  )
}
function ingRauMa(W, H) {
  resetDefs('#2C4A33')
  let s = path('M96 352Q200 336 312 356', stroke('#8DB37C', 6))
  s += path('M150 346l-8 22M150 346l6 20M262 350l-6 22M262 350l8 18', stroke('#C9B48E', 2.4))
  s += leafGroup(
    leafAt(200, 346, -40, 58, 108, { color: LEAF_L }) +
      leafAt(204, 346, 34, 56, 100, { color: LEAF }) +
      leafAt(202, 346, -4, 70, 150, { color: LEAF_D }) +
      leafAt(152, 346, -70, 34, 46, { color: LEAF }),
    0.2
  )
  s += put(218, 138, 0, 1, bead(7)) + put(112, 222, 0, 1, bead(5)) + put(290, 230, 0, 1, bead(6))
  s += put(196, 160, 0, 1, bead(3.5))
  return svgDoc(W, H, ingredientFrame(W, H, '#F1F8F3', '#E3F1E8', '#DDF0E3', '#C8E5D2', s))
}
function ingB5(W, H) {
  resetDefs('#6B4F1E')
  const gold = '#EBC66E'
  let s = ellipse(196, 318, 96, 22, {
    fill: lin([
      [0, gold, 0.55],
      [0.5, tint(gold, 0.4), 0.75],
      [1, gold, 0.55],
    ]),
  })
  s += ellipse(196, 316, 60, 13, { ...stroke('#FFFFFF', 2.5), 'stroke-opacity': 0.75 })
  s += ellipse(196, 316, 30, 6.5, { ...stroke('#FFFFFF', 2), 'stroke-opacity': 0.6 })
  s += ellipse(166, 312, 22, 4, { fill: '#FFFFFF', 'fill-opacity': 0.6 })
  s += g({ filter: dropShadow(6, 10, 8, '#6B4F1E', 0.2) }, put(206, 214, 24, 1, pipette(210, gold)))
  s += put(206, 236, 0, 1, teardrop(8, gold, 0.85))
  s += put(198, 280, 0, 1, teardrop(10, gold, 0.85))
  s += put(296, 120, 0, 1, sparkle(10, '#FFFFFF')) + put(118, 150, 0, 1, sparkle(7, '#FFFFFF'))
  s += put(300, 270, 0, 1, sparkle(6, '#FFFFFF'))
  return svgDoc(W, H, ingredientFrame(W, H, '#FCF6EA', '#F6EBD4', '#F7E9CC', '#EFDAB2', s))
}
function ingNiacinamide(W, H) {
  resetDefs('#3B4A63')
  const rnd = mulberry32(hashStr('niacinamide'))
  // Vòng sáu cạnh mờ phía sau gợi cấu trúc phân tử
  let hex = ''
  for (let i = 0; i <= 6; i++) {
    const a = (i * 60 - 90) * DEG
    hex += `${i ? 'L' : 'M'}${r2(286 + Math.cos(a) * 42)} ${r2(126 + Math.sin(a) * 42)}`
  }
  let s = path(hex + 'Z', stroke('#B8C6DA', 4))
  s += path('M286 84L286 56M322 105L350 90', stroke('#B8C6DA', 4))
  s += circle(286, 52, 6, { fill: '#B8C6DA' }) + circle(354, 88, 6, { fill: '#B8C6DA' })
  // Đĩa thủy tinh
  s += softShadow(200, 300, 132, 26, 0.25, 10)
  s += ellipse(200, 290, 130, 38, {
    fill: vlin([
      [0, '#FFFFFF', 0.55],
      [1, '#DCE5F0', 0.85],
    ]),
    stroke: '#AFC0D4',
    'stroke-width': 2,
  })
  s += ellipse(200, 282, 116, 30, { fill: '#F3F7FB', stroke: '#C4D2E2', 'stroke-width': 2 })
  // Ụ bột trắng
  let mound = 'M104 284'
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const x = 104 + t * 192
    const y = 284 - Math.sin(t * Math.PI) ** 0.8 * 74 + (rnd() - 0.5) * 6 * Math.sin(t * Math.PI)
    mound += `L${r2(x)} ${r2(y)}`
  }
  s += path(mound + 'Q200 296 104 284Z', {
    fill: rad(
      [
        [0, '#FFFFFF'],
        [0.8, '#F2F5F9'],
        [1, '#DCE3EC'],
      ],
      0.42,
      0.3,
      0.75
    ),
    stroke: '#D3DCE7',
    'stroke-width': 1.5,
  })
  for (let i = 0; i < 14; i++) {
    const x = 120 + rnd() * 160
    const y = 230 + rnd() * 52
    const sz = 3 + rnd() * 4
    s += put(
      x,
      y,
      rnd() * 90,
      1,
      path(D`M0 ${-sz}L${sz * 0.7} 0L0 ${sz}L${-sz * 0.7} 0Z`, {
        fill: '#FFFFFF',
        stroke: '#B9CBE0',
        'stroke-width': 1,
      })
    )
  }
  s +=
    put(250, 196, 0, 1, sparkle(11)) +
    put(138, 214, 0, 1, sparkle(7)) +
    put(312, 252, 0, 1, sparkle(6))
  return svgDoc(W, H, ingredientFrame(W, H, '#F4F6FA', '#E8EDF4', '#E3E9F2', '#D3DCE9', s))
}
function ingHA(W, H) {
  resetDefs('#2C5A62')
  let s = ellipse(200, 334, 120, 16, { ...stroke('#FFFFFF', 2.5), 'stroke-opacity': 0.55 })
  s += ellipse(200, 334, 76, 10, { ...stroke('#FFFFFF', 2), 'stroke-opacity': 0.45 })
  const bs = [
    [182, 206, 80],
    [292, 128, 38],
    [298, 262, 24],
    [108, 108, 18],
    [252, 320, 12],
    [104, 300, 11],
    [330, 196, 8],
    [146, 84, 7],
  ]
  s += bs.map(([x, y, r]) => put(x, y, 0, 1, bubble(r))).join('')
  s += put(
    182,
    206,
    0,
    1,
    circle(10, 18, 9, { fill: '#FFFFFF', 'fill-opacity': 0.25 }) +
      circle(-18, 30, 5, { fill: '#FFFFFF', 'fill-opacity': 0.25 })
  )
  return svgDoc(W, H, ingredientFrame(W, H, '#EDF8F9', '#DDF1F3', '#D5EFF2', '#BEE4EA', s))
}

// ============================================================ Trước – sau: cận cảnh vùng da (600×600)
// Cùng hạt giống cho cặp ảnh nên lỗ chân lông, vùng sáng tối trùng vị trí; chỉ khác tình trạng da.
const SKIN = { base: '#E8C2A4', hi: '#F6DECB', lo: '#CF9F7E' }
function skinShot(W, H, kind, after) {
  resetDefs('#5A3A28')
  // rnd: chi tiết riêng từng tình trạng; rp: vân da và lỗ chân lông dùng chung cho cặp ảnh
  const rnd = mulberry32(hashStr(`skin-${kind}`))
  const rp = mulberry32(hashStr(`pores-${kind}`))
  const dull = kind === 1 ? '#C9B6A6' : kind === 3 ? '#B9A28A' : '#E0A894'
  const k = after ? 0 : kind === 2 ? 0.06 : 0.3
  const base = mix(SKIN.base, dull, k)
  const hi = mix(after ? '#F9E3D2' : SKIN.hi, dull, k * 0.7)
  const lo = mix(SKIN.lo, dull, k * 0.6)
  let b = rect(0, 0, W, H, {
    fill: rad(
      [
        [0, hi],
        [0.55, base],
        [1, lo],
      ],
      0.36,
      0.3,
      0.95
    ),
  })
  // Khối cong của gò má: vùng tối dịu phía dưới phải, vùng sáng phía trên trái
  b += ellipse(560, 600, 330, 240, { fill: shade(lo, 0.1), 'fill-opacity': 0.35, filter: blur(70) })
  b += ellipse(170, 140, 230, 170, { fill: hi, 'fill-opacity': 0.5, filter: blur(60) })
  // Vi cấu trúc da: các rãnh mảnh đan hình thoi
  let micro = ''
  for (let i = 0; i < 560; i++) {
    const x = rp() * W
    const y = rp() * H
    const a = ((rp() < 0.5 ? 35 : -35) + (rp() - 0.5) * 24) * DEG
    const len = 8 + rp() * 14
    micro += `M${r2(x)} ${r2(y)}l${r2(Math.cos(a) * len)} ${r2(Math.sin(a) * len)}`
  }
  b += path(
    micro,
    stroke(shade(base, 0.2), 0.9, { 'stroke-opacity': after ? 0.09 : kind === 1 ? 0.24 : 0.15 })
  )
  // Lỗ chân lông
  let pores = ''
  for (let i = 0; i < 650; i++) {
    const x = rp() * W
    const y = rp() * H
    const q = rp()
    const r = after ? 0.9 + q * 0.7 : 1.1 + q * (kind === 3 ? 1.8 : 1.1)
    pores += `M${r2(x - r)} ${r2(y)}a${r2(r)} ${r2(r * 0.8)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r * 0.8)} 0 1 0 ${r2(-2 * r)} 0`
  }
  b += path(pores, {
    fill: shade(base, 0.32),
    'fill-opacity': after ? 0.2 : kind === 3 ? 0.42 : 0.3,
  })
  if (kind === 1 && !after) {
    // Da khô: mảng xám nhạt, rạn mảnh trắng và vảy bong vùng giữa
    const region = maskOf(
      ellipse(320, 300, 250, 190, {
        fill: rad([
          [0, '#FFFFFF'],
          [0.6, '#FFFFFF', 0.85],
          [1, '#FFFFFF', 0],
        ]),
      })
    )
    let dry = ellipse(320, 300, 220, 160, {
      fill: '#EFE4DA',
      'fill-opacity': 0.4,
      filter: blur(30),
    })
    let cracks = ''
    for (let i = 0; i < 300; i++) {
      const a0 = rnd() * Math.PI * 2
      const rr = Math.sqrt(rnd())
      const x = 320 + Math.cos(a0) * rr * 220
      const y = 300 + Math.sin(a0) * rr * 160
      const a = ((rnd() < 0.5 ? 40 : -40) + (rnd() - 0.5) * 30) * DEG
      const len = 10 + rnd() * 14
      cracks += `M${r2(x)} ${r2(y)}l${r2(Math.cos(a) * len)} ${r2(Math.sin(a) * len)}`
    }
    dry += path(cracks, stroke('#FFF6EE', 1.1, { 'stroke-opacity': 0.45 }))
    let flakes = ''
    for (let i = 0; i < 60; i++) {
      const a0 = rnd() * Math.PI * 2
      const rr = Math.sqrt(rnd())
      const x = 320 + Math.cos(a0) * rr * 190
      const y = 300 + Math.sin(a0) * rr * 135
      const s = 3.5 + rnd() * 5
      let d = ''
      for (let j = 0; j < 6; j++) {
        const t = (j / 6) * Math.PI * 2
        const q = s * (0.55 + rnd() * 0.55)
        d += `${j ? 'L' : 'M'}${r2(Math.cos(t) * q)} ${r2(Math.sin(t) * q * 0.7)}`
      }
      flakes += put(
        x,
        y,
        rnd() * 180,
        1,
        path(d + 'Z', {
          fill: shade(base, 0.25),
          'fill-opacity': 0.25,
          transform: 'translate(1.2 1.6)',
        }) +
          path(d + 'Z', {
            fill: tint(base, 0.55),
            'fill-opacity': 0.85,
            stroke: '#FFFFFF',
            'stroke-opacity': 0.5,
            'stroke-width': 0.8,
          })
      )
    }
    dry += g({ filter: blur(0.4) }, flakes)
    b += g({ mask: region }, dry)
    b += rect(0, 0, W, H, { fill: '#9C8E84', 'fill-opacity': 0.08 })
  }
  if (kind === 2) {
    const patches = [
      [250, 300, 150, 100, 0.5],
      [390, 220, 110, 80, 0.42],
      [180, 430, 120, 80, 0.38],
      [420, 420, 130, 90, 0.34],
      [300, 150, 90, 60, 0.3],
    ]
    b += patches
      .map(([x, y, rx, ry, op]) =>
        ellipse(x, y, rx, ry, {
          fill: '#DE5F68',
          'fill-opacity': after ? op * 0.12 : op,
          filter: blur(34),
        })
      )
      .join('')
    if (!after) {
      let caps = ''
      for (let i = 0; i < 8; i++) {
        const x = 170 + rnd() * 280
        const y = 170 + rnd() * 280
        caps += `M${r2(x)} ${r2(y)}q${r2(12 + rnd() * 10)} ${r2(-8 + rnd() * 16)} ${r2(26 + rnd() * 16)} ${r2(-4 + rnd() * 8)}t${r2(18 + rnd() * 10)} ${r2(-6 + rnd() * 12)}`
      }
      b += path(caps, stroke('#C23A4C', 1.1, { 'stroke-opacity': 0.2, filter: blur(0.5) }))
      for (let i = 0; i < 16; i++)
        b += circle(170 + rnd() * 280, 170 + rnd() * 280, 2.2 + rnd() * 2.5, {
          fill: '#D2505C',
          'fill-opacity': 0.3,
          filter: blur(1.4),
        })
    }
  }
  if (kind === 3 && !after) {
    // Da sần: nốt nhỏ nổi gồ tập trung giữa ảnh, vài vùng xỉn màu
    let bumps = ''
    for (let i = 0; i < 320; i++) {
      const a0 = rnd() * Math.PI * 2
      const rr = rnd() ** 0.7
      const x = 300 + Math.cos(a0) * rr * 270
      const y = 310 + Math.sin(a0) * rr * 240
      const r = 2.5 + rnd() * 3
      bumps +=
        circle(x + r * 0.35, y + r * 0.45, r * 1.1, {
          fill: shade(base, 0.25),
          'fill-opacity': 0.3,
        }) +
        circle(x, y, r, { fill: tint(base, 0.05) }) +
        circle(x - r * 0.3, y - r * 0.35, r * 0.4, { fill: '#FFFFFF', 'fill-opacity': 0.22 })
    }
    b += g({ filter: blur(1.3) }, bumps)
    b += ellipse(380, 360, 140, 100, { fill: '#8E7458', 'fill-opacity': 0.12, filter: blur(40) })
    b += ellipse(200, 260, 100, 80, { fill: '#8E7458', 'fill-opacity': 0.1, filter: blur(36) })
  }
  if (after) {
    // Da ẩm mịn: vùng bóng khỏe dịu
    b += ellipse(240, 210, 170, 90, {
      fill: '#FFFFFF',
      'fill-opacity': 0.3,
      filter: blur(40),
      transform: 'rotate(-18 240 210)',
    })
    b += ellipse(214, 196, 64, 22, {
      fill: '#FFFFFF',
      'fill-opacity': 0.32,
      filter: blur(14),
      transform: 'rotate(-18 214 196)',
    })
    b += ellipse(420, 400, 90, 40, { fill: '#FFFFFF', 'fill-opacity': 0.14, filter: blur(26) })
    b += ellipse(330, 330, 300, 260, { fill: '#F4A58E', 'fill-opacity': 0.08, filter: blur(60) })
  }
  b += vignette(W, H, '#5A3A28', 0.22)
  return svgDoc(W, H, b)
}

// ============================================================ Avatar minh họa (160×160)
const mirrorX = (d) => {
  let i = 0
  return d.replace(/-?\d*\.?\d+|[A-Za-z]/g, (t) =>
    /[A-Za-z]/.test(t) ? t : i++ % 2 === 0 ? String(r2(160 - Number(t))) : t
  )
}
const HAIR = {
  long: {
    back: 'M50 72C48 44 62 32 80 32C98 32 112 44 110 72L114 136Q80 146 46 136Z',
    front: (() => {
      const l = 'M80 38C64 38 53 50 52 72L50 136Q57 140 64 136L62 96C60 76 64 58 80 46Z'
      return l + mirrorX(l)
    })(),
  },
  bob: {
    back: 'M50 74C48 46 62 34 80 34C98 34 112 46 110 74L112 104Q80 112 48 104Z',
    front:
      'M53 84C50 50 64 37 80 37C96 37 110 50 107 84L104 104Q100 106 98 100L101 64Q80 68 59 64L62 100Q60 106 56 104Z',
  },
  bun: {
    back: 'M64 34C64 18 96 18 96 34C96 48 64 48 64 34Z',
    front: 'M54 76C51 50 64 40 80 40C96 40 109 50 106 76C103 62 94 54 80 54C66 54 57 62 54 76Z',
    ears: true,
  },
  ponytail: {
    back: 'M100 44C128 46 132 92 120 132C116 110 110 86 98 64Z',
    front: 'M54 78C50 48 64 38 82 38C98 38 110 50 106 76C104 64 98 56 90 54C80 62 66 64 56 66Z',
    ears: true,
  },
  wavy: {
    back: 'M48 72C46 42 62 32 80 32C98 32 114 42 112 72Q118 86 112 98Q118 112 112 124Q116 134 108 140L52 140Q44 134 48 124Q42 112 48 98Q42 86 48 72Z',
    front:
      'M72 38C60 40 52 52 52 72Q48 86 54 98L60 96C58 80 60 60 74 46ZM72 38C92 34 110 46 108 72Q114 88 106 100L100 98C102 80 100 62 92 54C86 58 78 56 72 46Z',
  },
  pixie: {
    back: 'M54 70C52 46 64 36 80 36C96 36 108 46 106 70Z',
    front:
      'M53 80C49 46 64 34 82 34C100 34 112 48 107 80L104 66C98 56 88 54 78 58C70 62 60 62 55 66Z',
    ears: true,
  },
  sidepart: {
    back: 'M50 72C48 44 62 32 80 32C98 32 112 44 110 72L114 136Q80 146 46 136Z',
    front:
      'M68 38C58 40 52 52 52 72L50 136Q57 140 64 136L62 96C60 76 62 58 70 46ZM68 38C90 34 110 46 108 72L110 136Q103 140 96 136L98 96C100 76 96 60 88 54C80 58 72 54 68 46Z',
  },
  lowbun: {
    back: 'M90 96C90 82 116 82 116 96C116 110 90 110 90 96Z',
    front: 'M54 76C51 50 64 40 80 40C96 40 109 50 106 76C103 62 94 54 80 54C66 54 57 62 54 76Z',
    ears: true,
    band: true,
  },
}
// [kiểu tóc, màu tóc, màu da, nền, áo, mắt, phụ kiện, cổ áo]
const AVATARS = [
  ['long', '#2A2122', '#F3D3BC', '#DDF0EA', '#0F766E', 'open', 'none', 'round'],
  ['bob', '#3A2A24', '#EBC4A6', '#F6E7D8', '#C77B5E', 'closed', 'none', 'v'],
  ['bun', '#1E1A1C', '#F5D7C0', '#E8E4F3', '#7E6BB0', 'open', 'earring', 'round'],
  ['wavy', '#5A3A2A', '#E3B48F', '#FBE3E4', '#D9727E', 'open', 'none', 'v'],
  ['ponytail', '#2E2321', '#EEC6A8', '#E2EEF8', '#3E6E9E', 'closed', 'earring', 'collar'],
  ['sidepart', '#3B2A35', '#F3D3BC', '#EEF3DA', '#6E9A4E', 'open', 'glasses', 'round'],
  ['pixie', '#2A2122', '#D7A07A', '#F7EBCB', '#C9963A', 'open', 'earring', 'turtle'],
  ['lowbun', '#4A3226', '#EBC4A6', '#DDF0EA', '#E3D7C3', 'closed', 'earring', 'v'],
  ['long', '#6B4430', '#F5D7C0', '#FBE3E4', '#B65A6A', 'open', 'none', 'round'],
  ['bob', '#1E1A1C', '#E3B48F', '#E2EEF8', '#2F5D7A', 'open', 'glasses', 'collar'],
  ['wavy', '#2E2321', '#F3D3BC', '#F6E7D8', '#0F766E', 'closed', 'none', 'round'],
  ['bun', '#5A3A2A', '#EEC6A8', '#EEF3DA', '#8E6BA8', 'open', 'earring', 'v'],
  ['sidepart', '#2A2122', '#D7A07A', '#E8E4F3', '#C77B5E', 'open', 'none', 'turtle'],
  ['ponytail', '#4A3226', '#F5D7C0', '#DDF0EA', '#4E8A6A', 'open', 'earring', 'round'],
  ['long', '#1E1A1C', '#EBC4A6', '#F7EBCB', '#3E6E9E', 'closed', 'none', 'collar'],
  ['pixie', '#6B4430', '#F3D3BC', '#FBE3E4', '#5B7F5A', 'open', 'glasses', 'round'],
  ['lowbun', '#2E2321', '#E3B48F', '#E2EEF8', '#D9727E', 'open', 'earring', 'round'],
  ['wavy', '#3B2A35', '#EEC6A8', '#EEF3DA', '#C9963A', 'open', 'none', 'v'],
  ['bob', '#5A3A2A', '#F5D7C0', '#DDF0EA', '#7E6BB0', 'closed', 'none', 'turtle'],
  ['long', '#2A2122', '#D7A07A', '#F6E7D8', '#0F766E', 'open', 'earring', 'v'],
]
function avatar(W, H, idx) {
  resetDefs('#000000')
  const [style, hair, skin, bgc, cloth, eyes, acc, neck] = AVATARS[idx]
  const st = HAIR[style]
  const ink = '#2B2220'
  let b = rect(0, 0, W, H, { fill: bgc })
  b += circle(128, 30, 22, { fill: '#FFFFFF', 'fill-opacity': 0.35 })
  b += path(st.back, { fill: hair })
  // Cổ và vai
  b += rect(70, 92, 20, 30, { rx: 8, fill: shade(skin, 0.08) })
  b += path('M16 160C16 128 44 114 80 114C116 114 144 128 144 160Z', { fill: cloth })
  if (neck === 'v') b += path('M66 115L80 136L94 115Z', { fill: shade(skin, 0.04) })
  if (neck === 'round') b += path('M66 115Q80 128 94 115Z', { fill: shade(skin, 0.04) })
  if (neck === 'collar')
    b +=
      path('M66 115Q80 126 94 115Z', { fill: shade(skin, 0.04) }) +
      path('M64 114L80 128L70 136L58 118Z', { fill: '#FFFFFF' }) +
      path('M96 114L80 128L90 136L102 118Z', { fill: '#FFFFFF' })
  if (neck === 'turtle') b += rect(66, 104, 28, 18, { rx: 7, fill: shade(cloth, 0.12) })
  b += path(
    'M30 160C34 140 46 132 58 128',
    stroke(shade(cloth, 0.15), 2, { 'stroke-opacity': 0.5 })
  )
  // Đầu
  if (st.ears)
    b +=
      ellipse(55, 78, 4.5, 6.5, { fill: shade(skin, 0.05) }) +
      ellipse(105, 78, 4.5, 6.5, { fill: shade(skin, 0.05) })
  b += ellipse(80, 72, 25, 29, { fill: skin })
  // Mặt (giản lược)
  const brow = stroke(hair, 1.8, { 'stroke-opacity': 0.75 })
  b += path('M64 69Q69 66 74 68M86 68Q91 66 96 69', brow)
  if (eyes === 'open')
    b += ellipse(69.5, 77, 2.3, 2.8, { fill: ink }) + ellipse(90.5, 77, 2.3, 2.8, { fill: ink })
  else b += path('M65.5 77Q69.5 80.5 73.5 77M86.5 77Q90.5 80.5 94.5 77', stroke(ink, 1.8))
  b += path('M80 80Q78 85 81 86', stroke(shade(skin, 0.22), 1.4))
  b += path('M74.5 91Q80 95.5 85.5 91', stroke('#B4505A', 2))
  b +=
    ellipse(64, 87, 5, 3, { fill: '#F08C8C', 'fill-opacity': 0.32 }) +
    ellipse(96, 87, 5, 3, { fill: '#F08C8C', 'fill-opacity': 0.32 })
  b += path(st.front, { fill: hair })
  b += path('M64 46Q74 40 86 41', stroke(tint(hair, 0.3), 2.4, { 'stroke-opacity': 0.55 }))
  if (st.band) b += path('M55 66C58 46 102 46 105 66', stroke('#E8B04A', 5))
  if (acc === 'earring' && st.ears)
    b += circle(55, 88, 2.6, { fill: '#E1B65A' }) + circle(105, 88, 2.6, { fill: '#E1B65A' })
  if (acc === 'glasses')
    b +=
      circle(69.5, 77, 8, stroke('#3A3A3A', 1.6)) +
      circle(90.5, 77, 8, stroke('#3A3A3A', 1.6)) +
      path('M77.5 76Q80 74.5 82.5 76', stroke('#3A3A3A', 1.6))
  return svgDoc(W, H, b)
}

// ============================================================ Ảnh khách gửi (600×600, không mặt người)
const marble = (rnd, x, y, w, h, base) => {
  let s = rect(x, y, w, h, { fill: base })
  let v = ''
  for (let i = 0; i < 7; i++) {
    let px = x + rnd() * w
    let py = y + rnd() * h * 0.3
    v += `M${r2(px)} ${r2(py)}`
    for (let j = 0; j < 4; j++) {
      px += 40 + rnd() * 70
      py += 20 + rnd() * 40
      v += `Q${r2(px - 30 + rnd() * 20)} ${r2(py - 30 + rnd() * 20)} ${r2(px)} ${r2(py)}`
    }
  }
  s += path(v, stroke('#B9B2A8', 1.2, { 'stroke-opacity': 0.22 }))
  return s
}
// 01: bàn trang điểm, gương tròn, chậu rau má nhỏ, bông tẩy trang
function photo01(W, H) {
  resetDefs('#5B4636')
  const rnd = mulberry32(hashStr('anh-01'))
  let b = bg(W, H, '#F7EEE6', '#EEDFD1')
  b += circle(150, 170, 168, { fill: '#D9BF8E' })
  b += circle(150, 170, 156, {
    fill: lin(
      [
        [0, '#EEF3F3'],
        [1, '#D7E1E3'],
      ],
      0,
      0,
      1,
      1
    ),
  })
  b += g(
    { 'clip-path': clipOf(circle(150, 170, 156)) },
    path(
      'M40 200L200 20M80 260L250 60M150 300L300 120',
      stroke('#FFFFFF', 22, { 'stroke-opacity': 0.4 })
    )
  )
  b += rect(0, 392, W, 4, { fill: '#000000', 'fill-opacity': 0.08 })
  b += marble(rnd, 0, 396, W, 204, '#F5F0EA')
  b += rect(0, 396, W, 30, {
    fill: vlin([
      [0, '#000000', 0.08],
      [1, '#000000', 0],
    ]),
  })
  // khay vàng
  b += softShadow(300, 506, 150, 26, 0.25, 10)
  b += ellipse(300, 500, 150, 34, { fill: '#E8DCC6', stroke: '#C9A766', 'stroke-width': 4 })
  b += ellipse(300, 498, 136, 28, { fill: '#F1E8D8' })
  b += put(300, 506, 0, 1, serumBottle(340))
  // bông tẩy trang
  for (let i = 0; i < 4; i++)
    b += ellipse(104, 520 - i * 9, 46, 13, {
      fill: i === 3 ? '#FFFFFF' : '#F4F1EC',
      stroke: '#E2DBD0',
      'stroke-width': 1.5,
    })
  // chậu rau má
  b += leafGroup(
    leafAt(488, 400, -30, 34, 60, { color: LEAF }) +
      leafAt(492, 400, 18, 38, 74, { color: LEAF_D }) +
      leafAt(486, 400, 52, 28, 46, { color: LEAF_L }) +
      leafAt(490, 400, -64, 26, 40, { color: LEAF_L })
  )
  b += softShadow(492, 474, 56, 12, 0.3, 8)
  b += path('M446 404L538 404L528 470Q492 480 456 470Z', {
    fill: lin([
      [0, '#C77A57'],
      [0.4, '#E3A07E'],
      [1, '#B4684A'],
    ]),
  })
  b += rect(440, 398, 104, 14, { rx: 4, fill: '#D88E6B' })
  b += vignette(W, H)
  return svgDoc(W, H, b)
}
// Bàn tay mở nhìn từ trên xuống (lòng bàn tay hướng lên, các ngón hướng -y); gốc tọa độ ở giữa lòng bàn tay
function openHand(skin) {
  const edge = shade(skin, 0.16)
  const palm =
    'M-84 -64Q-90 -108 -40 -110L50 -108Q92 -104 86 -58L80 58Q70 110 0 112Q-74 110 -82 58Z'
  let s = ''
  // cổ tay và tay áo
  s += path('M-72 60L-80 440L82 440L76 60Z', { fill: skin, stroke: edge, 'stroke-width': 3 })
  s += path('M-92 236L-98 450L98 450L92 236Z', { fill: '#ECE4D6' })
  s += path('M-94 240L94 240', stroke('#D6CAB6', 14))
  s += path(palm, { fill: skin, stroke: edge, 'stroke-width': 6 })
  const finger = (len, w) =>
    path(D`M0 0L0 ${-len}`, stroke(edge, w + 5)) +
    path(D`M0 0L0 ${-len}`, stroke(skin, w)) +
    ellipse(0, -len + w * 0.1, w * 0.3, w * 0.34, { fill: tint(skin, 0.3), 'fill-opacity': 0.7 }) +
    path(
      D`M${-w * 0.3} ${-len * 0.42}Q0 ${-len * 0.38} ${w * 0.3} ${-len * 0.42}M${-w * 0.28} ${-len * 0.72}Q0 ${-len * 0.68} ${w * 0.28} ${-len * 0.72}`,
      stroke(edge, 2, { 'stroke-opacity': 0.55 })
    )
  const F = [
    [-57, -88, -8, 112, 36],
    [-20, -100, -2, 134, 38],
    [18, -98, 3, 128, 37],
    [54, -84, 9, 100, 33],
  ]
  for (const [x, y, a, len, w] of F) s += put(x, y, a, 1, finger(len, w))
  s += put(-78, 34, -60, 1, finger(104, 42))
  s += path(palm, { fill: skin })
  s += ellipse(-46, 40, 46, 58, { fill: shade(skin, 0.06), 'fill-opacity': 0.5, filter: blur(10) })
  s += path(
    'M-74 -34Q-20 -52 52 -58M-62 0Q0 -14 64 -10M-30 100Q-52 40 -24 -20',
    stroke(edge, 2.6, { 'stroke-opacity': 0.45 })
  )
  return s
}
function photo02(W, H) {
  resetDefs('#2F4B3D')
  let b = bg(W, H, '#EEF4EE', '#DCE9E1')
  const bokeh = [
    [80, 90, 70, '#B8D8B3', 0.55],
    [520, 110, 90, '#FFFFFF', 0.5],
    [500, 330, 50, '#C8E2C4', 0.55],
    [90, 400, 80, '#FFFFFF', 0.45],
    [300, 50, 40, '#A9D0A4', 0.4],
  ]
  b += bokeh
    .map(([x, y, r, c, op]) => circle(x, y, r, { fill: c, 'fill-opacity': op, filter: blur(18) }))
    .join('')
  b += g(
    { transform: at(338, 360, -22, 1.1), filter: dropShadow(6, 12, 14, '#2F4B3D', 0.22) },
    openHand(SKIN_HAND)
  )
  b += g(
    { filter: dropShadow(8, 14, 10, '#4A3020', 0.3) },
    put(392, 452, -44, 1, serumBottle(330, { shadow: false }))
  )
  b += leafGroup(
    leafAt(70, 610, 32, 56, 50, { color: LEAF_L }) + leafAt(30, 590, 64, 40, 30, { color: LEAF }),
    0.1
  )
  b += vignette(W, H, '#2F4B3D', 0.16)
  return svgDoc(W, H, b)
}
// 03: hộp vừa mở, chai đứng trong hộp, nắp lật teal phía sau, giấy lót
function photo03(W, H) {
  resetDefs('#5B4636')
  let b = bg(W, H, '#EFE8DE', '#E4DACB')
  b += path('M0 420Q300 380 600 430L600 600L0 600Z', { fill: '#E9E0D2' })
  b += path('M0 470Q200 450 600 500', stroke('#D9CEBD', 3, { 'stroke-opacity': 0.6 }))
  // nắp hộp lật ra sau
  b += path('M214 354L474 354L462 170L204 170Z', { fill: shade(TEAL, 0.05) })
  b += path('M226 350L462 350L452 182L216 182Z', { fill: TEAL })
  b += put(339, 270, 0, 1, rauMaLeaf(26, { color: tint(TEAL, 0.18), flat: true, vein: TEAL }))
  // giấy lót
  const tissue =
    'M166 410Q170 372 196 378Q206 350 232 362Q250 352 262 372L262 410ZM372 410L372 372Q384 350 408 360Q428 340 450 362Q474 356 486 404Z'
  b += carton(160, 548, 266, 148, 60, -42, {
    front: IVORY,
    top: '#E9DFCB',
    side: '#E3D7BF',
    open: true,
    inside: path('M160 400L426 400L486 358L220 358Z', { fill: '#DCCFB6' }),
    mid:
      put(316, 436, 0, 1, serumBottle(330)) +
      path(tissue, { fill: '#F7E6DF', stroke: '#EBD2C9', 'stroke-width': 2 }) +
      path('M196 396Q210 380 230 376M410 392Q426 374 446 372', stroke('#EBD2C9', 2)),
    decor: productBoxDecor,
    sideDecor: productSideDecor,
  })
  b += leafGroup(
    leafAt(520, 560, 40, 46, 50, { color: LEAF }) + leafAt(84, 576, -36, 40, 44, { color: LEAF_L })
  )
  b += vignette(W, H)
  return svgDoc(W, H, b)
}
// 04: chụp từ trên xuống, chai nằm trên khăn, lá và giọt serum
function photo04(W, H) {
  resetDefs('#3F4A3C')
  let b = bg(W, H, '#F4EFE7', '#EDE5D8')
  let weave = ''
  for (let y = 12; y < H; y += 12) weave += `M0 ${y}H${W}`
  b += path(weave, stroke('#E3D9CA', 1, { 'stroke-opacity': 0.6 }))
  b += g(
    { transform: 'rotate(-14 300 300)', filter: dropShadow(4, 8, 10, '#3F4A3C', 0.15) },
    rect(110, 120, 420, 380, { rx: 18, fill: '#CFE0CC' }) +
      rect(110, 420, 420, 26, { fill: '#B9D2B5' }) +
      rect(110, 456, 420, 8, { fill: '#B9D2B5' }) +
      path(
        range(26)
          .map((i) => `M${126 + i * 16} 500v14`)
          .join(''),
        stroke('#BFD5BB', 3)
      )
  )
  b += g(
    { filter: dropShadow(10, 14, 10, '#3F4A3C', 0.25) },
    put(440, 392, -58, 1, serumBottle(330, { shadow: false }))
  )
  b += leafGroup(
    leafAt(100, 500, 48, 56, 60, { color: LEAF }) +
      leafAt(520, 150, -140, 50, 50, { color: LEAF_D }) +
      leafAt(560, 540, -34, 44, 40, { color: LEAF_L })
  )
  b += put(214, 420, 0, 1, bead(10)) + put(240, 440, 0, 1, bead(6)) + put(470, 260, 0, 1, bead(7))
  b += vignette(W, H, '#3F4A3C', 0.15)
  return svgDoc(W, H, b)
}
// 05: thùng giao hàng mở nắp, màng xốp hơi, hộp sản phẩm có tem niêm phong
function photo05(W, H) {
  resetDefs('#5B4636')
  const kraft = '#C9A27A'
  let b = bg(W, H, '#ECE6DC', '#E1D8C9')
  // nắp thùng mở
  b += path('M100 360L40 250L200 236L240 330Z', { fill: shade(kraft, 0.06) })
  b += path('M440 330L520 222L586 300L500 362Z', { fill: shade(kraft, 0.1) })
  b += path('M170 330L200 180L470 180L440 330Z', { fill: tint(kraft, 0.08) })
  // màng xốp hơi và hộp sản phẩm
  let bubbles = ''
  for (let y = 300; y < 400; y += 18)
    for (let x = 110 + ((y / 18) % 2) * 9; x < 480; x += 18)
      bubbles += circle(x, y, 6, {
        fill: '#FFFFFF',
        'fill-opacity': 0.5,
        stroke: '#FFFFFF',
        'stroke-opacity': 0.8,
        'stroke-width': 1,
      })
  const product = carton(236, 410, 120, 190, 34, -24, {
    front: IVORY,
    top: '#F4ECDC',
    side: '#E3D7BF',
    decor: (x, y, w, h) =>
      productBoxDecor(x, y, w, h) +
      circle(x + w * 0.8, y - h * 0.86, 13, { fill: '#D4AF5A' }) +
      circle(x + w * 0.8, y - h * 0.86, 10, { ...stroke('#F6E7BF', 1.5) }) +
      path(D`M${x + w * 0.8 - 5} ${y - h * 0.86}l3.5 3.5l6 -7`, stroke('#FFFFFF', 2.4)),
  })
  b += carton(100, 560, 340, 200, 70, -46, {
    front: kraft,
    top: kraft,
    side: shade(kraft, 0.14),
    open: true,
    inside: path('M100 360L440 360L510 314L170 314Z', { fill: shade(kraft, 0.32) }),
    mid:
      path('M108 372Q200 330 300 352T500 330L500 400L108 400Z', {
        fill: '#E9F1F2',
        'fill-opacity': 0.85,
      }) +
      bubbles +
      product,
    decor: (x, y, w) =>
      rect(x + w * 0.38, y - 200, w * 0.24, 200, { fill: '#B48B60', 'fill-opacity': 0.55 }) +
      rect(x + 30, y - 70, 90, 46, { rx: 4, fill: '#FFFFFF', 'fill-opacity': 0.85 }) +
      path(
        `M${x + 40} ${y - 56}h60M${x + 40} ${y - 44}h44M${x + 40} ${y - 34}h52`,
        stroke('#B0A491', 3)
      ),
  })
  b += vignette(W, H)
  return svgDoc(W, H, b)
}
// 06: kệ phòng tắm, gạch thẻ, khăn cuộn, chai, tuýp, chậu cây
function photo06(W, H) {
  resetDefs('#3E4E4A')
  let b = rect(0, 0, W, H, { fill: '#EEF4F2' })
  let tiles = ''
  for (let y = 0; y < H; y += 44) {
    tiles += `M0 ${y}H${W}`
    const off = (y / 44) % 2 ? 44 : 0
    for (let x = off; x < W; x += 88) tiles += `M${x} ${y}V${y + 44}`
  }
  b += path(tiles, stroke('#D7E3DF', 2))
  b += rect(0, 0, W, H, {
    fill: lin(
      [
        [0, '#FFFFFF', 0.35],
        [0.6, '#FFFFFF', 0],
        [1, '#000000', 0.05],
      ],
      0,
      0,
      1,
      1
    ),
  })
  // kệ gỗ
  b += softShadow(300, 476, 300, 16, 0.3, 10)
  b += rect(20, 444, 560, 26, {
    rx: 4,
    fill: vlin([
      [0, '#D8B48A'],
      [1, '#B98D5E'],
    ]),
  })
  b += rect(20, 444, 560, 5, { fill: '#E6C9A4' })
  b += path('M80 470L80 520L110 470ZM520 470L520 520L490 470Z', { fill: '#A87C4E' })
  // khăn cuộn
  // khăn gấp
  b += softShadow(112, 444, 84, 8, 0.3, 6)
  b += rect(36, 404, 152, 40, { rx: 14, fill: '#CFE0CC' })
  b += rect(36, 404, 152, 10, { rx: 5, fill: '#DDEADB' })
  b += path('M40 432H184', stroke('#BCD3B8', 2))
  b += rect(46, 366, 134, 38, { rx: 14, fill: '#F2EADF' })
  b += rect(46, 366, 134, 9, { rx: 4.5, fill: '#F8F4EE' })
  b += path('M50 392H176', stroke('#E2D6C4', 2))
  b += put(290, 452, 0, 1, serumBottle(290))
  b += put(404, 452, 0, 1, cleanserTube(230))
  // chậu cây
  b += leafGroup(
    leafAt(520, 382, -24, 30, 60, { color: LEAF }) +
      leafAt(524, 382, 24, 32, 70, { color: LEAF_D }) +
      leafAt(520, 382, 60, 24, 40, { color: LEAF_L })
  )
  b += path('M484 384L556 384L548 444L492 444Z', {
    fill: '#F5F2EC',
    stroke: '#DDD6CA',
    'stroke-width': 2,
  })
  b += vignette(W, H, '#3E4E4A', 0.14)
  return svgDoc(W, H, b)
}
// 07: kết cấu serum trên đĩa kính, ống nhỏ giọt, chai phía sau
function photo07(W, H) {
  resetDefs('#3E4E4A')
  let b = bg(W, H, '#EDF3F0', '#E2ECE8')
  b += marble(mulberry32(hashStr('anh-07')), 0, 360, W, 240, '#F3F1EC')
  b += rect(0, 356, W, 8, { fill: '#000000', 'fill-opacity': 0.05 })
  b += leafGroup(
    leafAt(84, 392, -28, 44, 70, { color: LEAF }) + leafAt(96, 392, 22, 36, 56, { color: LEAF_L })
  )
  b += put(190, 396, 0, 1, serumBottle(300))
  b += put(486, 392, 0, 1, cleanserTube(220))
  // đĩa kính
  b += softShadow(360, 492, 176, 34, 0.18, 10)
  b += ellipse(360, 482, 190, 56, {
    fill: '#FFFFFF',
    'fill-opacity': 0.6,
    stroke: '#CFDAD6',
    'stroke-width': 2,
  })
  b += ellipse(360, 478, 170, 46, { fill: '#F7FAF9', stroke: '#E1E9E6', 'stroke-width': 2 })
  // vệt serum trong
  const swatch =
    'M240 474C236 452 280 446 312 454C344 462 372 446 400 458C424 468 420 492 392 498C356 506 328 496 300 502C266 508 244 496 240 474Z'
  b += path(swatch, {
    fill: lin([
      [0, '#F3F9EE', 0.75],
      [1, '#DDEDD3', 0.75],
    ]),
    stroke: '#E4F0DC',
    'stroke-width': 3,
  })
  b += path('M262 468Q296 454 334 462', stroke('#FFFFFF', 5, { 'stroke-opacity': 0.9 }))
  b += path('M352 488Q380 486 398 476', stroke('#FFFFFF', 3, { 'stroke-opacity': 0.7 }))
  b +=
    circle(300, 482, 3, { ...stroke('#FFFFFF', 1.2) }) +
    circle(372, 470, 2.2, { ...stroke('#FFFFFF', 1) })
  b += put(434, 472, 0, 1, bead(8)) + put(226, 500, 0, 1, bead(5)) + put(452, 494, 0, 1, bead(4))
  b += g(
    { filter: dropShadow(4, 8, 6, '#3E4E4A', 0.2) },
    put(400, 520, 74, 1, pipette(196, '#DCEBD2'))
  )
  b += vignette(W, H, '#3E4E4A', 0.14)
  return svgDoc(W, H, b)
}
// 08: combo 2 tặng 1 trên ga giường: hộp có ruy băng, 2 chai, tuýp quà tặng
function photo08(W, H) {
  resetDefs('#5B4636')
  let b = bg(W, H, '#F6F1EA', '#ECE3D6')
  const fold = { filter: blur(8) }
  b += path('M0 140Q200 100 360 170T600 150', {
    ...stroke('#E2D6C5', 26, { 'stroke-opacity': 0.6 }),
    ...fold,
  })
  b += path('M0 300Q180 260 300 320T600 290', {
    ...stroke('#FFFFFF', 22, { 'stroke-opacity': 0.5 }),
    ...fold,
  })
  b += path('M-20 520Q200 470 360 540T620 500', {
    ...stroke('#E2D6C5', 30, { 'stroke-opacity': 0.5 }),
    ...fold,
  })
  b += carton(84, 400, 200, 170, 54, -38, {
    front: IVORY,
    top: '#F4ECDC',
    side: '#E3D7BF',
    decor: (x, y, w, h) =>
      productBoxDecor(x, y, w, h) + rect(x + w * 0.44, y - h, w * 0.12, h, { fill: '#D9867A' }),
    sideDecor: (x, y, w, h) => rect(x + w, y - h * 0.5, 80, h * 0.2, { fill: shade(TEAL, 0.2) }),
  })
  b += path('M172 230L196 230L250 192L226 192Z', { fill: '#D9867A' })
  b += put(211, 212, 0, 1, bow(24, '#D9867A'))
  b += put(292, 520, 0, 1, serumBottle(300))
  b += put(398, 532, 0, 1, serumBottle(300))
  b += put(500, 534, 0, 1, cleanserTube(230))
  b += leafGroup(
    leafAt(70, 600, -20, 54, 50, { color: LEAF }) + leafAt(574, 470, 30, 40, 40, { color: LEAF_L })
  )
  b += vignette(W, H)
  return svgDoc(W, H, b)
}

// ============================================================ Ảnh OG (1200×630)
function ogImage(W, H) {
  resetDefs('#062F2C')
  let b = rect(0, 0, W, H, {
    fill: lin(
      [
        [0, '#12857C'],
        [0.55, TEAL],
        [1, '#0A524C'],
      ],
      0,
      0,
      1,
      1
    ),
  })
  b += circle(920, 300, 300, { fill: '#1C9187', 'fill-opacity': 0.45, filter: blur(30) })
  b += put(40, 690, 20, 1, rauMaLeaf(150, { color: '#1A8A80', flat: true, vein: '#167D74' }))
  b += arch(
    920,
    560,
    380,
    480,
    vlin([
      [0, '#F6F1E6'],
      [1, '#E6DAC4'],
    ])
  )
  b += leafGroup(
    leafAt(800, 560, -40, 90, 110, { color: LEAF }) +
      leafAt(790, 556, -76, 64, 80, { color: LEAF_L }) +
      leafAt(1040, 560, 40, 96, 116, { color: LEAF_D }) +
      leafAt(1050, 556, 76, 66, 80, { color: LEAF }),
    0.25
  )
  b += podium(920, 556, 230, 70, '#F4EDE0')
  b += put(920, 562, 0, 1, serumBottle(400))
  b += put(1090, 250, 0, 1, teardrop(12)) + put(745, 360, 0, 1, teardrop(9))
  // Chữ
  b += rect(96, 112, 54, 54, { rx: 13, fill: IVORY })
  b += put(123, 152, 0, 1, rauMaLeaf(16, { color: TEAL, flat: true, vein: IVORY }))
  b += text(166, 152, 'Diệp Lam', { 'font-family': SERIF, 'font-size': 38, fill: IVORY })
  b += rect(98, 214, 64, 3, { fill: GOLD })
  b += text(94, 300, 'Serum Rau Má', { 'font-family': SERIF, 'font-size': 80, fill: '#FFFFFF' })
  b += text(94, 388, 'Phục Hồi', { 'font-family': SERIF, 'font-size': 80, fill: '#CDEBC4' })
  b += text(98, 450, 'Mỹ phẩm thảo mộc Việt, dịu nhẹ', {
    'font-family': SANS,
    'font-size': 26,
    fill: '#D3EDE7',
  })
  b += text(98, 486, 'cho làn da nhạy cảm', {
    'font-family': SANS,
    'font-size': 26,
    fill: '#D3EDE7',
  })
  b += rect(98, 522, 170, 44, { rx: 22, fill: 'none', stroke: '#CDEBC4', 'stroke-width': 2 })
  b += text(183, 551, 'Chai 30 ml', {
    'font-family': SANS,
    'font-size': 20,
    'font-weight': 600,
    'text-anchor': 'middle',
    fill: '#CDEBC4',
  })
  return svgDoc(W, H, b)
}

// ============================================================ Logo (SVG viết tay, không qua sharp)
function logoLeafPath(cx, cy, R) {
  // Lá rau má phẳng cho logo kèm cuống cong, gốc cuống tại (cx, cy), nghiêng nhẹ cho mềm mại
  resetDefs('#000000')
  return g(
    { transform: at(cx, cy, -14) },
    path(D`M0 0Q${R * 0.25} ${R * 0.6} ${-R * 0.1} ${R * 1.05}`, stroke('#FFFFFF', R * 0.17)) +
      rauMaLeaf(R, { color: '#FFFFFF', flat: true, vein: TEAL, veinW: 1.3, notch: 36, lobes: 11 })
  )
}
function logoMark() {
  const leaf = logoLeafPath(32, 39, 15.5)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Diệp Lam">
  <rect width="64" height="64" rx="14" fill="${TEAL}"/>
  ${leaf}
</svg>
`
}
function logoFull() {
  const leaf = logoLeafPath(32, 39, 15.5)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 64" role="img" aria-label="Diệp Lam">
  <rect width="64" height="64" rx="14" fill="${TEAL}"/>
  ${leaf}
  <text x="78" y="43" font-family="${esc(SERIF)}" font-size="33" fill="${TEAL_D}">Diệp Lam</text>
</svg>
`
}

// ============================================================ Danh sách ảnh và xuất
const pad2 = (n) => String(n).padStart(2, '0')
const JOBS = [
  { file: 'seed/product/serum-rau-ma-30ml.webp', w: 800, h: 800, max: 60 * KB, draw: productShot },
  { file: 'seed/product/hero.webp', w: 1080, h: 1080, max: 150 * KB, draw: heroShot },
  {
    file: 'seed/product/sua-rua-mat-rau-ma-100ml.webp',
    w: 600,
    h: 600,
    max: 60 * KB,
    draw: cleanserShot,
  },
  {
    file: 'seed/combos/c01.webp',
    w: 600,
    h: 600,
    max: 60 * KB,
    draw: (w, h) => comboShot(w, h, 1, false),
  },
  {
    file: 'seed/combos/c02.webp',
    w: 600,
    h: 600,
    max: 60 * KB,
    draw: (w, h) => comboShot(w, h, 2, true),
  },
  {
    file: 'seed/combos/c03.webp',
    w: 600,
    h: 600,
    max: 60 * KB,
    draw: (w, h) => comboShot(w, h, 3, true),
  },
  { file: 'seed/landing/thanh-phan-rau-ma.webp', w: 400, h: 400, max: 60 * KB, draw: ingRauMa },
  { file: 'seed/landing/thanh-phan-b5.webp', w: 400, h: 400, max: 60 * KB, draw: ingB5 },
  {
    file: 'seed/landing/thanh-phan-niacinamide.webp',
    w: 400,
    h: 400,
    max: 60 * KB,
    draw: ingNiacinamide,
  },
  { file: 'seed/landing/thanh-phan-ha.webp', w: 400, h: 400, max: 60 * KB, draw: ingHA },
  ...[1, 2, 3].flatMap((k) => [
    {
      file: `seed/landing/truoc-sau-${k}-truoc.webp`,
      w: 600,
      h: 600,
      max: 60 * KB,
      draw: (w, h) => skinShot(w, h, k, false),
    },
    {
      file: `seed/landing/truoc-sau-${k}-sau.webp`,
      w: 600,
      h: 600,
      max: 60 * KB,
      draw: (w, h) => skinShot(w, h, k, true),
    },
  ]),
  ...range(20).map((i) => ({
    file: `seed/reviews/avatar-${pad2(i + 1)}.webp`,
    w: 160,
    h: 160,
    max: 10 * KB,
    draw: (w, h) => avatar(w, h, i),
  })),
  ...[photo01, photo02, photo03, photo04, photo05, photo06, photo07, photo08].map((draw, i) => ({
    file: `seed/reviews/anh-${pad2(i + 1)}.webp`,
    w: 600,
    h: 600,
    max: 60 * KB,
    draw,
  })),
  { file: 'seed/og-landing.jpg', w: 1200, h: 630, max: 60 * KB, draw: ogImage, jpg: true },
]

async function encode(svg, job) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  for (let q = 92; q >= 40; q -= 4) {
    const buf = job.jpg
      ? await sharp(png)
          .flatten({ background: '#FFFFFF' })
          .jpeg({ quality: q, mozjpeg: true })
          .toBuffer()
      : await sharp(png).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer()
    if (buf.length <= job.max) return { buf, q, png }
  }
  throw new Error(`${job.file}: vượt ${job.max / KB} KB ở mọi mức chất lượng`)
}

// Mọi đường dẫn ảnh /seed/..., /logo/... trong file seed phải có file thật trong public/
function checkReferences() {
  const missing = []
  for (const f of ['demo-data.json', 'project.json']) {
    const raw = readFileSync(join(SEED_DIR, f), 'utf8')
    for (const m of raw.matchAll(/"(\/(?:seed|logo)\/[^"]+)"/g))
      if (!existsSync(join(PUBLIC_DIR, m[1]))) missing.push(`${f}: ${m[1]}`)
  }
  if (missing.length) {
    console.error(`Thiếu ${missing.length} ảnh được tham chiếu:\n  ${missing.join('\n  ')}`)
    process.exitCode = 1
  } else console.log('Mọi đường dẫn ảnh trong demo-data.json, project.json đều có file.')
}

async function main() {
  if (PREVIEW) mkdirSync(PREVIEW, { recursive: true })
  // Logo
  if (!ONLY || 'logo'.includes(ONLY) || ONLY === 'icon') {
    mkdirSync(join(PUBLIC_DIR, 'logo'), { recursive: true })
    const mark = logoMark()
    writeFileSync(join(PUBLIC_DIR, 'logo', 'logo-mark.svg'), mark)
    writeFileSync(join(PUBLIC_DIR, 'logo', 'logo.svg'), logoFull())
    writeFileSync(join(ROOT, 'src', 'app', 'icon.svg'), mark)
    if (PREVIEW) {
      await sharp(Buffer.from(mark), { density: 288 }).png().toFile(join(PREVIEW, 'logo-mark.png'))
      await sharp(Buffer.from(logoFull()), { density: 288 })
        .flatten({ background: '#FFFFFF' })
        .png()
        .toFile(join(PREVIEW, 'logo.png'))
    }
    console.log('logo/logo.svg, logo/logo-mark.svg, src/app/icon.svg')
  }
  let total = 0
  let count = 0
  for (const job of JOBS) {
    if (ONLY && !job.file.includes(ONLY)) continue
    const svg = job.draw(job.w, job.h)
    const { buf, q, png } = await encode(svg, job)
    const out = join(PUBLIC_DIR, job.file)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, buf)
    if (PREVIEW)
      writeFileSync(join(PREVIEW, job.file.replace(/\//g, '_').replace(/\.\w+$/, '.png')), png)
    total += buf.length
    count++
    console.log(
      `${job.file.padEnd(46)} ${`${job.w}×${job.h}`.padEnd(10)} ${(buf.length / KB).toFixed(1).padStart(6)} KB  q${q}`
    )
  }
  console.log(`Đã tạo ${count} ảnh, tổng ${(total / KB).toFixed(1)} KB`)
  checkReferences()
}

await main()
