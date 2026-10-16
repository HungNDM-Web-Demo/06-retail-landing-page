'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Loader2, Megaphone, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { demoLandingLinks } from '@/config/landing-labels'
import { landingUrl } from '@/config/route-path'
import { getErrorMessage } from '@/lib/api-error'
import { readJson, storageKey, writeJson } from '@/lib/storage'
import { simulateAdOrder } from '../lib/simulate-order'

const NEXT_VISITOR_KEY = storageKey('demo-next-visitor')

/**
 * Mục "Landing" của thanh công cụ demo (07 §4.2 bước 2): mở landing theo nguồn, giả lập đơn từ quảng cáo,
 * mở landing như khách khác (`?visitor=N`, N tăng dần) để thử đơn trùng từ "trình duyệt khác" (TC-20, TC-21).
 */
export function LandingDemoTools({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const simulate = async () => {
    setBusy(true)
    try {
      const { result, sourceText } = await simulateAdOrder()
      toast.success(`Đã tạo đơn ${result.order.code} từ ${sourceText}`, {
        description: `${result.order.customerName} · ${result.order.comboName} × ${result.order.quantity}`,
      })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Chưa giả lập được đơn'))
    } finally {
      setBusy(false)
    }
  }

  const openAsOtherVisitor = () => {
    const n = Math.max(2, readJson<number>('local', NEXT_VISITOR_KEY) ?? 2)
    writeJson('local', NEXT_VISITOR_KEY, n + 1)
    window.open(landingUrl({ visitor: n }), '_blank', 'noopener')
    onDone?.()
  }

  return (
    <div className="space-y-2.5">
      <Button variant="cta" className="w-full justify-start" onClick={simulate} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Megaphone className="size-4" aria-hidden="true" />}
        Giả lập đơn từ quảng cáo
      </Button>
      <Button variant="outline" className="w-full justify-start" onClick={openAsOtherVisitor}>
        <UserPlus className="size-4" aria-hidden="true" />
        Mở landing như khách khác
      </Button>
      <div className="grid grid-cols-2 gap-1.5">
        {demoLandingLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener"
            onClick={() => onDone?.()}
            className="border-border hover:bg-muted flex min-h-9 items-center justify-between gap-1.5 rounded-md border px-2.5 text-xs"
          >
            <span className="truncate">{link.label}</span>
            <ExternalLink className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  )
}
