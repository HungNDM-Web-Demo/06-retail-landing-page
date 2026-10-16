import { isApiError } from '@/lib/api-error'

/** Mã lỗi nghiệp vụ `code` trong ProblemDetails (07 §2.8); vắng → undefined. Dùng ở giao diện để rẽ nhánh. */
export function problemCode(error: unknown): string | undefined {
  if (!isApiError(error)) return undefined
  const code = (error.problem as Record<string, unknown>).code
  return typeof code === 'string' ? code : undefined
}

/** Trường mở rộng của ProblemDetails, vd `order` kèm 409 DonDaThayDoi */
export function problemExtra<T>(error: unknown, key: string): T | undefined {
  if (!isApiError(error)) return undefined
  return (error.problem as Record<string, unknown>)[key] as T | undefined
}
