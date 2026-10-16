'use client'

import { useRef } from 'react'
import { ImageIcon, ImageUp, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import { useUploadContentImage } from '../hooks/use-content'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, imageMessages } from '../lib/content-messages'

type ImageFieldProps = {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  /** Tên ảnh cho nút và chữ thay thế, vd "ảnh trước" */
  name?: string
  /** FormField gắn id, aria-* vào ô nhập đường dẫn */
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Ô ảnh: xem nhỏ, nhập đường dẫn hoặc tải ảnh (POST /api/uploads/images, mock lưu IndexedDB; 07 §2.4) */
export function ImageField({
  value,
  onChange,
  disabled,
  name = 'ảnh',
  ...inputProps
}: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadContentImage()
  const src = useAssetUrl(value || null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return void toast.error(imageMessages.type)
    if (file.size > MAX_IMAGE_BYTES) return void toast.error(imageMessages.size)
    upload.mutate(file, {
      onSuccess: (image) => onChange(image.url),
      onError: (error) =>
        toast.error(Object.values(getFieldErrors(error))[0] ?? getErrorMessage(error)),
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh idb:// hoặc blob: không qua next/image
          <img src={src} alt={name} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-4" aria-hidden="true" />
        )}
      </span>
      <Input
        aria-label={`Đường dẫn ${name}`}
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        placeholder="/seed/... hoặc tải ảnh lên"
        className="min-w-0 flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Tải ${name} lên`}
        title={`Tải ${name} lên`}
        disabled={disabled || upload.isPending}
        onClick={() => fileRef.current?.click()}
      >
        {upload.isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <ImageUp aria-hidden="true" />
        )}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Bỏ ${name}`}
          title={`Bỏ ${name}`}
          disabled={disabled}
          onClick={() => onChange('')}
        >
          <X aria-hidden="true" />
        </Button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
