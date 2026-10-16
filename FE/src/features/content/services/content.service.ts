import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type { PaginatedResult } from '@/types/api'
import type {
  LandingBlockDto,
  ProductDto,
  ReorderRequest,
  ReviewDto,
  ReviewQuery,
  SaveReviewRequest,
  SetVisibilityRequest,
  UpdateLandingBlockRequest,
  UpdateProductRequest,
} from '@/types/landing'
import { contentMock } from '../mock/content.mock'

/** Nội dung landing (07 §2.4): sản phẩm, khối, đánh giá, tải ảnh; mock hoặc BE */
export const contentService = {
  getProduct: (): Promise<ProductDto> =>
    isMockMode() ? contentMock.getProduct() : apiCall.get<ProductDto>(apiRoutes.product),

  updateProduct: (input: UpdateProductRequest): Promise<ProductDto> =>
    isMockMode()
      ? contentMock.updateProduct(input)
      : apiCall.put<ProductDto>(apiRoutes.product, input),

  getBlocks: (): Promise<LandingBlockDto[]> =>
    isMockMode()
      ? contentMock.getBlocks()
      : apiCall.get<LandingBlockDto[]>(apiRoutes.landingBlocks.list),

  updateBlock: (id: string, input: UpdateLandingBlockRequest): Promise<LandingBlockDto> =>
    isMockMode()
      ? contentMock.updateBlock(id, input)
      : apiCall.put<LandingBlockDto>(apiRoutes.landingBlocks.detail(id), input),

  setBlockVisibility: (id: string, input: SetVisibilityRequest): Promise<void> =>
    isMockMode()
      ? contentMock.setBlockVisibility(id, input)
      : apiCall.patch(apiRoutes.landingBlocks.visibility(id), input),

  reorderBlocks: (input: ReorderRequest): Promise<void> =>
    isMockMode()
      ? contentMock.reorderBlocks(input)
      : apiCall.put(apiRoutes.landingBlocks.order, input),

  getReviews: (query: ReviewQuery): Promise<PaginatedResult<ReviewDto>> =>
    isMockMode()
      ? contentMock.getReviews(query)
      : apiCall.get<PaginatedResult<ReviewDto>>(apiRoutes.reviews.list, { params: query }),

  createReview: (input: SaveReviewRequest): Promise<ReviewDto> =>
    isMockMode()
      ? contentMock.createReview(input)
      : apiCall.post<ReviewDto>(apiRoutes.reviews.list, input),

  updateReview: (id: string, input: SaveReviewRequest): Promise<ReviewDto> =>
    isMockMode()
      ? contentMock.updateReview(id, input)
      : apiCall.put<ReviewDto>(apiRoutes.reviews.detail(id), input),

  setReviewVisibility: (id: string, input: SetVisibilityRequest): Promise<void> =>
    isMockMode()
      ? contentMock.setReviewVisibility(id, input)
      : apiCall.patch(apiRoutes.reviews.visibility(id), input),

  reorderReviews: (input: ReorderRequest): Promise<void> =>
    isMockMode() ? contentMock.reorderReviews(input) : apiCall.put(apiRoutes.reviews.order, input),

  /** POST /api/uploads/images của nền; ghi `url` trả về vào imageUrl, avatarUrl… (07 §2.4) */
  uploadImage: (file: File): Promise<{ url: string }> => {
    if (isMockMode()) return contentMock.uploadImage(file)
    const form = new FormData()
    form.append('file', file)
    return apiCall.post<{ url: string }>(apiRoutes.uploads.images, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** Mọi id đánh giá theo thứ tự hiện tại (sắp xếp cần đủ danh sách, 07 §2.4) */
  async getAllReviewIds(): Promise<string[]> {
    const ids: string[] = []
    for (let page = 1; ; page++) {
      const result = await contentService.getReviews({ page, pageSize: 100 })
      ids.push(...result.items.map((r) => r.id))
      if (!result.hasNextPage) return ids
    }
  },
}
