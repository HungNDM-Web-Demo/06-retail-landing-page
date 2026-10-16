'use client'

import {
  BadgeCheck,
  Banknote,
  Clock,
  Droplet,
  Droplets,
  Feather,
  FileCheck,
  FlaskConical,
  Gift,
  Heart,
  Layers,
  Leaf,
  type LucideIcon,
  PackageCheck,
  RefreshCcw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  ThermometerSun,
  Truck,
} from 'lucide-react'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { cn } from '@/lib/utils'

/** Icon theo `landingIconNames` (config/landing-labels.ts); tên lạ → Sparkles */
const ICONS: Record<string, LucideIcon> = {
  Leaf,
  Truck,
  PackageCheck,
  ThermometerSun,
  Droplets,
  Droplet,
  ScanFace,
  Layers,
  Sparkles,
  ShieldCheck,
  Sun,
  Feather,
  FileCheck,
  FlaskConical,
  BadgeCheck,
  RefreshCcw,
  Banknote,
  Heart,
  Clock,
  Gift,
}

export function LandingIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || Sparkles
  return <Icon className={className} aria-hidden="true" />
}

/**
 * Ảnh có khung giữ tỉ lệ, nền màu để không nhảy bố cục khi ảnh tải chậm hoặc lỗi (UC-01 E2).
 * Đọc được ảnh `/seed/…`, `/uploads/…` và ảnh tải lên ở mock (`idb://`).
 */
export function LandingImage({
  src,
  alt,
  width,
  height,
  priority,
  className,
  imgClassName,
}: {
  src?: string | null
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
  imgClassName?: string
}) {
  const url = useAssetUrl(src)
  return (
    <div
      className={cn('relative overflow-hidden bg-[var(--landing-soft)]', className)}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh seed đã nén WebP, ảnh tải lên có thể là blob:
        <img
          src={url}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          className={cn('absolute inset-0 size-full object-cover', imgClassName)}
        />
      ) : null}
    </div>
  )
}

/** Tiêu đề khối: dòng nhỏ + tiêu đề + phụ đề, căn giữa */
export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  className,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  className?: string
}) {
  return (
    <div className={cn('mb-6 space-y-2 text-center', className)}>
      {eyebrow ? (
        <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="text-[1.5rem] leading-tight font-bold tracking-tight text-balance text-[var(--landing-ink)]">
        {title}
      </h2>
      {subtitle ? <p className="text-muted-foreground mx-auto max-w-[34ch] text-[0.9375rem] text-pretty">{subtitle}</p> : null}
    </div>
  )
}

/** Hàng sao 1–5; số sao đọc bằng chữ cho trình đọc màn hình */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const rounded = Math.round(rating)
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('size-4', i <= rounded ? 'fill-[var(--landing-star)] text-[var(--landing-star)]' : 'text-border')}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

/** Chữ viết tắt khi thiếu avatar: "Nguyễn Thanh Vân" → "NV" */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Khung khối: khoảng đệm đều, nền xen kẽ */
export function BlockSection({
  id,
  tone = 'plain',
  className,
  children,
  labelledBy,
}: {
  id?: string
  tone?: 'plain' | 'soft' | 'surface'
  className?: string
  children: React.ReactNode
  labelledBy?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'scroll-mt-4 px-4 py-10',
        tone === 'soft' && 'bg-[var(--landing-soft)]',
        tone === 'surface' && 'bg-[var(--landing-surface)]',
        className
      )}
    >
      {children}
    </section>
  )
}
