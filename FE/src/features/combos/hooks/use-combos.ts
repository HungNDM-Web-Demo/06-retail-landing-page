'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PUBLIC_QUERY_ROOT } from '@/lib/query-client'
import type { ComboDto, SaveComboRequest, UpdatePromotionRequest } from '@/types/landing'
import { comboService } from '../services/combo.service'
import { promotionService } from '../services/promotion.service'

/** Query key theo 07 §4.9 */
export const comboKeys = {
  combos: ['combos'] as const,
  promotion: ['promotion'] as const,
}

export function useCombos() {
  return useQuery({ queryKey: comboKeys.combos, queryFn: () => comboService.getList() })
}

export function usePromotion() {
  return useQuery({ queryKey: comboKeys.promotion, queryFn: () => promotionService.get() })
}

/** Sau khi ghi: làm mới combo, landing công khai (UC-11 bước 4), tổng quan, đơn (tên combo) */
function useInvalidateCombos() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: comboKeys.combos })
    void queryClient.invalidateQueries({ queryKey: [PUBLIC_QUERY_ROOT] })
  }
}

export function useSaveCombo() {
  const invalidate = useInvalidateCombos()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SaveComboRequest }) =>
      id ? comboService.update(id, input) : comboService.create(input),
    onSuccess: invalidate,
  })
}

export function useSetComboVisibility() {
  const invalidate = useInvalidateCombos()
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      comboService.setVisibility(id, { isVisible }),
    onSettled: invalidate,
  })
}

export function useSetDefaultCombo() {
  const invalidate = useInvalidateCombos()
  return useMutation({
    mutationFn: (id: string) => comboService.setDefault(id),
    onSettled: invalidate,
  })
}

/** Sắp xếp: đổi thứ tự trong cache ngay để bảng không giật, lỗi thì tải lại */
export function useReorderCombos() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCombos()
  return useMutation({
    mutationFn: (ids: string[]) => comboService.reorder({ ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: comboKeys.combos })
      queryClient.setQueryData<ComboDto[]>(comboKeys.combos, (list) => {
        if (!list) return list
        const byId = new Map(list.map((c) => [c.id, c]))
        return ids
          .map((id, i) => byId.get(id) && { ...byId.get(id)!, sortOrder: (i + 1) * 10 })
          .filter((c): c is ComboDto => !!c)
      })
    },
    onSettled: invalidate,
  })
}

export function useDeleteCombo() {
  const invalidate = useInvalidateCombos()
  return useMutation({
    mutationFn: (id: string) => comboService.remove(id),
    onSuccess: invalidate,
  })
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdatePromotionRequest) => promotionService.update(input),
    onSuccess: (data) => {
      queryClient.setQueryData(comboKeys.promotion, data)
      void queryClient.invalidateQueries({ queryKey: [PUBLIC_QUERY_ROOT] })
    },
  })
}
