import type { ReactNode } from 'react';

import { cn } from './common';

/** Shared section heading for the photo and recorded-video editors. */
export function StudioSectionHeading({
  step,
  title,
  description,
  id,
}: {
  step: string;
  title: string;
  description?: ReactNode;
  id?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex items-center gap-3',
        'border-b border-line pb-4',
      )}
    >
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded',
          'bg-primary-soft text-caption font-semibold text-primary-hover',
        )}
      >
        {step}
      </span>
      <div>
        <h2 id={id} className="text-heading-3 font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-body text-muted max-[800px]:text-caption">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
