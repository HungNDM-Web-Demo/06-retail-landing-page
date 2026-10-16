'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, Loader2, ShoppingCart, Truck, UserRoundCog, X } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { sourceLabels } from '@/config/landing-labels'
import { permissions, roleCodes } from '@/config/permissions'
import { useCombos } from '@/features/combos/hooks/use-combos'
import { ExportButton } from '@/features/reports/components/ReportParts'
import { excelSheet } from '@/features/reports/lib/export-excel'
import { usePermissions } from '@/hooks/use-permissions'
import type { SortDir } from '@/types/api'
import type { OrderListItem, OrderQuery } from '@/types/landing'
import { HandoverDialog } from '../components/HandoverDialog'
import { OrderDetailSheet } from '../components/OrderDetailSheet'
import { OrderFilters } from '../components/OrderFilters'
import { OrderStatusTabs } from '../components/OrderStatusTabs'
import { OrderTable } from '../components/OrderTable'
import { ReassignDialog } from '../components/ReassignDialog'
import { useNewOrderAlerts, useOrderSound } from '../hooks/use-new-order-alerts'
import { handleOrderError, useOrders, useSetReceiving, useTelesales } from '../hooks/use-orders'
import { orderExportColumns, orderFileName } from '../lib/export-orders'
import {
  activeFilterCount,
  parseOrderParams,
  toOrderParams,
  toQueryStatus,
  type OrderFilters as Filters,
  type OrderTab,
} from '../lib/order-filters'
import { orderService } from '../services/order.service'

/** SCR-05 Danh sách đơn + SCR-06 ngăn chi tiết (UC-03…UC-09; FR-19…FR-28; NFR-05) */
export function OrdersPage() {
  return (
    <PermissionGuard permission={permissions.orders.view} redirect>
      <Suspense>
        <OrdersView />
      </Suspense>
    </PermissionGuard>
  )
}

