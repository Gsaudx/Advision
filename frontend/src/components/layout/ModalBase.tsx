import { X } from "lucide-react";

interface ModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "xxl";
}

export default function ModalBase({
    isOpen,
    onClose,
    title,
    children,
    size = "md"
}: ModalBaseProps) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        xxl: "max-w-2xl",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative z-1000000 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 ${sizeClasses[size]} w-full mx-4 animate-scale-in`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {title && (
                        <h2 className="text-xl font-semibold text-white">{title}</h2>
                    )}
                    <button
                        onClick={onClose}
                        className="ml-auto p-1 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="text-gray-300">
                    {children}
                </div>
            </div>

            <style>{`
            @keyframes scale-in {
                from {
                transform: scale(0.5);
                opacity: 0;
                }
                to {
                transform: scale(1);
                opacity: 1;
                }
            }
            
            @keyframes fade-in {
                from {
                opacity: 0;
                }
                to {
                opacity: 1;
                }
            }
            
            .animate-scale-in {
                animation: scale-in 0.2s ease-out forwards;
            }
            
            .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
            }
            `}</style>
        </div>
    );
}