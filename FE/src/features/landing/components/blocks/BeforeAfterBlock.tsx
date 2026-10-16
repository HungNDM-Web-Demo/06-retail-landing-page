'use client'

import { useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { cn } from '@/lib/utils'
import type { ContentItem, PublicBlock } from '@/types/landing'
import { BlockSection, SectionHeader } from '../landing-ui'

/**
 * Trước và sau (07 §4.3): thanh kéo so sánh hai ảnh (`imageUrl` trước, `afterImageUrl` sau), nhãn "Trước",
 * "Sau 28 ngày", câu lưu ý `body` ngay dưới (NFR-06). Kéo bằng chuột, chạm hoặc phím mũi tên (input range).
 */
export function BeforeAfterBlock({ block }: { block: PublicBlock }) {
  const items = block.items.filter((i) => i.imageUrl && i.afterImageUrl)
  const [active, setActive] = useState(0)
  const item = items[Math.min(active, items.length - 1)]
  if (!item) return null

  return (
    <BlockSection tone="surface">
      <SectionHeader title={block.title} subtitle={block.subtitle} />
      {items.length > 1 ? (
        <div role="tablist" aria-label="Chọn trường hợp" className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                'min-h-11 shrink-0 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors',
                i === active
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-border text-muted-foreground hover:text-foreground bg-[var(--landing-surface)]'
              )}
            >
              Trường hợp {i + 1}
            </button>
          ))}
        </div>
      ) : null}
      <CompareSlider key={active} item={item} />
      {item.title || item.text ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[0.8125rem]">
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold">Trước: </span>
            {item.title}
          </p>
          <p className="text-muted-foreground text-right">{item.text}</p>
        </div>
      ) : null}
      {block.body ? (
        <p className="text-muted-foreground mt-4 rounded-xl bg-[var(--landing-soft)] px-3.5 py-3 text-xs leading-relaxed">
          {block.body}
        </p>
      ) : null}
    </BlockSection>
  )
}

function CompareSlider({ item }: { item: ContentItem }) {
  const [position, setPosition] = useState(50)
  const before = useAssetUrl(item.imageUrl)
  const after = useAssetUrl(item.afterImageUrl)

  return (
    <div className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-2xl bg-[var(--landing-soft)] select-none">
      {after ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh seed WebP, ảnh tải lên có thể là blob:
        <img src={after} alt={`Sau 28 ngày: ${item.text ?? ''}`} width={600} height={600} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : null}
      {before ? (
        // eslint-disable-next-line @next/next/no-img-element -- như trên
        <img
          src={before}
          alt={`Trước: ${item.title ?? ''}`}
          width={600}
          height={600}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
      ) : null}
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-[var(--landing-ink)]/75 px-2.5 py-1 text-xs font-semibold text-[var(--landing-surface)]">
        Trước
      </span>
      <span className="bg-primary text-primary-foreground pointer-events-none absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold">
        Sau 28 ngày
      </span>
      <span
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--landing-surface)] shadow"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <span className="text-primary absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--landing-surface)] shadow-md">
          <ChevronsLeftRight className="size-5" />
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Kéo để so sánh ảnh trước và sau"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
