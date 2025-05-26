import { cn } from '@/lib/utils';
import type * as React from 'react';

function Progress({
  className,
  value = 0,
  max = 100,
  ...props
}: React.ComponentProps<'div'> & { value?: number; max?: number }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      data-slot="progress"
      className={cn('bg-secondary relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}

export { Progress };
