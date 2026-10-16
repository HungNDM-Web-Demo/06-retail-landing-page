'use client'

import Link from 'next/link'
import { AlarmClock, BadgeCheck, Inbox, TrendingUp } from 'lucide-react'
import { ErrorState } from '@/components/shared/ErrorState'
import { Switch } from '@/components/ui/switch'
import { ordersUrl, routePath } from '@/config/route-path'
import { usePermissions } from '@/hooks/use-permissions'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTelesaleDashboard } from '../hooks/use-reports'
import { DashboardHeader } from './DashboardHeader'
import { MetricCard } from './MetricCard'
import { formatCount } from './ReportParts'

/**
 * Tổng quan telesale (SCR-04, FR-03, UC-10; TC-19, TC-33): thẻ việc của chính mình, bấm mở danh sách đơn lọc
 * sẵn. Không hiện lượt truy cập, tỉ lệ chuyển đổi, doanh thu toàn shop.
 */
export function TelesaleOverview() {
  const { user } = usePermissions()
  const q = useTelesaleDashboard()
  const d = q.data
  const loading = !d
  const me = user?.id
  const today = d?.date

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Việc của tôi hôm nay"
        date={d?.date}
        asOf={d?.asOf}
        isFetching={q.isFetching}
        onRefresh={() => void q.refetch()}
      />

      {q.error && !d ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {d && (
            <div
              className={cn(
                'bg-card flex flex-wrap items-center gap-3 rounded-xl border px-5 py-4 shadow-xs',
                d.isReceiving ? 'border-success/40' : 'border-warning/50 bg-warning/5'
              )}
            >
              {/* Chỉ hiển thị; bật/tắt ở màn Đơn hàng (FR-20) */}
              <Switch
                checked={d.isReceiving}
                disabled
                aria-readonly="true"
                aria-label="Trạng thái nhận đơn"
              />
              <span className={cn('font-medium', d.isReceiving ? 'text-success' : 'text-warning')}>
                {d.isReceiving ? 'Đang nhận đơn' : 'Đang tắt nhận đơn'}
              </span>
              <span className="text-muted-foreground text-sm">
                {d.isReceiving
                  ? 'Đơn mới được chia tự động cho bạn theo vòng xoay.'
                  : 'Bạn sẽ không được chia đơn mới tự động.'}
              </span>
              <Link
                href={routePath.orders}
                className="text-primary ml-auto text-sm font-medium underline-offset-4 hover:underline"
              >
                Bật/tắt ở màn Đơn hàng
              </Link>
            </div>
          )}

          <section aria-label="Việc cần làm" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Đơn mới chờ gọi"
              icon={Inbox}
              isLoading={loading}
              href={ordersUrl({ status: 'Moi', assigneeId: me })}
              value={d && formatCount(d.myNew)}
              footer={
                d && (
                  <span className="text-muted-foreground">
                    + {formatCount(d.unassignedNew)} đơn chưa chia
                  </span>
                )
              }
            />
            <MetricCard
              label="Đến giờ gọi lại"
              icon={AlarmClock}
              isLoading={loading}
              highlight={!!d && d.myDueCallbacks > 0}
              href={ordersUrl({ status: 'ChoGoiLai', tag: 'DenGioGoiLai' })}
              value={d && formatCount(d.myDueCallbacks)}
              footer={
                d && (
                  <span className="text-muted-foreground">
                    {formatCount(d.myLaterCallbacks)} hẹn sau
                  </span>
                )
              }
            />
            <MetricCard
              label="Đã xác nhận hôm nay"
              icon={BadgeCheck}
              isLoading={loading}
              href={ordersUrl({ confirmedById: me, from: today, to: today })}
              value={d && formatCount(d.myConfirmedToday)}
              footer={<span className="text-muted-foreground">Đơn bạn xác nhận</span>}
            />
            <MetricCard
              label="Upsell hôm nay"
              icon={TrendingUp}
              isLoading={loading}
              href={ordersUrl({ confirmedById: me, upsellOnly: true, from: today, to: today })}
              value={
                d && (
                  <>
                    {formatCount(d.myUpsellCountToday)} đơn
                    <span className="text-muted-foreground text-base font-medium">
                      {' '}
                      · {formatVnd(d.myUpsellValueToday)}
                    </span>
                  </>
                )
              }
              footer={
                <span className="text-muted-foreground">Tiền hàng tăng thêm khi xác nhận</span>
              }
            />
          </section>
        </>
      )}
    </div>
  )
}
