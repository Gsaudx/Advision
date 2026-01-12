import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { ReactNode } from 'react';
import PageTitle from './PageTitle';

interface BasePageProps {
  children: ReactNode;
  title?: string;
}

export function BasePage({ children, title }: BasePageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {title && <PageTitle title={title} />}
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
