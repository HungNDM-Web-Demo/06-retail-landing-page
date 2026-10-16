'use client'

import { useEffect } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Info, Loader2, Plus, Save, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { blockTypeLabels } from '@/config/landing-labels'
import { applyFieldErrors, getErrorMessage } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import type { LandingBlockDto, UpdateLandingBlockRequest } from '@/types/landing'
import { useUpdateBlock } from '../hooks/use-content'
import {
  blockFields,
  imageItemFields,
  multilineItemFields,
  type ItemField,
} from '../lib/block-fields'
import { blockLimits } from '../lib/content-messages'
import {
  blockFormSchema,
  blockToForm,
  emptyItem,
  formToBlockRequest,
  type BlockFormValues,
} from '../schemas/content.schema'
import { IconSelect } from './IconSelect'
import { ImageField } from './ImageField'

type BlockEditorProps = {
  block: LandingBlockDto
  canEdit: boolean
  /** Báo nội dung đang gõ để khung xem trước cập nhật ngay (FR-17) */
  onDraftChange?: (draft: UpdateLandingBlockRequest) => void
}

/**
 * Form sửa một khối theo loại (FR-17, 06 §4 Cms_LandingBlocks): tiêu đề, phụ đề, nội dung, ảnh, chữ nút,
 * mục `items` thêm/xóa/lên xuống, chọn icon, tải ảnh. Cha đặt `key={block.id}` để đổi khối là form mới.
 */
export function BlockEditor({ block, canEdit, onDraftChange }: BlockEditorProps) {
  const config = blockFields[block.type]
  const update = useUpdateBlock()
  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockFormSchema(block.type)),
    defaultValues: blockToForm(block),
  })
  const { errors, isDirty } = form.formState
  const watched = useWatch({ control: form.control })
  useEffect(() => {
    if (!onDraftChange) return
    const base = blockToForm(block)
    const values = {
      ...base,
      ...watched,
      items: (watched.items ?? base.items).map((item) => ({ ...emptyItem, ...item })),
    } as BlockFormValues
    onDraftChange(formToBlockRequest(values))
  }, [watched, block, onDraftChange])
  const items = useFieldArray({ control: form.control, name: 'items' })
  const itemFields = Object.entries(config.items?.fields ?? {}) as [ItemField, string][]
  const label = blockTypeLabels[block.type]

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      { id: block.id, input: formToBlockRequest(values) },
      {
        onSuccess: (saved) => {
          toast.success(`Đã lưu khối ${label}`)
          form.reset(blockToForm(saved))
        },
        onError: (error) => {
          if (!applyFieldErrors(form.setError, error)) toast.error(getErrorMessage(error))
        },
      }
    )
  })

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="bg-card text-card-foreground rounded-xl border shadow-xs"
      aria-label={`Sửa khối ${label}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            {label}
            {!block.isVisible && <StatusBadge tone="neutral">Đang ẩn</StatusBadge>}
          </h2>
          <p className="text-muted-foreground text-xs">
            Cập nhật {formatDateTime(block.updatedAt)}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!isDirty || update.isPending}
              onClick={() => form.reset(blockToForm(block))}
            >
              <Undo2 aria-hidden="true" />
              Hoàn tác
            </Button>
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Lưu khối
            </Button>
          </div>
        )}
      </header>

      <fieldset disabled={!canEdit || update.isPending} className="grid gap-4 px-5 py-4">
        {config.note && (
          <p className="bg-info/10 text-info flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {config.note}
          </p>
        )}
        <FormField label="Tiêu đề" required error={errors.title?.message}>
          <Input autoComplete="off" {...form.register('title')} />
        </FormField>
        <FormField label="Phụ đề" error={errors.subtitle?.message}>
          <Textarea rows={2} {...form.register('subtitle')} />
        </FormField>
        {config.body && (
          <FormField
            label={config.body}
            error={errors.body?.message}
            hint={`Tối đa ${blockLimits.body.toLocaleString('vi-VN')} ký tự, xuống dòng giữ nguyên.`}
          >
            <Textarea rows={4} {...form.register('body')} />
          </FormField>
        )}
        {config.imageUrl && (
          <FormField label="Ảnh" error={errors.imageUrl?.message}>
            <Controller
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <ImageField value={field.value} onChange={field.onChange} disabled={!canEdit} />
              )}
            />
          </FormField>
        )}
        {config.ctaText && (
          <FormField label="Chữ nút" error={errors.ctaText?.message}>
            <Input
              autoComplete="off"
              placeholder="vd: Đặt hàng ngay"
              {...form.register('ctaText')}
            />
          </FormField>
        )}

        {config.items && (
          <section
            aria-label={`Danh sách ${config.items.label.toLowerCase()}`}
            className="space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {config.items.label} ({items.fields.length}/{blockLimits.items})
              </h3>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={items.fields.length >= blockLimits.items}
                  onClick={() => items.append({ ...emptyItem })}
                >
                  <Plus aria-hidden="true" />
                  Thêm {config.items.label.toLowerCase()}
                </Button>
              )}
            </div>
            {errors.items?.message && (
              <p role="alert" className="text-destructive text-[0.8125rem]">
                {errors.items.message}
              </p>
            )}
            {items.fields.length === 0 && (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
                Chưa có mục nào.
              </p>
            )}
            <ol className="space-y-3">
              {items.fields.map((item, i) => {
                const itemErrors = errors.items?.[i]
                return (
                  <li key={item.id} className="bg-muted/30 rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {config.items!.label} {i + 1}
                      </span>
                      {canEdit && (
                        <div className="flex">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Đưa mục ${i + 1} lên trên`}
                            disabled={i === 0}
                            onClick={() => items.move(i, i - 1)}
                          >
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Đưa mục ${i + 1} xuống dưới`}
                            disabled={i === items.fields.length - 1}
                            onClick={() => items.move(i, i + 1)}
                          >
                            <ArrowDown aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Xóa mục ${i + 1}`}
                            onClick={() => items.remove(i)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3">
                      {itemFields.map(([field, fieldLabel]) => {
                        const error = itemErrors?.[field]?.message
                        const name = `items.${i}.${field}` as const
                        if (field === 'icon')
                          return (
                            <FormField key={field} label={fieldLabel} error={error}>
                              <Controller
                                control={form.control}
                                name={name}
                                render={({ field: f }) => (
                                  <IconSelect
                                    value={f.value}
                                    onChange={f.onChange}
                                    disabled={!canEdit}
                                  />
                                )}
                              />
                            </FormField>
                          )
                        if (imageItemFields.includes(field))
                          return (
                            <FormField key={field} label={fieldLabel} error={error}>
                              <Controller
                                control={form.control}
                                name={name}
                                render={({ field: f }) => (
                                  <ImageField
                                    value={f.value}
                                    onChange={f.onChange}
                                    disabled={!canEdit}
                                    name={fieldLabel.toLowerCase()}
                                  />
                                )}
                              />
                            </FormField>
                          )
                        return (
                          <FormField key={field} label={fieldLabel} error={error}>
                            {multilineItemFields.includes(field) ? (
                              <Textarea rows={2} {...form.register(name)} />
                            ) : (
                              <Input autoComplete="off" {...form.register(name)} />
                            )}
                          </FormField>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </fieldset>
    </form>
  )
}
