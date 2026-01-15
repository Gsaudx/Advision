import ModalBase from "@/components/layout/ModalBase";
import type { Client } from "../types";
import { Briefcase, Flag, Mail, MapPin, MoreVertical, Pencil, Phone, Trash2, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ModalClientProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    selectedClient: Client | null;
    size?: "sm" | "md" | "lg" | "xl" | "xxl";
}

export default function ModalClient({ isOpen, onClose, title, selectedClient, size }: ModalClientProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getInitial = (name: string | undefined) => {
        return name?.charAt(0).toUpperCase() || "?";
    };

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fecha o dropdown quando o modal fecha
    useEffect(() => {
        if (!isOpen) {
            setIsDropdownOpen(false);
        }
    }, [isOpen]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose} title={title} size={size} backgroundColor="bg-white">
            <div className="absolute top-4 right-4 z-20" ref={dropdownRef}>
                <div className="flex items-center gap-2">
                    <button 
                        className="text-white hover:text-gray-200 bg-black/20 rounded-full p-2 backdrop-blur-sm"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <MoreVertical size={20} />
                    </button>
                    <button 
                        className="text-white hover:text-gray-200 bg-black/20 rounded-full p-2 backdrop-blur-sm"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-30">
                        <button 
                            className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-all"
                            
                        >
                            <Pencil size={16} />
                            <span>Editar</span>
                        </button>
                        <button 
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-all"
                            
                        >
                            <Trash2 size={16} />
                            <span>Excluir</span>
                        </button>
                        <button 
                            className="w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2 transition-all"
                            
                        >
                            <Flag size={16} />
                            <span>Inativar</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Banner Superior - 75% da altura */}
            <div className="bg-gray-600 h-60 relative border-l border-r border-t border-gray-700 rounded-t-xl">
            </div>

            {/* Foto de perfil sobreposta */}
            <div className="flex flex-col items-center -mt-[190px] relative z-10 px-6 ">
                {selectedClient?.profilePhoto ? (
                    <img
                        src={selectedClient.profilePhoto}
                        alt={selectedClient?.name || "Cliente"}
                        className="w-64 h-64 rounded-xl object-cover shadow-2xl ring-8 ring-white"
                    />
                ) : (
                    <div className="w-64 h-64 rounded-xl bg-blue-500 flex items-center justify-center shadow-2xl ring-2 ring-white">
                        <span className="text-6xl font-bold text-white">
                            {getInitial(selectedClient?.name)}
                        </span>
                    </div>
                )}

                <div className="p-6 w-full flex flex-col items-start">
                    <h2 className="text-4xl font-bold text-black mt-4">{selectedClient?.name}</h2>
                    <p className="text-md text-black mt-1 mb-6">{selectedClient?.riskProfile}</p>
                </div>
            </div>

            {/* Área de conteúdo - 25% */}
            <div className="px-6 pb-6">
                {/* Informações de contato */}
                <div className="space-y-4 pl-6">
                    <div className="flex items-center gap-3 text-sm text-black">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Mail size={18} className="text-blue-600" />
                        </div>
                        <span className="font-medium">{selectedClient?.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-black">
                        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Phone size={18} className="text-green-600" />
                        </div>
                        <span className="font-medium">{selectedClient?.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-black">
                        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <MapPin size={18} className="text-red-600" />
                        </div>
                        <span className="font-medium">teste</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-black">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Briefcase size={18} className="text-purple-600" />
                        </div>
                        <span className="font-medium">teste</span>
                    </div>
                </div>
            </div>
        </ModalBase>
    )
}