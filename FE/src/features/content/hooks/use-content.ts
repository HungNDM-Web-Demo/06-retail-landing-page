'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PUBLIC_QUERY_ROOT } from '@/lib/query-client'
import type {
  LandingBlockDto,
  ReviewQuery,
  SaveReviewRequest,
  UpdateLandingBlockRequest,
  UpdateProductRequest,
} from '@/types/landing'
import { contentService } from '../services/content.service'

/** Query key theo 07 §4.9 */
export const contentKeys = {
  product: ['product'] as const,
  blocks: ['landing-blocks'] as const,
  reviews: ['reviews'] as const,
  reviewList: (query: ReviewQuery) => ['reviews', query] as const,
}

/** Ghi xong: làm mới dữ liệu đang sửa và landing công khai (FR-17) */
function useInvalidate(key: readonly unknown[]) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: [PUBLIC_QUERY_ROOT] })
  }
}

// ───────────── Sản phẩm ─────────────

export function useProduct() {
  return useQuery({ queryKey: contentKeys.product, queryFn: () => contentService.getProduct() })
}

export function useUpdateProduct() {
  const invalidate = useInvalidate(contentKeys.product)
  return useMutation({
    mutationFn: (input: UpdateProductRequest) => contentService.updateProduct(input),
    onSuccess: invalidate,
  })
}

// ───────────── Khối nội dung ─────────────

export function useLandingBlocks() {
  return useQuery({ queryKey: contentKeys.blocks, queryFn: () => contentService.getBlocks() })
}

export function useUpdateBlock() {
  const invalidate = useInvalidate(contentKeys.blocks)
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLandingBlockRequest }) =>
      contentService.updateBlock(id, input),
    onSuccess: invalidate,
  })
}

export function useSetBlockVisibility() {
  const invalidate = useInvalidate(contentKeys.blocks)
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      contentService.setBlockVisibility(id, { isVisible }),
    onSettled: invalidate,
  })
}

/** Sắp xếp khối: đổi cache ngay, lỗi thì tải lại */
export function useReorderBlocks() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate(contentKeys.blocks)
  return useMutation({
    mutationFn: (ids: string[]) => contentService.reorderBlocks({ ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: contentKeys.blocks })
      queryClient.setQueryData<LandingBlockDto[]>(contentKeys.blocks, (list) => {
        if (!list) return list
        const byId = new Map(list.map((b) => [b.id, b]))
        return ids.flatMap((id, i) => {
          const block = byId.get(id)
          return block ? [{ ...block, sortOrder: (i + 1) * 10 }] : []
        })
      })
    },
    onSettled: invalidate,
  })
}

// ───────────── Đánh giá ─────────────

export function useReviews(query: ReviewQuery) {
  return useQuery({
    queryKey: contentKeys.reviewList(query),
    queryFn: () => contentService.getReviews(query),
    placeholderData: keepPreviousData,
  })
}

export function useSaveReview() {
  const invalidate = useInvalidate(contentKeys.reviews)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SaveReviewRequest }) =>
      id ? contentService.updateReview(id, input) : contentService.createReview(input),
    onSuccess: invalidate,
  })
}

export function useSetReviewVisibility() {
  const invalidate = useInvalidate(contentKeys.reviews)
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      contentService.setReviewVisibility(id, { isVisible }),
    onSettled: invalidate,
  })
}

/** Đổi chỗ một đánh giá với đánh giá liền trước/sau trong toàn danh sách rồi gửi đủ id (FR-18) */
export function useMoveReview() {
  const invalidate = useInvalidate(contentKeys.reviews)
  return useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: -1 | 1 }) => {
      const ids = await contentService.getAllReviewIds()
      const index = ids.indexOf(id)
      const target = index + delta
      if (index < 0 || target < 0 || target >= ids.length) return
      ;[ids[index], ids[target]] = [ids[target], ids[index]]
      await contentService.reorderReviews({ ids })
    },
    onSettled: invalidate,
  })
}

// ───────────── Ảnh ─────────────

export function useUploadContentImage() {
  return useMutation({ mutationFn: (file: File) => contentService.uploadImage(file) })
}
