'use client'

import { ArrowDown, ArrowUp, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { blockTypeLabels } from '@/config/landing-labels'
import { getErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import type { LandingBlockDto } from '@/types/landing'
import { useReorderBlocks, useSetBlockVisibility } from '../hooks/use-content'

type BlockListProps = {
  blocks: LandingBlockDto[] | undefined
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  canEdit: boolean
}

/**
 * Danh sách 12 khối theo thứ tự trên landing (FR-04, FR-17; quyết định 6): lên/xuống thay kéo thả,
 * công tắc hiện/ẩn; Hero luôn đầu, Footer luôn cuối, Hero/Order/Footer luôn hiển thị.
 */
export function BlockList({ blocks, isLoading, selectedId, onSelect, canEdit }: BlockListProps) {
  const reorder = useReorderBlocks()
  const visibility = useSetBlockVisibility()
  const list = blocks ?? []
  const busy = reorder.isPending || visibility.isPending

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )

  const move = (index: number, delta: -1 | 1) => {
    const ids = list.map((b) => b.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids, { onError: (e) => toast.error(getErrorMessage(e)) })
  }

  const last = list.length - 1
  // Hero ở 0, Footer ở cuối: khối giữa chỉ đổi chỗ trong khoảng [1, last - 1]
  const canMoveUp = (b: LandingBlockDto, i: number) =>
    b.type !== 'Hero' && b.type !== 'Footer' && i > 1
  const canMoveDown = (b: LandingBlockDto, i: number) =>
    b.type !== 'Hero' && b.type !== 'Footer' && i < last - 1

  return (
    <ol className="space-y-1.5" aria-label="Khối nội dung theo thứ tự trên landing">
      {list.map((b, i) => {
        const label = blockTypeLabels[b.type]
        const selected = b.id === selectedId
        return (
          <li
            key={b.id}
            className={cn(
              'flex items-center gap-1 rounded-lg border pr-1 transition-colors duration-150',
              selected ? 'border-primary/50 bg-primary/5' : 'bg-card hover:bg-muted/50'
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(b.id)}
              aria-current={selected ? 'true' : undefined}
              className="focus-visible:ring-ring/50 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 text-left outline-none focus-visible:ring-3"
            >
              <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-sm font-medium',
                    !b.isVisible && 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
                <span className="text-muted-foreground block truncate text-xs">{b.title}</span>
              </span>
            </button>

            {b.isRequired ? (
              <span className="text-muted-foreground flex shrink-0 items-center gap-1 px-1 text-xs">
                <Lock className="size-3.5" aria-hidden="true" />
                Luôn hiển thị
              </span>
            ) : (
              <label className="flex min-h-10 shrink-0 items-center gap-1.5 px-1 text-xs">
                <Switch
                  checked={b.isVisible}
                  disabled={!canEdit || busy}
                  aria-label={`Hiện khối ${label}`}
                  onCheckedChange={(isVisible) =>
                    visibility.mutate(
                      { id: b.id, isVisible },
                      {
                        onSuccess: () =>
                          toast.success(
                            isVisible ? `Đã hiện khối ${label}` : `Đã ẩn khối ${label}`
                          ),
                        onError: (e) => toast.error(getErrorMessage(e)),
                      }
                    )
                  }
                />
                <span className={cn(!b.isVisible && 'text-muted-foreground')}>
                  {b.isVisible ? 'Hiện' : 'Ẩn'}
                </span>
              </label>
            )}

            {canEdit && (
              <div className="flex shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Đưa khối ${label} lên trên`}
                  title={b.type === 'Hero' ? 'Banner chính luôn ở đầu' : undefined}
                  disabled={!canMoveUp(b, i) || busy}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Đưa khối ${label} xuống dưới`}
                  title={b.type === 'Footer' ? 'Chân trang luôn ở cuối' : undefined}
                  disabled={!canMoveDown(b, i) || busy}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
