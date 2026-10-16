'use client'

import { useMemo } from 'react'
import { brandCssVariables } from '@/lib/brand-color'
import { cn } from '@/lib/utils'
import type { LandingPageDto } from '@/types/landing'
import { LandingBlocks } from './LandingBlocks'
import { LandingProvider, type LandingContextValue } from './landing-context'

/**
 * Khung xem trước landing cho màn Nội dung landing (FE-Quản trị, FR-17, 07 §4.6): dùng chính component khối
 * của landing, không ghi lượt, không gửi đơn. Nhận `LandingPageDto` dựng từ dữ liệu đang sửa — dựng bằng
 * `buildLandingPage()` (`features/landing/lib/landing-mapper.ts`).
 *
 *   <LandingPreview data={buildLandingPage({ product, combos, promotion, blocks, reviews, settings })} />
 *
 * Mặc định khung điện thoại 390 × 844, cuộn bên trong. `highlightBlockId` cuộn tới khối đang sửa.
 */
export function LandingPreview({
  data,
  className,
  frame = true,
}: {
  data: LandingPageDto
  className?: string
  /** true: khung điện thoại 390 × 844 có viền; false: chỉ nội dung */
  frame?: boolean
}) {
  const context = useMemo<LandingContextValue>(
    () => ({ page: data, promotion: data.promotion, preview: true, scrollToOrder: () => {} }),
    [data]
  )
  const style = useMemo(() => brandCssVariables(data.store.primaryColor) as React.CSSProperties, [data.store.primaryColor])

  return (
    <LandingProvider value={context}>
      <div
        className={cn(
          'brand-scope bg-[var(--landing-bg)]',
          frame && 'border-foreground/80 h-[844px] w-[390px] overflow-y-auto rounded-[2rem] border-8 shadow-xl',
          className
        )}
        style={style}
        aria-label="Xem trước landing"
      >
        <LandingBlocks blocks={data.blocks} />
      </div>
    </LandingProvider>
  )
}
