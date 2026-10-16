'use client'

import { useCallback, useState } from 'react'
import { FileText, MousePointerClick } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { BlockEditor } from '../components/BlockEditor'
import { BlockList } from '../components/BlockList'
import { ContentPreview } from '../components/ContentPreview'
import { ProductForm } from '../components/ProductForm'
import { ReviewsTab } from '../components/ReviewsTab'
import { useLandingBlocks } from '../hooks/use-content'
import type { UpdateLandingBlockRequest } from '@/types/landing'

type BlockDraft = { id: string; values: UpdateLandingBlockRequest }

/** Tab Khối nội dung: danh sách bên trái, form sửa khối đang chọn bên phải (FR-04, FR-17) */
function BlocksTab({
  canEdit,
  onDraftChange,
}: {
  canEdit: boolean
  onDraftChange: (draft: BlockDraft | null) => void
}) {
  const blocks = useLandingBlocks()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = blocks.data ?? []
  const selected = list.find((b) => b.id === selectedId) ?? list[0]

  if (blocks.error) return <ErrorState error={blocks.error} onRetry={() => void blocks.refetch()} />

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[18.5rem_minmax(0,1fr)]">
      <BlockList
        blocks={blocks.data}
        isLoading={blocks.isLoading}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        canEdit={canEdit}
      />
      {selected ? (
        <BlockEditor
          key={selected.id}
          block={selected}
          canEdit={canEdit}
          onDraftChange={(values) => onDraftChange({ id: selected.id, values })}
        />
      ) : (
        !blocks.isLoading && (
          <EmptyState icon={MousePointerClick} title="Chọn một khối để sửa" compact />
        )
      )}
    </div>
  )
}

/** SCR-09 Nội dung landing (P3; FR-04, FR-08, FR-17, FR-18) */
export function ContentPage() {
  const { can } = usePermissions()
  const canEdit = can(permissions.landingContents.update)
  const [tab, setTab] = useState('blocks')
  const [draft, setDraft] = useState<BlockDraft | null>(null)
  // Chỉ đổi state khi nội dung nháp thật sự khác (tránh vòng render)
  const onDraftChange = useCallback(
    (d: BlockDraft | null) =>
      setDraft((prev) => (JSON.stringify(prev) === JSON.stringify(d) ? prev : d)),
    []
  )

  return (
    <PermissionGuard permission={permissions.landingContents.view} redirect>
      <div className="space-y-6">
        <PageHeader
          title="Nội dung landing"
          icon={FileText}
          description={
            canEdit
              ? 'Sửa chữ, ảnh, thứ tự khối, đánh giá và thông tin sản phẩm; landing đổi ở lần tải kế tiếp.'
              : 'Bạn chỉ có quyền xem nội dung landing.'
          }
        />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
          <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-4">
            <TabsList>
              <TabsTrigger value="blocks" className="px-4">
                Khối nội dung
              </TabsTrigger>
              <TabsTrigger value="reviews" className="px-4">
                Đánh giá
              </TabsTrigger>
              <TabsTrigger value="product" className="px-4">
                Sản phẩm
              </TabsTrigger>
            </TabsList>
            <TabsContent value="blocks">
              <BlocksTab canEdit={canEdit} onDraftChange={onDraftChange} />
            </TabsContent>
            <TabsContent value="reviews">
              <ReviewsTab canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="product">
              <ProductForm canEdit={canEdit} />
            </TabsContent>
          </Tabs>
          <div className="xl:sticky xl:top-20">
            <ContentPreview draft={tab === 'blocks' ? draft : null} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