function OrdersView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { can, hasRole, user } = usePermissions()
  const { tab, filters } = useMemo(
    () => parseOrderParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )

  const [paging, setPaging] = useState({ page: 1, pageSize: 20 })
  const [sort, setSort] = useState<{ sortBy?: string; sortDir?: SortDir }>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'handover' | 'reassign' | null>(null)
  const [claimingId, setClaimingId] = useState<string>()

  const canViewAll = can(permissions.orders.viewAll)
  const canAssign = can(permissions.orders.assign)
  const canShip = can(permissions.orders.ship)
  const isTelesale = hasRole(roleCodes.staff)

  const navigate = useCallback(
    (nextTab: OrderTab, nextFilters: Filters) => {
      const params = toOrderParams(nextTab, nextFilters).toString()
      router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false })
      setPaging((p) => ({ ...p, page: 1 }))
      setSelected(new Set())
    },
    [router, pathname]
  )

  const query: OrderQuery = useMemo(
    () => ({
      ...filters,
      status: toQueryStatus(tab),
      page: paging.page,
      pageSize: paging.pageSize,
      ...sort,
    }),
    [filters, tab, paging, sort]
  )
  const list = useOrders(query)
  const combos = useCombos()
  const telesales = useTelesales()
  const me = telesales.data?.find((t) => t.userId === user?.id)
  const setReceiving = useSetReceiving()
  const sound = useOrderSound()
  useNewOrderAlerts(user?.id, sound.enabled)

  const extraSources = useMemo(() => {
    const set = new Set<string>()
    list.data?.items.forEach((o) => !(o.source in sourceLabels) && set.add(o.source))
    if (filters.source && !(filters.source in sourceLabels)) set.add(filters.source)
    return [...set]
  }, [list.data, filters.source])

  const claim = async (o: OrderListItem) => {
    setClaimingId(o.id)
    try {
      const detail = await orderService.claim(o.id)
      queryClient.setQueryData(['order', detail.id], detail)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Đã nhận đơn ${detail.code}`)
    } catch (error) {
      handleOrderError(queryClient, o.id, error)
    } finally {
      setClaimingId(undefined)
    }
  }

  const selectedIds = [...selected]
  const hasFilters = activeFilterCount(filters) > 0 || !!filters.search

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đơn hàng"
        icon={ShoppingCart}
        description="Gọi xác nhận, xử lý đơn trùng, bàn giao vận chuyển. Danh sách tự làm mới mỗi 30 giây."
        actions={
          <>
            {isTelesale && (
              <div className="bg-card flex h-10 items-center gap-2 rounded-lg border px-3">
                <Switch
                  id="receiving-switch"
                  checked={!!me?.isReceiving}
                  disabled={!me || setReceiving.isPending}
                  onCheckedChange={(on) => setReceiving.mutate({ isReceiving: on })}
                />
                <Label htmlFor="receiving-switch" className="cursor-pointer text-sm">
                  {me?.isReceiving ? 'Đang nhận đơn' : 'Nhận đơn'}
                </Label>
                {setReceiving.isPending && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
              </div>
            )}
            <Button
              variant="outline"
              aria-pressed={sound.enabled}
              onClick={() => sound.setEnabled(!sound.enabled)}
            >
              {sound.enabled ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
              {sound.enabled ? 'Đang bật âm báo' : 'Bật âm báo'}
            </Button>
            {can(permissions.orders.export) && (
              <ExportButton
                fileName={() => orderFileName()}
                disabled={!list.data?.totalCount}
                build={async () => {
                  const rows = await orderService.exportRows({
                    ...filters,
                    status: toQueryStatus(tab),
                  })
                  if (!rows.length) throw new Error('Không có đơn nào để xuất')
                  return [excelSheet('Đơn hàng', null, orderExportColumns, rows)]
                }}
              />
            )}
          </>
        }
      />

      <OrderStatusTabs
        value={tab}
        counts={list.data?.statusCounts}
        onChange={(t) => navigate(t, filters)}
      />

      {selected.size > 0 && (
        <div
          className="border-primary/30 bg-primary/5 flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2"
          role="region"
          aria-label="Thao tác với đơn đã chọn"
        >
          <span className="text-sm font-medium">Đã chọn {selected.size} đơn</span>
          {canAssign && (
            <Button size="sm" variant="outline" onClick={() => setDialog('reassign')}>
              <UserRoundCog aria-hidden="true" />
              Chia lại
            </Button>
          )}
          {canShip && (
            <Button size="sm" onClick={() => setDialog('handover')}>
              <Truck aria-hidden="true" />
              Bàn giao vận chuyển
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            <X aria-hidden="true" />
            Bỏ chọn
          </Button>
        </div>
      )}

      <OrderTable
        data={list.data?.items}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        pagination={
          list.data && {
            ...list.data,
            onPageChange: (page) => setPaging((p) => ({ ...p, page })),
            onPageSizeChange: (pageSize) => setPaging({ page: 1, pageSize }),
          }
        }
        sorting={{
          sortBy: sort.sortBy,
          sortDir: sort.sortDir,
          onSortChange: (sortBy, sortDir) => {
            setSort({ sortBy, sortDir })
            setPaging((p) => ({ ...p, page: 1 }))
          },
        }}
        selectable={canAssign || canShip}
        selected={selected}
        onSelectedChange={setSelected}
        showStatus={tab === 'TatCa'}
        canClaim={can(permissions.orders.call)}
        claimingId={claimingId}
        onClaim={claim}
        onOpen={(o) => setActiveId(o.id)}
        activeId={activeId}
        toolbar={
          <OrderFilters
            value={filters}
            onChange={(f) => navigate(tab, f)}
            combos={combos.data ?? []}
            telesales={telesales.data ?? []}
            showAssignee={canViewAll}
            sources={extraSources}
          />
        }
        emptyState={
          <EmptyState
            title={hasFilters ? 'Không có đơn phù hợp bộ lọc' : 'Chưa có đơn ở trạng thái này'}
            description={hasFilters ? 'Thử bỏ bớt điều kiện lọc.' : undefined}
            action={
              hasFilters && (
                <Button variant="outline" onClick={() => navigate(tab, {})}>
                  Xóa bộ lọc
                </Button>
              )
            }
          />
        }
      />

      <OrderDetailSheet
        orderId={activeId}
        onClose={() => setActiveId(null)}
        onOpenOrder={setActiveId}
        combos={combos.data ?? []}
      />
      <HandoverDialog
        open={dialog === 'handover'}
        onOpenChange={(o) => !o && setDialog(null)}
        orderIds={selectedIds}
        onDone={() => setSelected(new Set())}
      />
      <ReassignDialog
        open={dialog === 'reassign'}
        onOpenChange={(o) => !o && setDialog(null)}
        orderIds={selectedIds}
        telesales={telesales.data ?? []}
        onDone={() => setSelected(new Set())}
      />
    </div>
  )
}
