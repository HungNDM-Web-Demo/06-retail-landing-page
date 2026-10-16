'use client'

import type { PublicBlock } from '@/types/landing'
import { BlockSection, LandingIcon, SectionHeader } from '../landing-ui'

/** Vấn đề của khách: thẻ icon + tiêu đề + mô tả */
export function ProblemsBlock({ block }: { block: PublicBlock }) {
  return (
    <BlockSection tone="plain">
      <SectionHeader title={block.title} subtitle={block.subtitle} />
      <ul className="grid grid-cols-2 gap-3">
        {block.items.map((item, i) => (
          <li key={i} className="rounded-2xl bg-[var(--landing-surface)] p-4 shadow-sm ring-1 ring-[var(--landing-soft)]">
            <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--landing-urgent)] text-[var(--landing-urgent-foreground)]">
              <LandingIcon name={item.icon} className="size-5" />
            </span>
            <p className="text-[0.9375rem] leading-snug font-semibold text-[var(--landing-ink)]">{item.title}</p>
            {item.text ? <p className="text-muted-foreground mt-1.5 text-[0.8125rem] leading-relaxed">{item.text}</p> : null}
          </li>
        ))}
      </ul>
    </BlockSection>
  )
}
