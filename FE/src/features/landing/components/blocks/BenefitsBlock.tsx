'use client'

import type { PublicBlock } from '@/types/landing'
import { BlockSection, LandingIcon, LandingImage, SectionHeader } from '../landing-ui'

/** Công dụng: ảnh sản phẩm + danh sách lợi ích có icon */
export function BenefitsBlock({ block }: { block: PublicBlock }) {
  return (
    <BlockSection tone="soft">
      <SectionHeader title={block.title} subtitle={block.subtitle} />
      {block.imageUrl ? (
        <LandingImage
          src={block.imageUrl}
          alt={block.title}
          width={800}
          height={800}
          className="mx-auto mb-6 w-3/4 rounded-3xl shadow-sm"
        />
      ) : null}
      <ul className="space-y-3">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3.5 rounded-2xl bg-[var(--landing-surface)] p-4 shadow-sm">
            <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
              <LandingIcon name={item.icon} className="size-5" />
            </span>
            <span>
              <span className="block text-[0.9375rem] leading-snug font-semibold text-[var(--landing-ink)]">{item.title}</span>
              {item.text ? (
                <span className="text-muted-foreground mt-1 block text-[0.8125rem] leading-relaxed">{item.text}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </BlockSection>
  )
}
