'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { provinces } from '@/config/landing-labels'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { ReviewDto } from '@/types/landing'
import { useSaveReview } from '../hooks/use-content'
import {
  emptyReviewForm,
  formToReviewRequest,
  reviewFormSchema,
  reviewToForm,
  type ReviewFormValues,
} from '../schemas/content.schema'
import { ImageField } from './ImageField'

type ReviewFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  review: ReviewDto | null
}

/** Thêm, sửa đánh giá (FR-18, NFR-06: đánh giá minh họa có chữ "Minh họa") */
export function ReviewFormDialog({ open, onOpenChange, review }: ReviewFormDialogProps) {
  const save = useSaveReview()
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: emptyReviewForm,
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) form.reset(review ? reviewToForm(review) : emptyReviewForm)
  }, [open, review, form])

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { id: review?.id, input: formToReviewRequest(values) },
      {
        onSuccess: (saved) => {
          toast.success(
            review
              ? `Đã lưu đánh giá của ${saved.customerName}`
              : `Đã thêm đánh giá của ${saved.customerName}`
          )
          onOpenChange(false)
        },
        onError: (error) => {
          if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{review ? 'Sửa đánh giá' : 'Thêm đánh giá'}</DialogTitle>
          <DialogDescription>
            {review
              ? 'Thay đổi hiện trên landing ở lần tải kế tiếp.'
              : 'Đánh giá mới nằm cuối danh sách và hiện ngay trên landing.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col">
          <div className="grid max-h-[calc(100dvh-14rem)] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <FormField label="Tên khách" required error={errors.customerName?.message}>
              <Input
                autoComplete="off"
                placeholder="vd: Nguyễn Thu Hà"
                {...form.register('customerName')}
              />
            </FormField>
            <FormField label="Tỉnh/thành" required error={errors.province?.message}>
              <Controller
                control={form.control}
                name="province"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn tỉnh/thành" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <fieldset className="grid gap-1.5 sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium">
                Số sao{' '}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </legend>
              <Controller
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Số sao" className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={field.value === n}
                        aria-label={`${n} sao`}
                        onClick={() => field.onChange(n)}
                        className="focus-visible:ring-ring/50 hover:bg-muted flex size-10 items-center justify-center rounded-md outline-none focus-visible:ring-3"
                      >
                        <Star
                          className={cn(
                            'size-6',
                            n <= field.value ? 'fill-warning text-warning' : 'text-muted-foreground'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.rating && (
                <p role="alert" className="text-destructive text-[0.8125rem]">
                  {errors.rating.message}
                </p>
              )}
            </fieldset>

            <FormField
              label="Nội dung đánh giá"
              required
              error={errors.content?.message}
              className="sm:col-span-2"
            >
              <Textarea rows={4} {...form.register('content')} />
            </FormField>
            <FormField label="Ảnh đại diện" error={errors.avatarUrl?.message}>
              <Controller
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <ImageField value={field.value} onChange={field.onChange} name="ảnh đại diện" />
                )}
              />
            </FormField>
            <FormField label="Ảnh khách gửi" error={errors.photoUrl?.message}>
              <Controller
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <ImageField value={field.value} onChange={field.onChange} name="ảnh khách gửi" />
                )}
              />
            </FormField>
            <FormField
              label="Ngày đánh giá (giờ Việt Nam)"
              error={errors.reviewedAt?.message}
              hint="Để trống là bây giờ."
            >
              <Input type="datetime-local" {...form.register('reviewedAt')} />
            </FormField>
            <label className="flex min-h-10 cursor-pointer items-center gap-3 self-end text-sm font-medium">
              <Controller
                control={form.control}
                name="isSample"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              Dữ liệu minh họa (hiện chữ &quot;Minh họa&quot;)
            </label>
          </div>

          <DialogFooter className="bg-muted/30 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {review ? 'Lưu thay đổi' : 'Thêm đánh giá'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
