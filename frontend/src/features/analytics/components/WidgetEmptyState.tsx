import { type ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  hint?: string;
}

export function WidgetEmptyState({ icon, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-container-high text-on-surface-variant/70 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-on-surface font-semibold text-sm">{title}</p>
      {hint && (
        <p className="text-on-surface-variant text-xs mt-1 max-w-xs">{hint}</p>
      )}
    </div>
  );
}
