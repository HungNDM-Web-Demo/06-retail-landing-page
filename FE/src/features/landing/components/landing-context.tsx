'use client'

import { createContext, useContext } from 'react'
import type { LandingPageDto, PublicPromotion } from '@/types/landing'

/** Dữ liệu chung cho các khối: trang, khuyến mãi mới nhất, chế độ xem trước (màn Nội dung landing) */
export type LandingContextValue = {
  page: LandingPageDto
  promotion: PublicPromotion
  /** Khung xem trước: không ghi lượt, không gửi đơn, không cuộn trang ngoài */
  preview: boolean
  onPromotionExpire?: () => void
  /** Cuộn tới khối combo (FR-05) */
  scrollToOrder: () => void
}

export const ORDER_ANCHOR_ID = 'dat-hang'

const LandingContext = createContext<LandingContextValue | null>(null)

export const LandingProvider = LandingContext.Provider

export function useLandingContext(): LandingContextValue {
  const value = useContext(LandingContext)
  if (!value) throw new Error('useLandingContext phải nằm trong LandingProvider')
  return value
}
