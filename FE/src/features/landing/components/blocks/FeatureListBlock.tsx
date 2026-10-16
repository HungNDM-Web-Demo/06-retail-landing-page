'use client'

import type { PublicBlock } from '@/types/landing'
import { cn } from '@/lib/utils'
import { BlockSection, LandingIcon, SectionHeader } from '../landing-ui'

/**
 * Chứng nhận (`Certificates`) và Cam kết (`Commitments`): lưới thẻ icon + tiêu đề + mô tả.
 * Cam kết nền màu chính để nổi bật lý do chốt đơn COD (07 §5 #7).
 */
export function FeatureListBlock({ block, emphasis = false }: { block: PublicBlock; emphasis?: boolean }) {
  return (
    <BlockSection tone={emphasis ? 'plain' : 'surface'} className={emphasis ? 'bg-primary text-primary-foreground' : undefined}>
      <SectionHeader
        title={block.title}
        subtitle={block.subtitle}
        className={emphasis ? '[&_h2]:text-primary-foreground [&_p]:text-primary-foreground/85' : undefined}
      />
      <ul className="grid grid-cols-2 gap-3">
        {block.items.map((item, i) => (
          <li
            key={i}
            className={cn(
              'rounded-2xl p-4',
              emphasis ? 'bg-primary-foreground/10 ring-primary-foreground/20 ring-1' : 'bg-[var(--landing-soft)]'
            )}
          >
            <span
              className={cn(
                'mb-2.5 flex size-10 items-center justify-center rounded-full',
                emphasis ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
              )}
            >
              <LandingIcon name={item.icon} className="size-5" />
            </span>
            <p className={cn('text-[0.9375rem] leading-snug font-semibold', !emphasis && 'text-[var(--landing-ink)]')}>
              {item.title}
            </p>
            {item.text ? (
              <p className={cn('mt-1 text-[0.8125rem] leading-relaxed', emphasis ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                {item.text}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </BlockSection>
  )
}
