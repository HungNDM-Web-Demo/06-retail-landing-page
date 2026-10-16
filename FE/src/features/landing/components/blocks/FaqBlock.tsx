'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { PublicBlock } from '@/types/landing'
import { BlockSection, SectionHeader } from '../landing-ui'

/** Câu hỏi thường gặp: accordion một mục mở (UC-01 3b) */
export function FaqBlock({ block }: { block: PublicBlock }) {
  return (
    <BlockSection tone="plain">
      <SectionHeader title={block.title} subtitle={block.subtitle} />
      <Accordion type="single" collapsible className="rounded-2xl bg-[var(--landing-surface)] px-4 shadow-sm">
        {block.items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="min-h-12 text-[0.9375rem] font-semibold text-[var(--landing-ink)] hover:no-underline">
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-[0.9375rem] leading-relaxed">{item.text}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </BlockSection>
  )
}
