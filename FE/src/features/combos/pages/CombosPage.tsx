'use client'

import { useCallback, useState } from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Button } from '@/components/ui/button'
import { permissions } from '@/config/permissions'
import { salesRules } from '@/config/sales-rules'
import { problemCode, problemExtra } from '@/features/orders/lib/problem'
import { usePermissions } from '@/hooks/use-permissions'
import { getErrorMessage } from '@/lib/api-error'
import type { ComboDto } from '@/types/landing'
import { ComboFormDialog } from '../components/ComboFormDialog'
import { ComboTable } from '../components/ComboTable'
import { PromotionCard } from '../components/PromotionCard'
import { useCombos, useDeleteCombo } from '../hooks/use-combos'

type FormState = { open: boolean; combo: ComboDto | null }

/** SCR-07 Combo và khuyến mãi (FR-15, FR-16, UC-11; TC-03, TC-17, TC-34) */
export function CombosPage() {
  const { can } = usePermissions()
  const canCreate = can(permissions.combos.create)
  const canUpdate = can(permissions.combos.update)
  const canDelete = can(permissions.combos.delete)

  const combos = useCombos()
  const deleteCombo = useDeleteCombo()
  const [form, setForm] = useState<FormState>({ open: false, combo: null })
  const [deleteTarget, setDeleteTarget] = useState<ComboDto | null>(null)
  const visibleCount = (combos.data ?? []).filter((c) => c.isVisible).length

  const openCreate = () => setForm({ open: true, combo: null })
  const onEdit = useCallback((combo: ComboDto) => setForm({ open: true, combo }), [])
  const onDelete = useCallback((combo: ComboDto) => setDeleteTarget(combo), [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCombo.mutateAsync(deleteTarget.id)
      toast.success(`Đã xóa combo ${deleteTarget.code}`)
    } catch (error) {
      const orderCount = problemExtra<number>(error, 'orderCount')
      toast.error(getErrorMessage(error), {
        description:
          problemCode(error) === 'ComboDaCoDon' && orderCount
            ? `Combo đang có ${orderCount} đơn.`
            : undefined,
      })
      throw error
    }
  }

  const addButton = canCreate && (
    <Button onClick={openCreate}>
      <Plus aria-hidden="true" />
      Thêm combo
    </Button>
  )

  return (
    <PermissionGuard permission={permissions.combos.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Combo và khuyến mãi"
          icon={Package}
          description="Giá combo, quà tặng, combo chọn sẵn và thời gian khuyến mãi trên landing."
          actions={addButton}
        />

        <PromotionCard canEdit={canUpdate} />

        <section aria-labelledby="combo-title" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="combo-title" className="text-lg font-semibold">
              Combo
            </h2>
            <p className="text-muted-foreground text-sm">
              Đang hiện {visibleCount}/{salesRules.maxVisibleCombos} combo trên landing · thứ tự
              bảng là thứ tự trên landing
            </p>
          </div>
          <ComboTable
            combos={combos.data}
            isLoading={combos.isLoading}
            isFetching={combos.isFetching}
            error={combos.error}
            onRetry={() => void combos.refetch()}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyAction={addButton}
          />
        </section>
      </div>

      <ComboFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((s) => ({ ...s, open }))}
        combo={form.combo}
        visibleCount={visibleCount}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        variant="destructive"
        icon={Trash2}
        title="Xóa combo này?"
        description={`Combo ${deleteTarget?.code} · ${deleteTarget?.name} sẽ bị xóa khỏi danh sách và landing.`}
        confirmText="Xóa combo"
        loading={deleteCombo.isPending}
        onConfirm={confirmDelete}
      />
    </PermissionGuard>
  )
}
