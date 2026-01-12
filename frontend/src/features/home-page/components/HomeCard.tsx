import type { ReactNode } from 'react';

interface HomeCardProps {
  title: string;
  icon?: ReactNode;
  content: ReactNode;
}

export default function HomeCard({ title, icon, content }: HomeCardProps) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-900/50 shadow-lg shadow-blue-950 p-4 sm:p-6 min-h-40 sm:min-h-52 lg:min-h-64 border-2 border-blue-400">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4 text-blue-400 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="text-blue-400">{content}</div>
    </div>
  );
}
