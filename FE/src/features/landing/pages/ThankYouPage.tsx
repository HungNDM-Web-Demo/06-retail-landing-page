'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, MapPin, Phone, SearchX, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { routePath } from '@/config/route-path'
import { salesMessages } from '@/config/sales-rules'
import { formatPhone, formatVnd } from '@/lib/format'
import type { PlacedOrderSummary } from '@/types/landing'
import { readPlacedOrder } from '../lib/visitor'

/**
 * Trang cảm ơn `/cam-on` (SCR-03, UC-02 bước 5, 4a): đọc `placed-order` (sessionStorage của tab, có hậu tố `:v{N}`).
 * Không gọi API. Hotline shop lấy từ máy chủ (props) vì trang không tải landing.
 */
export function ThankYouPage({ hotline, storeName }: { hotline: string; storeName: string }) {
  const [order, setOrder] = useState<PlacedOrderSummary | null | undefined>(undefined)
  useEffect(() => {
    const id = setTimeout(() => setOrder(readPlacedOrder()), 0)
    return () => clearTimeout(id)
  }, [])
  const tel = hotline.replace(/[^\d+]/g, '')

  if (order === undefined) return <div className="min-h-svh bg-[var(--landing-bg)]" aria-busy="true" />

  return (
    <div className="min-h-svh bg-[var(--landing-bg)]">
      <main className="mx-auto max-w-[480px] px-4 py-8">
        {order ? (
          <div className="space-y-5">
            <div className="text-center">
              <CheckCircle2 className="text-success mx-auto size-16" aria-hidden="true" />
              <h1 className="mt-3 text-2xl font-bold text-[var(--landing-ink)]">Đặt hàng thành công</h1>
              <p className="text-muted-foreground mt-1 text-sm">Cảm ơn bạn đã tin chọn {storeName}</p>
            </div>

            <div className="rounded-2xl bg-[var(--landing-surface)] p-5 text-center shadow-sm">
              <p className="text-muted-foreground text-sm">Mã đơn hàng</p>
              <p className="text-primary mt-1 text-3xl font-bold tracking-wide tabular-nums">{order.code}</p>
              <p className="mt-3 rounded-xl bg-[var(--landing-urgent)] px-3 py-2.5 text-sm font-medium text-[var(--landing-urgent-foreground)]">
                {order.outsideWorkingHours ? salesMessages.callFrom8am : salesMessages.callWithin15}
              </p>
            </div>

            <div className="space-y-2.5 rounded-2xl bg-[var(--landing-surface)] p-5 text-[0.9375rem] shadow-sm">
              <p className="flex justify-between gap-3">
                <span className="font-semibold text-[var(--landing-ink)]">
                  {order.comboName} × {order.quantity}
                </span>
                <span className="tabular-nums">{formatVnd(order.subtotal)}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="tabular-nums">{order.shippingFee === 0 ? 'Miễn phí' : formatVnd(order.shippingFee)}</span>
              </p>
              <p className="border-border flex items-baseline justify-between gap-3 border-t pt-2.5">
                <span className="font-semibold">Tổng thanh toán khi nhận hàng</span>
                <span className="text-xl font-bold text-[var(--landing-price)] tabular-nums">{formatVnd(order.total)}</span>
              </p>
            </div>

            <ul className="space-y-2 rounded-2xl bg-[var(--landing-surface)] p-5 text-[0.9375rem] shadow-sm">
              <li className="flex items-center gap-2.5">
                <UserRound className="text-primary size-4 shrink-0" aria-hidden="true" />
                {order.customerName}
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="text-primary size-4 shrink-0" aria-hidden="true" />
                {formatPhone(order.phone)}
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="text-primary mt-1 size-4 shrink-0" aria-hidden="true" />
                {order.address}, {order.province}
              </li>
            </ul>

            {hotline ? (
              <p className="text-muted-foreground text-center text-sm">
                Cần đổi thông tin đơn? Gọi hotline{' '}
                <a className="text-primary font-semibold" href={`tel:${tel}`}>
                  {hotline}
                </a>
              </p>
            ) : null}
            <Button asChild variant="outline" className="h-12 w-full rounded-xl bg-[var(--landing-surface)]">
              <Link href={routePath.root}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Quay lại trang sản phẩm
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-16 text-center">
            <SearchX className="text-muted-foreground mx-auto size-14" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-[var(--landing-ink)]">Không tìm thấy thông tin đơn vừa đặt</h1>
            <Button asChild variant="cta" className="h-12 rounded-xl px-6">
              <Link href={routePath.root}>Về trang sản phẩm</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
