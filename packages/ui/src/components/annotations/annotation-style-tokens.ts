import { cn } from '../../lib/utils'

export function annotationColorToRgb(color?: string): string {
  switch ((color ?? 'yellow').toLowerCase()) {
    case 'green':
      return '74, 222, 128'
    case 'blue':
      return '96, 165, 250'
    case 'pink':
      return '244, 114, 182'
    case 'purple':
      return '168, 85, 247'
    case 'yellow':
    default:
      return '245, 158, 11'
  }
}

export function annotationColorToCss(color?: string): string {
  return `color-mix(in srgb, rgb(${annotationColorToRgb(color)}) var(--annotation-fill-strength, 22%), transparent)`
}

export function getAnnotationStrokeCss(
  color?: string,
  opacityVar = '--annotation-stroke-opacity',
  fallback = '0.22',
): string {
  return `rgba(${annotationColorToRgb(color)}, var(${opacityVar}, ${fallback}))`
}

export function getAnnotationChipBackground(color?: string, state: 'default' | 'pending' | 'sent' = 'default'): string {
  const token = state === 'pending'
    ? '--annotation-chip-pending-strength'
    : state === 'sent'
      ? '--annotation-chip-sent-strength'
      : '--annotation-chip-default-strength'
  const fallback = state === 'pending' ? '28%' : state === 'sent' ? '12%' : '22%'
  return `color-mix(in srgb, rgb(${annotationColorToRgb(color)}) var(${token}, ${fallback}), var(--background))`
}

export function getAnnotationRectVisual(rect: { pendingFollowUp?: boolean; sentFollowUp?: boolean; colorName?: string }) {
  const isPendingFollowUp = !!rect.pendingFollowUp

  return {
    className: cn('absolute'),
    style: {
      opacity: rect.sentFollowUp ? 0.58 : 1,
      ['--shadow-color' as string]: annotationColorToRgb(rect.colorName),
      ['--shadow-border-opacity' as string]: isPendingFollowUp ? '0.14' : '0.08',
      ['--shadow-blur-opacity' as string]: isPendingFollowUp ? '0.10' : '0.05',
      outline: `1px solid ${getAnnotationStrokeCss(
        rect.colorName,
        isPendingFollowUp ? '--annotation-pending-stroke-opacity' : '--annotation-stroke-opacity',
        isPendingFollowUp ? '0.32' : '0.22',
      )}`,
      outlineOffset: '-1px',
    },
  }
}

export function getAnnotationChipVisual(chip: { pendingFollowUp?: boolean; sentFollowUp?: boolean; colorName?: string }) {
  const pending = !!chip.pendingFollowUp
  const sent = !!chip.sentFollowUp

  return {
    className: cn(
      'absolute pointer-events-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      pending ? 'cursor-pointer hover:bg-foreground/10' : undefined,
      sent ? 'cursor-default hover:bg-foreground/5' : undefined,
      !pending && !sent ? 'cursor-pointer hover:bg-foreground/6' : undefined,
    ),
    style: {
      backgroundColor: pending
        ? getAnnotationChipBackground(chip.colorName, 'pending')
        : sent
          ? getAnnotationChipBackground(chip.colorName, 'sent')
          : getAnnotationChipBackground(chip.colorName, 'default'),
      color: sent
        ? 'var(--foreground)'
        : 'color-mix(in srgb, var(--foreground) 92%, white 8%)',
      ['--shadow-color' as string]: annotationColorToRgb(chip.colorName),
      ['--shadow-border-opacity' as string]: pending ? '0.14' : '0.05',
      ['--shadow-blur-opacity' as string]: pending ? '0.10' : '0.03',
      border: `1px solid ${getAnnotationStrokeCss(
        chip.colorName,
        pending ? '--annotation-pending-stroke-opacity' : '--annotation-stroke-opacity',
        pending ? '0.32' : '0.22',
      )}`,
    },
  }
}
