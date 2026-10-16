'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import { useProduct, useUpdateProduct } from '../hooks/use-content'
import {
  formToProductRequest,
  productFormSchema,
  productToForm,
  type ProductFormValues,
} from '../schemas/content.schema'
import { ImageField } from './ImageField'

const EMPTY: ProductFormValues = {
  name: '',
  shortName: '',
  volume: '',
  unit: '',
  shortDescription: '',
  imageUrl: '',
}

/** Tab Sản phẩm (07 §2.4; 06 §4 Cms_Products): tên dùng làm tiêu đề trang, mô tả ngắn làm meta (NFR-04) */
export function ProductForm({ canEdit }: { canEdit: boolean }) {
  const product = useProduct()
  const update = useUpdateProduct()
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY,
  })
  const { errors, isDirty } = form.formState
  const data = product.data

  useEffect(() => {
    if (data) form.reset(productToForm(data))
  }, [data, form])

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(formToProductRequest(values), {
      onSuccess: () => toast.success('Đã lưu thông tin sản phẩm'),
      onError: (error) => {
        if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
      },
    })
  })

  if (product.error)
    return <ErrorState error={product.error} onRetry={() => void product.refetch()} />
  if (!data)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="bg-card text-card-foreground rounded-xl border shadow-xs"
    >
      <header className="flex items-center justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Sản phẩm {data.code}</h2>
          <p className="text-muted-foreground text-sm">
            Một landing một sản phẩm; tên và mô tả ngắn dùng cho tiêu đề trang, ảnh chia sẻ.
          </p>
        </div>
        {canEdit && (
          <Button type="submit" disabled={!isDirty || update.isPending}>
            {update.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Lưu sản phẩm
          </Button>
        )}
      </header>
      <fieldset
        disabled={!canEdit || update.isPending}
        className="grid gap-4 px-5 py-4 sm:grid-cols-2"
      >
        <FormField
          label="Tên sản phẩm"
          required
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input autoComplete="off" {...form.register('name')} />
        </FormField>
        <FormField
          label="Tên ngắn"
          required
          error={errors.shortName?.message}
          hint="Dùng trong câu ngắn, vd: Serum Rau Má."
        >
          <Input autoComplete="off" {...form.register('shortName')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Dung tích" required error={errors.volume?.message}>
            <Input autoComplete="off" placeholder="vd: 30 ml" {...form.register('volume')} />
          </FormField>
          <FormField label="Đơn vị" required error={errors.unit?.message} hint='Hiện "…/chai".'>
            <Input autoComplete="off" placeholder="vd: chai" {...form.register('unit')} />
          </FormField>
        </div>
        <FormField
          label="Mô tả ngắn"
          required
          error={errors.shortDescription?.message}
          hint="Tối đa 500 ký tự; dùng làm mô tả khi chia sẻ link."
          className="sm:col-span-2"
        >
          <Textarea rows={3} {...form.register('shortDescription')} />
        </FormField>
        <FormField label="Ảnh sản phẩm" error={errors.imageUrl?.message} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <ImageField
                value={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
                name="ảnh sản phẩm"
              />
            )}
          />
        </FormField>
      </fieldset>
    </form>
  )
}
