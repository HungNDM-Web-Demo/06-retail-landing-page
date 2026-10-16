/**
 * Độ lệch giữa giờ máy chủ Next (route `/server-time`) và giờ máy người xem, đo một lần mỗi lần tải trang
 * (07 §4.8). Chế độ mock dùng `serverNow()` làm "giờ máy chủ" cho `asOf`, đặt hàng, chốt giá; lỗi thì dùng giờ máy.
 */

let offsetMs = 0
let pending: Promise<void> | null = null

export function syncServerClock(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!pending) {
    pending = (async () => {
      try {
        const sentAt = Date.now()
        const response = await fetch('/server-time', { cache: 'no-store' })
        const receivedAt = Date.now()
        const { now } = (await response.json()) as { now: string }
        const server = new Date(now).getTime()
        if (Number.isFinite(server)) offsetMs = server - (sentAt + receivedAt) / 2
      } catch {
        offsetMs = 0
      }
    })()
  }
  return pending
}

/** Giờ máy chủ (ms) theo độ lệch đã đo */
export const serverNow = (): number => Date.now() + offsetMs
