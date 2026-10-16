import { ApiError } from '@/lib/api-error'
import { validation } from '@/mock/mock-errors'

/**
 * Lỗi nghiệp vụ có `code` (07 §2.8) cho handler mock quản trị: ProblemDetails kèm trường mở rộng `code`
 * để FE rẽ nhánh không so chuỗi; `detail` đúng câu bảng mã lỗi. Dùng chung cho orders, combos, content, reports.
 */
export function salesProblem(
  status: 400 | 403 | 404 | 409 | 429,
  code: string,
  detail: string,
  extensions: Record<string, unknown> = {}
): ApiError {
  return ApiError.fromStatus(status, detail, { code, ...extensions })
}

/** 400 theo trường; một lỗi thì `detail` là chính câu đó (07 §2.8) */
export function fieldErrors(errors: Record<string, string>): ApiError {
  const messages = Object.values(errors)
  return validation(errors, messages.length === 1 ? messages[0] : 'Dữ liệu gửi lên không hợp lệ.')
}
