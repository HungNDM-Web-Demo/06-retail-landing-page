import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type { PromotionDto, UpdatePromotionRequest } from '@/types/landing'
import { promotionMock } from '../mock/promotion.mock'

/** Khuyến mãi (07 §2.2): mock hoặc BE theo NEXT_PUBLIC_DATA_SOURCE */
export const promotionService = {
  get: (): Promise<PromotionDto> =>
    isMockMode() ? promotionMock.get() : apiCall.get<PromotionDto>(apiRoutes.promotion),

  update: (input: UpdatePromotionRequest): Promise<PromotionDto> =>
    isMockMode()
      ? promotionMock.update(input)
      : apiCall.put<PromotionDto>(apiRoutes.promotion, input),
}
