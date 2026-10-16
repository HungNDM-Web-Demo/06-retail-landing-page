'use client'

import type { PublicBlock } from '@/types/landing'
import { BlockSection, LandingImage, SectionHeader } from '../landing-ui'

/** Thành phần: ảnh tròn, tên, tên khoa học, mô tả; `body` là ghi chú dưới */
export function IngredientsBlock({ block }: { block: PublicBlock }) {
  return (
    <BlockSection tone="plain">
      <SectionHeader title={block.title} subtitle={block.subtitle} />
      <ul className="grid grid-cols-2 gap-3">
        {block.items.map((item, i) => (
          <li key={i} className="rounded-2xl bg-[var(--landing-surface)] p-3.5 text-center shadow-sm ring-1 ring-[var(--landing-soft)]">
            <LandingImage
              src={item.imageUrl}
              alt={item.title ?? ''}
              width={400}
              height={400}
              className="mx-auto mb-3 w-24 rounded-full"
            />
            <p className="text-[0.9375rem] leading-snug font-semibold text-[var(--landing-ink)]">{item.title}</p>
            {item.value ? <p className="text-primary mt-0.5 text-xs font-medium italic">{item.value}</p> : null}
            {item.text ? <p className="text-muted-foreground mt-1.5 text-[0.8125rem] leading-relaxed">{item.text}</p> : null}
          </li>
        ))}
      </ul>
      {block.body ? <p className="text-muted-foreground mt-4 text-center text-xs">{block.body}</p> : null}
    </BlockSection>
  )
}
