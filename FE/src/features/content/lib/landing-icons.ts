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
  PackageCheck,
  RefreshCcw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Sun,
  ThermometerSun,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { landingIconNames } from '@/config/landing-labels'

export type LandingIconName = (typeof landingIconNames)[number]

/** Tên icon trong `landingIconNames` → component lucide (màn sửa nội dung chọn icon, FR-17) */
export const landingIcons: Record<LandingIconName, LucideIcon> = {
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

export const isLandingIcon = (name: string | null | undefined): name is LandingIconName =>
  !!name && (landingIconNames as readonly string[]).includes(name)
