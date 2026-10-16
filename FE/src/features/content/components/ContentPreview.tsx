'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCombos, usePromotion } from '@/features/combos/hooks/use-combos'
import { LandingPreview } from '@/features/landing/components/LandingPreview'
import { buildLandingPage } from '@/features/landing/lib/landing-mapper'
import { usePublicSettings } from '@/features/settings/hooks/use-settings'
import type {
  ComboRecord,
  LandingBlockRecord,
  PromotionRecord,
  ReviewRecord,
  UpdateLandingBlockRequest,
} from '@/types/landing'
import { useLandingBlocks, useProduct, useReviews } from '../hooks/use-content'
import { PreviewFrame } from './PreviewFrame'

/**
 * Xem trước landing ngay trên màn sửa nội dung (FR-17, 07 §4.6): dựng `LandingPageDto` từ dữ liệu quản trị
 * (sản phẩm, khối, đánh giá, combo, khuyến mãi, cài đặt shop) bằng `buildLandingPage` của FE-Landing, ghép bản
 * nháp của khối đang sửa để thấy thay đổi trước khi lưu. Hiển thị bằng chính component khối của landing.
 */
export function ContentPreview({
  draft,
}: {
  draft?: { id: string; values: UpdateLandingBlockRequest } | null
}) {
  const product = useProduct()
  const blocks = useLandingBlocks()
  const reviews = useReviews({ page: 1, pageSize: 100 })
  const combos = useCombos()
  const promotion = usePromotion()
  const settings = usePublicSettings()

  const page = useMemo(() => {
    if (!product.data || !blocks.data || !reviews.data || !combos.data || !promotion.data)
      return null
    const blockRecords: LandingBlockRecord[] = blocks.data.map((b) =>
      draft && draft.id === b.id ? { ...b, ...draft.values } : b
    )
    return buildLandingPage({
      product: product.data,
      blocks: blockRecords,
      reviews: reviews.data.items.map((r) => ({ ...r, createdAt: r.reviewedAt }) as ReviewRecord),
      combos: combos.data.map((c) => ({ ...c, productId: product.data.id }) as ComboRecord),
      promotion: promotion.data as PromotionRecord,
      settings: settings.data ?? {},
    })
  }, [product.data, blocks.data, reviews.data, combos.data, promotion.data, settings.data, draft])

  return (
    <PreviewFrame>
      {page ? (
        <LandingPreview data={page} frame={false} className="min-h-full" />
      ) : (
        <div className="space-y-3 p-4" aria-busy="true">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </PreviewFrame>
  )
}
