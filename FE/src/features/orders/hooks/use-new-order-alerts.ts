'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sourceLabel } from '@/config/landing-labels'
import { readJson, storageKey, writeJson } from '@/lib/storage'
import { orderService } from '../services/order.service'
import { ORDERS_REFRESH_MS } from './use-orders'

/**
 * Âm báo đơn mới (07 §4.2 bước 5): trình duyệt chặn tự phát âm trước khi người dùng bấm, nên có nút "Bật âm báo";
 * lựa chọn lưu localStorage khóa `retail-landing-page:order-sound`.
 */
const SOUND_KEY = storageKey('order-sound')
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => e.key === SOUND_KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useOrderSound() {
  const enabled = useSyncExternalStore(
    subscribe,
    () => readJson<boolean>('local', SOUND_KEY) === true,
    () => false
  )
  const setEnabled = useCallback((value: boolean) => {
    writeJson('local', SOUND_KEY, value)
    listeners.forEach((l) => l())
    if (value) playBeep()
  }, [])
  return { enabled, setEnabled }
}

let audioContext: AudioContext | null = null

/** Hai tiếng "ting" ngắn bằng Web Audio (không cần file âm thanh) */
export function playBeep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audioContext ??= new Ctx()
    const ctx = audioContext
    void ctx.resume()
    ;[0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = i === 0 ? 880 : 1175
      const t = ctx.currentTime + offset
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.18)
    })
  } catch {
    // Trình duyệt không cho phát âm: bỏ qua
  }
}

/**
 * Thông báo đơn mới (UC-05 1a, 07 §4.5): so id đơn Mới của mình và đơn chưa chia giữa hai lần tải;
 * đơn mới → toast "Có đơn mới {mã} từ {nguồn}" + âm báo nếu bật. Lần tải đầu không báo.
 */
export function useNewOrderAlerts(userId: string | undefined, soundEnabled: boolean) {
  const { data } = useQuery({
    queryKey: ['orders', 'new-order-alerts'],
    queryFn: () => orderService.getList({ status: 'Moi', pageSize: 100, sortBy: 'placedAt' }),
    enabled: !!userId,
    refetchInterval: ORDERS_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  const seen = useRef<Set<string> | null>(null)
  const sound = useRef(soundEnabled)

  useEffect(() => {
    sound.current = soundEnabled
  }, [soundEnabled])

  useEffect(() => {
    if (!data || !userId) return
    const mine = data.items.filter((o) => !o.assigneeId || o.assigneeId === userId)
    if (seen.current === null) {
      seen.current = new Set(mine.map((o) => o.id))
      return
    }
    const fresh = mine.filter((o) => !seen.current!.has(o.id))
    mine.forEach((o) => seen.current!.add(o.id))
    if (!fresh.length) return
    for (const o of fresh.slice(0, 3)) {
      toast.info(`Có đơn mới ${o.code} từ ${sourceLabel(o.source)}`, {
        description: `${o.customerName} · ${o.comboName} × ${o.quantity}`,
      })
    }
    if (fresh.length > 3) toast.info(`Và ${fresh.length - 3} đơn mới khác`)
    if (sound.current) playBeep()
  }, [data, userId])
}
