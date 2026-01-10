import { Header } from "./Header";

interface BasePageProps {
    children: React.ReactNode;
}

export function BasePage({ children }: BasePageProps) {
    return (
        // h-screen locks height to screen, flex-col stacks Header and Content
        <div className="h-screen flex flex-col overflow-hidden">
            <Header />
            {/* flex-1 makes this div take up all remaining space below the header */}
            <div className='bg-black flex-1 overflow-auto'>
                {children}
            </div>
        </div>
    );
}