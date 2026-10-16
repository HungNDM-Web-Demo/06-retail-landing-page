'use client'

import { useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { formatDate, formatNumber } from '@/lib/format'
import type { PublicBlock, PublicReview } from '@/types/landing'
import { useMoreReviews } from '../../hooks/use-landing'
import { useLandingContext } from '../landing-context'
import { BlockSection, initialsOf, LandingImage, SectionHeader, Stars } from '../landing-ui'

/**
 * Đánh giá (FR-08): điểm trung bình, 6 đánh giá đầu, "Xem thêm" gọi `GET /api/public/reviews?page=n`;
 * thiếu avatar thì chữ viết tắt; đánh giá minh họa có chữ nhỏ "Minh họa" (NFR-06).
 */
export function ReviewsBlock({ block }: { block: PublicBlock }) {
  const { page, preview } = useLandingContext()
  const [expanded, setExpanded] = useState(false)
  const more = useMoreReviews(expanded && !preview)
  const extra = more.data?.pages.flatMap((p) => p.items) ?? []
  const reviews = [...page.reviews, ...extra.filter((r) => !page.reviews.some((x) => x.id === r.id))]
  const total = page.reviewSummary.total
  const canLoadMore = reviews.length < total && (!expanded || more.hasNextPage !== false)

  const loadMore = () => {
    if (preview) return
    if (!expanded) setExpanded(true)
    else void more.fetchNextPage()
  }

  return (
    <BlockSection tone="soft">
      <SectionHeader title={block.title} />
      <div className="mb-5 flex items-center justify-center gap-3 rounded-2xl bg-[var(--landing-surface)] px-4 py-3 shadow-sm">
        <span className="text-[2rem] leading-none font-bold text-[var(--landing-ink)]">
          {formatNumber(page.reviewSummary.average, 1)}
        </span>
        <span>
          <Stars rating={page.reviewSummary.average} />
          <span className="text-muted-foreground block text-sm">
            {formatNumber(page.reviewSummary.average, 1)}/5 · {total} đánh giá
          </span>
        </span>
      </div>

      <ul className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </ul>

      {canLoadMore ? (
        <Button
          variant="outline"
          className="mt-4 h-12 w-full rounded-xl bg-[var(--landing-surface)]"
          onClick={loadMore}
          disabled={more.isFetching || preview}
        >
          {more.isFetching ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {block.ctaText || 'Xem thêm'} đánh giá
        </Button>
      ) : null}
      {block.subtitle ? <p className="text-muted-foreground mt-3 text-center text-xs">{block.subtitle}</p> : null}
    </BlockSection>
  )
}

function ReviewCard({ review }: { review: PublicReview }) {
  const avatar = useAssetUrl(review.avatarUrl)
  return (
    <li className="rounded-2xl bg-[var(--landing-surface)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar minh họa 160 px
          <img src={avatar} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initialsOf(review.customerName)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-[var(--landing-ink)]">{review.customerName}</span>
            {review.isSample ? (
              <span className="text-muted-foreground rounded bg-[var(--landing-soft)] px-1.5 py-0.5 text-[0.6875rem]">Minh họa</span>
            ) : null}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="size-3" aria-hidden="true" />
            {review.province} · {formatDate(review.reviewedAt)}
          </p>
        </div>
      </div>
      <Stars rating={review.rating} className="mt-2.5" />
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--landing-ink)]">{review.content}</p>
      {review.photoUrl ? (
        <LandingImage
          src={review.photoUrl}
          alt={`Ảnh khách ${review.customerName} gửi`}
          width={600}
          height={600}
          className="mt-3 w-32 rounded-xl"
        />
      ) : null}
    </li>
  )
}
