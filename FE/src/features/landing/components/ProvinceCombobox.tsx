'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { provinces } from '@/config/landing-labels'
import { normalizeVi } from '@/lib/normalize'
import { cn } from '@/lib/utils'

/**
 * Chọn tỉnh/thành có tìm không dấu (NFR-02): gõ "ha noi", "hcm" đều ra. Danh sách hiện ngay dưới ô
 * (không portal) để dùng tốt trên điện thoại; phím ↑ ↓ Enter Esc. Chỉ nhận giá trị trong danh mục 34 tỉnh/thành.
 */
const ALIASES: Record<string, string> = { hcm: 'TP. Hồ Chí Minh', 'sai gon': 'TP. Hồ Chí Minh', hn: 'Hà Nội' }

/** Bỏ dấu, dấu chấm, gộp khoảng trắng: "TP. Hồ Chí Minh" → "tp ho chi minh" */
const key = (value: string) => normalizeVi(value).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export function ProvinceCombobox({
  id,
  value,
  onChange,
  onBlur,
  onFocus,
  invalid,
  describedBy,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onFocus?: () => void
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}) {
  const listId = useId()
  const [query, setQuery] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const options = useMemo(() => {
    const q = key(query ?? '')
    if (!q) return [...provinces]
    const alias = ALIASES[q]
    const found = provinces.filter((p) => key(p).includes(q))
    return alias && !found.includes(alias as (typeof provinces)[number]) ? [alias, ...found] : found
  }, [query])

  const choose = (province: string) => {
    onChange(province)
    setQuery(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        data-slot="input"
        placeholder="Gõ để tìm, vd: ha noi"
        value={query ?? value}
        onFocus={() => {
          onFocus?.()
          setOpen(true)
          setActive(Math.max(0, options.indexOf(value as (typeof provinces)[number])))
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
          if (!e.target.value) onChange('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(options.length - 1, i + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(0, i - 1))
          } else if (e.key === 'Enter' && open && options[active]) {
            e.preventDefault()
            choose(options[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
            setQuery(null)
          }
        }}
        onBlur={() => {
          // Gõ đúng một tỉnh (không dấu) thì nhận luôn; còn lại trả về giá trị đã chọn
          if (query !== null) {
            const exact = provinces.find((p) => key(p) === key(query))
            if (exact) onChange(exact)
            else if (options.length === 1 && key(query)) onChange(options[0])
            setQuery(null)
          }
          setTimeout(() => setOpen(false), 120)
          onBlur()
        }}
        className={cn(
          'border-input h-12 w-full rounded-xl border bg-[var(--landing-surface)] pr-10 pl-3.5 text-base outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-3'
        )}
      />
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="border-border absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-[var(--landing-surface)] py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="text-muted-foreground px-3.5 py-3 text-sm">Không tìm thấy tỉnh/thành</li>
          ) : (
            options.map((province, i) => (
              <li
                key={province}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={province === value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(province)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center justify-between px-3.5 text-[0.9375rem]',
                  i === active && 'bg-[var(--landing-soft)]'
                )}
              >
                {province}
                {province === value ? <Check className="text-primary size-4" aria-hidden="true" /> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
