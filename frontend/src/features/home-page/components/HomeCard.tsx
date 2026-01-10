import type { ReactNode } from 'react';

interface HomeCardProps {
    title: string;
    icon?: ReactNode;
    content: ReactNode;
}

export default function HomeCard({ title, icon, content }: HomeCardProps) {
    return (
        <div className="ml-6 rounded-3xl bg-slate-900/50  shadow-lg shadow-blue-950 p-6 max-w-xl min-h-64 border-2 border-blue-400 mt-12">
            <h2 className="text-4xl font-bold mb-4 text-blue-400 flex gap-2">{icon}{title}</h2>
            <div className='text-blue-400'>{content}</div>
        </div>
    );
}