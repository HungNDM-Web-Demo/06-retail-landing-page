'use client'

import { Info } from 'lucide-react'
import type { PublicBlock } from '@/types/landing'
import { BlockSection, SectionHeader } from '../landing-ui'

/** Thông tin sản phẩm (bảng tên – giá trị) và cách dùng (`body`) */
export function SpecsBlock({ block }: { block: PublicBlock }) {
  return (
    <BlockSection tone="soft">
      <SectionHeader title={block.title} subtitle={block.subtitle} />
      {block.items.length > 0 ? (
        <dl className="divide-border overflow-hidden rounded-2xl bg-[var(--landing-surface)] shadow-sm divide-y">
          {block.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{item.title}</dt>
              <dd className="font-medium text-[var(--landing-ink)]">{item.value ?? item.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {block.body ? (
        <div className="mt-4 rounded-2xl bg-[var(--landing-surface)] p-4 shadow-sm">
          <p className="text-primary mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <Info className="size-4" aria-hidden="true" />
            Cách dùng
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--landing-ink)]">{block.body}</p>
        </div>
      ) : null}
    </BlockSection>
  )
}
