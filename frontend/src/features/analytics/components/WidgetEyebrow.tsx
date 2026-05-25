import { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  label: string;
  hint?: string;
}

export function WidgetEyebrow({ icon, label, hint }: Props) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-extrabold whitespace-nowrap">
        {label}
      </span>
      {hint && (
        <span className="text-[10px] tracking-wide text-on-surface-variant/70 font-medium ml-auto whitespace-nowrap">
          {hint}
        </span>
      )}
    </div>
  );
}
