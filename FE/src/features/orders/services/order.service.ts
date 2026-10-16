import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type {
  AddNoteRequest,
  CancelOrderRequest,
  HandoverRequest,
  HandoverResult,
  OrderDetailDto,
  OrderExportRow,
  OrderListResult,
  OrderQuery,
  ReassignRequest,
  ReassignResult,
  RecordCallRequest,
  ReturnOrderRequest,
  SetReceivingRequest,
  TelesaleDto,
  UpdateOrderRequest,
  VersionRequest,
} from '@/types/landing'
import { orderMock } from '../mock/order.mock'
import { telesaleMock } from '../mock/telesale.mock'

const r = apiRoutes.orders

/** Đơn hàng, telesale (07 §2.5). Mọi thao tác đổi đơn trả `OrderDetailDto` mới. */
export const orderService = {
  getList: (query: OrderQuery): Promise<OrderListResult> =>
    isMockMode()
      ? orderMock.getList(query)
      : apiCall.get<OrderListResult>(r.list, { params: query }),

  getById: (id: string): Promise<OrderDetailDto> =>
    isMockMode() ? orderMock.getById(id) : apiCall.get<OrderDetailDto>(r.detail(id)),

  update: (id: string, input: UpdateOrderRequest): Promise<OrderDetailDto> =>
    isMockMode() ? orderMock.update(id, input) : apiCall.put<OrderDetailDto>(r.detail(id), input),

  recordCall: (id: string, input: RecordCallRequest): Promise<OrderDetailDto> =>
    isMockMode()
      ? orderMock.recordCall(id, input)
      : apiCall.post<OrderDetailDto>(r.calls(id), input),

  claim: (id: string): Promise<OrderDetailDto> =>
    isMockMode() ? orderMock.claim(id) : apiCall.post<OrderDetailDto>(r.claim(id)),

  cancel: (id: string, input: CancelOrderRequest): Promise<OrderDetailDto> =>
    isMockMode() ? orderMock.cancel(id, input) : apiCall.post<OrderDetailDto>(r.cancel(id), input),

  notDuplicate: (id: string, input: VersionRequest): Promise<OrderDetailDto> =>
    isMockMode()
      ? orderMock.notDuplicate(id, input)
      : apiCall.post<OrderDetailDto>(r.notDuplicate(id), input),

  deliver: (id: string, input: VersionRequest): Promise<OrderDetailDto> =>
    isMockMode()
      ? orderMock.deliver(id, input)
      : apiCall.post<OrderDetailDto>(r.deliver(id), input),

  returnOrder: (id: string, input: ReturnOrderRequest): Promise<OrderDetailDto> =>
    isMockMode()
      ? orderMock.returnOrder(id, input)
      : apiCall.post<OrderDetailDto>(r.return(id), input),

  addNote: (id: string, input: AddNoteRequest): Promise<OrderDetailDto> =>
    isMockMode() ? orderMock.addNote(id, input) : apiCall.post<OrderDetailDto>(r.notes(id), input),

  handover: (input: HandoverRequest): Promise<HandoverResult> =>
    isMockMode() ? orderMock.handover(input) : apiCall.post<HandoverResult>(r.handover, input),

  reassign: (input: ReassignRequest): Promise<ReassignResult> =>
    isMockMode() ? orderMock.reassign(input) : apiCall.post<ReassignResult>(r.reassign, input),

  exportRows: (query: OrderQuery): Promise<OrderExportRow[]> =>
    isMockMode()
      ? orderMock.exportRows(query)
      : apiCall.get<OrderExportRow[]>(r.exportRows, { params: query }),
}

export const telesaleService = {
  getList: (): Promise<TelesaleDto[]> =>
    isMockMode() ? telesaleMock.getList() : apiCall.get<TelesaleDto[]>(apiRoutes.telesales.list),

  setMyReceiving: (input: SetReceivingRequest): Promise<TelesaleDto> =>
    isMockMode()
      ? telesaleMock.setMyReceiving(input)
      : apiCall.put<TelesaleDto>(apiRoutes.telesales.myReceiving, input),
}
