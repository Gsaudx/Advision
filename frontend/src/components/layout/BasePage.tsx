import { Header } from './Header';
import type { ReactNode } from 'react';

interface BasePageProps {
  children: ReactNode;
}

export function BasePage({ children }: BasePageProps) {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="bg-slate-950 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
