'use client'

import { ExternalLink, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { appConfig } from '@/config/app.config'
import { demoLandingLinks } from '@/config/landing-labels'
import { routePath } from '@/config/route-path'

/**
 * Thẻ "Xem landing page" ở trang đăng nhập (07 §4.2 bước 1, chỉ khi bật demo): mở landing, link UTM mẫu
 * (mỗi link một tab mới) để thử luồng "khách đặt hàng từ quảng cáo → telesale thấy đơn mới" trên một trình duyệt.
 */
export function LandingDemoCard() {
  if (!appConfig.demoToolbar) return null
  return (
    <section aria-labelledby="landing-demo-title" className="border-border bg-card space-y-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Megaphone className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="landing-demo-title" className="font-semibold">
            Xem landing page
          </h2>
          <p className="text-muted-foreground text-sm">Đăng nhập Telesale ở tab này để thấy đơn mới</p>
        </div>
      </div>
      <Button asChild variant="cta" className="w-full">
        <a href={routePath.root} target="_blank" rel="noopener">
          Mở landing page
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </Button>
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">Mở như khách đến từ quảng cáo:</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {demoLandingLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener"
                className="border-border hover:bg-muted flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 text-sm"
              >
                <span className="truncate">{link.label}</span>
                <ExternalLink className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
