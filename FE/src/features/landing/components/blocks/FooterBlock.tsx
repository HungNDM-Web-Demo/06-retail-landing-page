'use client'

import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useBrand } from '@/features/settings/hooks/use-settings'
import { useAssetUrl } from '@/hooks/use-asset-url'
import { formatPhone } from '@/lib/format'
import type { PublicBlock } from '@/types/landing'
import { useLandingContext } from '../landing-context'

/** Chân trang: thông tin shop (`store.*`), chính sách dạng accordion, `body`, dòng PUM nền (Company.*) */
export function FooterBlock({ block }: { block: PublicBlock }) {
  const { page } = useLandingContext()
  const { store } = page
  const { company } = useBrand()
  const logo = useAssetUrl(store.logoUrl)
  const tel = store.hotline.replace(/[^\d+]/g, '')

  return (
    <footer className="bg-[var(--landing-ink)] px-4 pt-10 pb-28 text-[var(--landing-surface)]">
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo SVG
          <img src={logo} alt="" width={40} height={40} className="size-10 rounded-xl bg-[var(--landing-surface)] p-1" />
        ) : null}
        <div>
          <p className="text-lg font-bold">{store.name || block.title}</p>
          {store.tagline || block.subtitle ? <p className="text-sm opacity-80">{store.tagline || block.subtitle}</p> : null}
        </div>
      </div>

      <ul className="mt-6 space-y-3 text-sm">
        {store.hotline ? (
          <li>
            <a href={`tel:${tel}`} className="inline-flex min-h-11 items-center gap-2.5 font-semibold underline-offset-4 hover:underline">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              Hotline: {store.hotline}
            </a>
          </li>
        ) : null}
        {store.email ? (
          <li className="flex items-center gap-2.5 opacity-90">
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            {store.email}
          </li>
        ) : null}
        {store.address ? (
          <li className="flex items-start gap-2.5 opacity-90">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {store.address}
          </li>
        ) : null}
        {store.workingHours ? (
          <li className="flex items-center gap-2.5 opacity-90">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {store.workingHours}
          </li>
        ) : null}
      </ul>

      {block.items.length > 0 ? (
        <Accordion type="single" collapsible className="mt-6 border-t border-[var(--landing-surface)]/15">
          {block.items.map((item, i) => (
            <AccordionItem key={i} value={`policy-${i}`} className="border-[var(--landing-surface)]/15">
              <AccordionTrigger className="min-h-12 text-[0.9375rem] font-semibold hover:no-underline [&_svg]:text-[var(--landing-surface)]/70">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed opacity-85">{item.text}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : null}

      {block.body ? <p className="mt-6 text-xs leading-relaxed opacity-75">{block.body}</p> : null}
      {store.businessInfo ? <p className="mt-2 text-xs opacity-75">{store.businessInfo}</p> : null}
      {company.name ? (
        <p className="mt-6 border-t border-[var(--landing-surface)]/15 pt-4 text-xs opacity-75">
          Bản trình diễn do {company.name} thực hiện
          {company.hotline ? ` · Zalo/điện thoại ${formatPhone(company.hotline)}` : ''}
        </p>
      ) : null}
    </footer>
  )
}
