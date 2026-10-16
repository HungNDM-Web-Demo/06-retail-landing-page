'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api-error'
import type {
  HandoverRequest,
  OrderDetailDto,
  OrderQuery,
  ReassignRequest,
  SetReceivingRequest,
} from '@/types/landing'
import { problemCode, problemExtra } from '../lib/problem'
import { orderService, telesaleService } from '../services/order.service'

/** Màn đơn hàng tự làm mới 30 giây và khi tab hiện lại (NFR-05, 07 §2.9) */
export const ORDERS_REFRESH_MS = 30_000

export function useOrders(query: OrderQuery) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: () => orderService.getList(query),
    placeholderData: keepPreviousData,
    refetchInterval: ORDERS_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

export function useOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getById(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
  })
}

export function useTelesales(enabled = true) {
  return useQuery({
    queryKey: ['telesales'],
    queryFn: () => telesaleService.getList(),
    enabled,
  })
}

/**
 * Sau một thao tác đổi đơn: thay cache chi tiết bằng DTO trả về, làm mới danh sách và Tổng quan (07 §4.9).
 * 409 DonDaThayDoi → toast đúng câu, thay cache bằng `order` trong lỗi (07 §4.5).
 */
export function useOrderAction<TVars>(
  orderId: string | null | undefined,
  fn: (vars: TVars) => Promise<OrderDetailDto>,
  options: { success?: string | ((order: OrderDetailDto) => string) } = {}
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      queryClient.setQueryData(['order', order.id], order)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['telesales'] })
      // Đơn cùng số điện thoại có thể đổi nhãn Trùng: làm mới các chi tiết khác đang mở
      void queryClient.invalidateQueries({
        queryKey: ['order'],
        predicate: (q) => q.queryKey[1] !== order.id,
      })
      const message =
        typeof options.success === 'function' ? options.success(order) : options.success
      if (message) toast.success(message)
    },
    onError: (error) => handleOrderError(queryClient, orderId, error),
  })
}

/** Hiện lỗi thao tác đơn; xung đột phiên bản thì nạp bản mới nhất vào cache */
export function handleOrderError(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string | null | undefined,
  error: unknown
) {
  const code = problemCode(error)
  if (code === 'DonDaThayDoi' || code === 'DonDaCoNguoiNhan') {
    const latest = problemExtra<OrderDetailDto>(error, 'order')
    if (latest) queryClient.setQueryData(['order', latest.id], latest)
    else if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
  }
  if (code === 'DonCuaNguoiKhac' || code === 'KhongTimThayDon') {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
  }
  toast.error(getErrorMessage(error))
}

function useBulkInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
    void queryClient.invalidateQueries({ queryKey: ['order'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['telesales'] })
  }
}

export function useHandover() {
  const refresh = useBulkInvalidate()
  return useMutation({
    mutationFn: (input: HandoverRequest) => orderService.handover(input),
    onSuccess: (result) => {
      refresh()
      if (result.skipped) toast.warning(result.message)
      else toast.success(result.message)
    },
  })
}

export function useReassign() {
  const refresh = useBulkInvalidate()
  return useMutation({
    mutationFn: (input: ReassignRequest) => orderService.reassign(input),
    onSuccess: (result) => {
      refresh()
      toast.success(result.message)
    },
  })
}

export function useSetReceiving() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetReceivingRequest) => telesaleService.setMyReceiving(input),
    onSuccess: (me) => {
      void queryClient.invalidateQueries({ queryKey: ['telesales'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(
        me.isReceiving ? 'Đã bật nhận đơn' : 'Đã tắt nhận đơn, đơn mới sẽ không chia cho bạn'
      )
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useExportOrderRows() {
  return (query: OrderQuery) => orderService.exportRows(query)
}
