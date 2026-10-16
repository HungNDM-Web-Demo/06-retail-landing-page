import { apiRoutes } from '@/config/api-routes'
import { apiCall } from '@/lib/axios'
import { isMockMode } from '@/lib/data-source'
import type {
  ComboDto,
  ReorderRequest,
  SaveComboRequest,
  SetVisibilityRequest,
} from '@/types/landing'
import { comboMock } from '../mock/combo.mock'

/** Combo (07 §2.3): mock hoặc BE theo NEXT_PUBLIC_DATA_SOURCE */
export const comboService = {
  getList: (): Promise<ComboDto[]> =>
    isMockMode() ? comboMock.getList() : apiCall.get<ComboDto[]>(apiRoutes.combos.list),

  create: (input: SaveComboRequest): Promise<ComboDto> =>
    isMockMode() ? comboMock.create(input) : apiCall.post<ComboDto>(apiRoutes.combos.list, input),

  update: (id: string, input: SaveComboRequest): Promise<ComboDto> =>
    isMockMode()
      ? comboMock.update(id, input)
      : apiCall.put<ComboDto>(apiRoutes.combos.detail(id), input),

  setVisibility: (id: string, input: SetVisibilityRequest): Promise<void> =>
    isMockMode()
      ? comboMock.setVisibility(id, input)
      : apiCall.patch(apiRoutes.combos.visibility(id), input),

  setDefault: (id: string): Promise<void> =>
    isMockMode() ? comboMock.setDefault(id) : apiCall.put(apiRoutes.combos.setDefault(id)),

  reorder: (input: ReorderRequest): Promise<void> =>
    isMockMode() ? comboMock.reorder(input) : apiCall.put(apiRoutes.combos.order, input),

  remove: (id: string): Promise<void> =>
    isMockMode() ? comboMock.remove(id) : apiCall.delete(apiRoutes.combos.detail(id)),
}
