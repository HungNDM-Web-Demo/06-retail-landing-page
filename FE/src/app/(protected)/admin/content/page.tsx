import type { Metadata } from 'next'
import { ContentPage } from '@/features/content/pages/ContentPage'

export const metadata: Metadata = { title: 'Nội dung landing' }

export default function Page() {
  return <ContentPage />
}
