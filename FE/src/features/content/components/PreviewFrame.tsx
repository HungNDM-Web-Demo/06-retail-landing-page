import { ExternalLink, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Khung xem trước điện thoại 390 × 844 (07 §4.6, FR-17). Thu nhỏ 0,62 để vừa cột phải màn 1366.
 * Nội dung (`children`) là `LandingPreview` của FE-Landing do `ContentPreview` dựng; vắng thì hiện khung trống.
 */
export function PreviewFrame({ children }: { children?: React.ReactNode }) {
  const scale = 0.62
  return (
    <aside aria-label="Xem trước trên điện thoại" className="space-y-3">
      <div className="flex flex-col items-start gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Smartphone className="size-4" aria-hidden="true" />
          Xem trước 390 × 844
        </h2>
        <Button asChild variant="outline">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            Mở landing page
          </a>
        </Button>
      </div>
      <div
        className="bg-muted/40 border-foreground/80 mx-auto overflow-hidden rounded-[2.25rem] border-[6px] shadow-sm"
        style={{ width: 390 * scale + 12, height: 844 * scale + 12 }}
      >
        <div
          className="bg-background origin-top-left overflow-y-auto"
          style={{ width: 390, height: 844, transform: `scale(${scale})` }}
        >
          {children ?? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
              <Smartphone className="size-10" aria-hidden="true" />
              <p className="text-base">Xem trước sẽ hiện khi landing sẵn sàng</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
