'use client'

import { Ban } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { landingIconNames } from '@/config/landing-labels'
import { landingIcons } from '../lib/landing-icons'

const NONE = '__none'

type IconSelectProps = {
  value: string
  onChange: (name: string) => void
  disabled?: boolean
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Chọn icon trong `landingIconNames`, hiện hình icon lucide (FR-17) */
export function IconSelect({ value, onChange, disabled, ...triggerProps }: IconSelectProps) {
  return (
    <Select
      value={value || NONE}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger aria-label="Biểu tượng" {...triggerProps} className="w-full">
        <SelectValue placeholder="Chọn biểu tượng" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={NONE}>
          <Ban className="text-muted-foreground" aria-hidden="true" />
          Không có
        </SelectItem>
        {landingIconNames.map((name) => {
          const Icon = landingIcons[name]
          return (
            <SelectItem key={name} value={name}>
              <Icon aria-hidden="true" />
              {name}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
