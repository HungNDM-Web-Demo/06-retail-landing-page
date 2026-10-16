'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { noCampaignLabel, sourceLabel } from '@/config/landing-labels'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import type { AdCostDto } from '@/types/landing'
import { useAdCosts, useDeleteAdCost } from '../hooks/use-reports'
import { displayDateKey, vnDateTimeText } from '../lib/vn-date'
import { excelSheet, reportFileName, type ExcelColumn } from '../lib/export-excel'
import type { ReportTabProps, SourceFilterProps } from '../types/report.types'
import { AdCostFormDialog } from './AdCostFormDialog'
import { ExportButton, TabToolbar } from './ReportParts'
import { SourceSelect } from './SourceSelect'

const COLUMNS: ExcelColumn<AdCostDto>[] = [
  { header: 'Ngày', value: (c) => displayDateKey(c.date), width: 12 },
  { header: 'Nguồn', value: (c) => sourceLabel(c.source), width: 14 },
  { header: 'Chiến dịch', value: (c) => c.campaign || '(cả nguồn)', width: 22 },
  { header: 'Số tiền', value: (c) => c.amount, width: 14 },
]

/**
 * Tab Chi phí quảng cáo (SCR-08, FR-33, UC-14): bảng theo khoảng ngày, lọc nguồn; thêm/sửa/xóa theo quyền
 * `ad-costs.create` / `ad-costs.update`. Ghi xong báo cáo nguồn (chi phí, ROAS) tự làm mới.
 */
export function AdCostsTab({
  range,
  enabled,
  source,
  onSourceChange,
}: ReportTabProps & SourceFilterProps) {
  const { can } = usePermissions()
  const canCreate = can(permissions.adCosts.create)
  const canUpdate = can(permissions.adCosts.update)
  const list = useAdCosts({ ...range, source }, { enabled })
  const remove = useDeleteAdCost()
  const [editing, setEditing] = useState<AdCostDto | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<AdCostDto | null>(null)
  const items = list.data
  const total = (items ?? []).reduce((s, c) => s + c.amount, 0)

  const openForm = (cost: AdCostDto | null) => {
    setEditing(cost)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <TabToolbar>
        <SourceSelect value={source} onChange={onSourceChange} />
        <p className="text-muted-foreground text-sm">
          {items && (
            <>
              {items.length} dòng · tổng{' '}
              <span className="text-foreground font-semibold">{formatVnd(total)}</span>
            </>
          )}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <ExportButton
            fileName={reportFileName(
              source ? `chi-phi-${source}` : 'chi-phi',
              range.from,
              range.to
            )}
            disabled={!items?.length}
            build={() => [
              excelSheet(
                'Chi phí quảng cáo',
                `Chi phí quảng cáo ${displayDateKey(range.from)} - ${displayDateKey(range.to)}`,
                COLUMNS,
                items ?? []
              ),
            ]}
          />
          {canCreate && (
            <Button onClick={() => openForm(null)}>
              <Plus aria-hidden="true" />
              Thêm chi phí
            </Button>
          )}
        </div>
      </TabToolbar>

      {list.error && !items ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : !items ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : !items.length ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Chưa có chi phí quảng cáo"
            description="Khoảng ngày và nguồn đã chọn chưa có chi phí nào được nhập."
            action={
              canCreate && (
                <Button onClick={() => openForm(null)}>
                  <Plus aria-hidden="true" />
                  Thêm chi phí
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <div className="max-h-[36rem] overflow-auto">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Chiến dịch</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  {canUpdate && <TableHead className="w-24 text-right">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="tabular-nums">{displayDateKey(c.date)}</TableCell>
                    <TableCell className="font-medium">{sourceLabel(c.source)}</TableCell>
                    <TableCell className={c.campaign ? '' : 'text-muted-foreground'}>
                      {c.campaign || `(cả nguồn)`}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatVnd(c.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      {vnDateTimeText(c.updatedAt)}
                    </TableCell>
                    {canUpdate && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openForm(c)}
                            aria-label={`Sửa chi phí ${sourceLabel(c.source)} ngày ${displayDateKey(c.date)}`}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleting(c)}
                            aria-label={`Xóa chi phí ${sourceLabel(c.source)} ngày ${displayDateKey(c.date)}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <tfoot className="bg-muted sticky bottom-0 border-t font-semibold">
                <TableRow>
                  <TableCell colSpan={3}>Tổng</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(total)}</TableCell>
                  <TableCell colSpan={canUpdate ? 2 : 1} />
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </Card>
      )}

      <AdCostFormDialog open={formOpen} onOpenChange={setFormOpen} cost={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa chi phí quảng cáo?"
        description={
          deleting &&
          `${displayDateKey(deleting.date)} · ${sourceLabel(deleting.source)} · ${
            deleting.campaign || noCampaignLabel
          } · ${formatVnd(deleting.amount)}. Báo cáo chi phí, ROAS sẽ tính lại.`
        }
        confirmText="Xóa"
        variant="destructive"
        icon={Trash2}
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await remove.mutateAsync(deleting.id)
            toast.success('Đã xóa chi phí quảng cáo')
          } catch (error) {
            toast.error(getErrorMessage(error))
            throw error
          }
        }}
      />
    </div>
  )
}
