import type { Metadata } from 'next'
import { CombosPage } from '@/features/combos/pages/CombosPage'

export const metadata: Metadata = { title: 'Combo và khuyến mãi' }

export default function Page() {
  return <CombosPage />
}
