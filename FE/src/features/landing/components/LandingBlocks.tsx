'use client'

import type { PublicBlock } from '@/types/landing'
import { BeforeAfterBlock } from './blocks/BeforeAfterBlock'
import { BenefitsBlock } from './blocks/BenefitsBlock'
import { FaqBlock } from './blocks/FaqBlock'
import { FeatureListBlock } from './blocks/FeatureListBlock'
import { FooterBlock } from './blocks/FooterBlock'
import { HeroBlock } from './blocks/HeroBlock'
import { IngredientsBlock } from './blocks/IngredientsBlock'
import { OrderBlock } from './blocks/OrderBlock'
import { ProblemsBlock } from './blocks/ProblemsBlock'
import { ReviewsBlock } from './blocks/ReviewsBlock'
import { SpecsBlock } from './blocks/SpecsBlock'

/** Một khối theo loại (FR-04); loại lạ thì bỏ qua */
export function BlockRenderer({ block }: { block: PublicBlock }) {
  switch (block.type) {
    case 'Hero':
      return <HeroBlock block={block} />
    case 'Problems':
      return <ProblemsBlock block={block} />
    case 'Benefits':
      return <BenefitsBlock block={block} />
    case 'Ingredients':
      return <IngredientsBlock block={block} />
    case 'Specs':
      return <SpecsBlock block={block} />
    case 'BeforeAfter':
      return <BeforeAfterBlock block={block} />
    case 'Reviews':
      return <ReviewsBlock block={block} />
    case 'Certificates':
      return <FeatureListBlock block={block} />
    case 'Commitments':
      return <FeatureListBlock block={block} emphasis />
    case 'Faq':
      return <FaqBlock block={block} />
    case 'Order':
      return <OrderBlock block={block} />
    case 'Footer':
      return <FooterBlock block={block} />
    default:
      return null
  }
}

/** Các khối theo đúng thứ tự `sortOrder` (07 §4.3) */
export function LandingBlocks({ blocks }: { blocks: PublicBlock[] }) {
  return (
    <>
      {[...blocks]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
    </>
  )
}
