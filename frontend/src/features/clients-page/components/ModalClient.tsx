import ModalBase from "@/components/layout/ModalBase";
import type { Client } from "../types/client";

interface ModalClientProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    selectedClient: Client | null;
    size?: "sm" | "md" | "lg" | "xl" | "xxl";
}

export default function ModalClient({ isOpen, onClose, title, selectedClient, size }: ModalClientProps) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} title={title} size={size}>
            <div className="flex gap-20 items-start">
                <div className="flex flex-col items-center">
                    <div className="w-60 h-60 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {selectedClient?.profilePhoto ? (
                            <img 
                                src={selectedClient.profilePhoto} 
                                alt={selectedClient.name} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-4xl text-gray-500">
                                {selectedClient?.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <p className="mt-3 font-semibold text-center">{selectedClient?.name}</p>
                </div>
                <div className="flex-1 space-y-5 pt-2">
                    <p><strong>Email:</strong> {selectedClient?.email}</p>
                    <p><strong>Telefone:</strong> {selectedClient?.phone}</p>
                    <p><strong>Investimento Total:</strong> R$ {selectedClient?.investmentTotal.toLocaleString("pt-BR")}</p>
                    <p><strong>Perfil de Risco:</strong> {selectedClient?.riskProfile}</p>
                    <p><strong>Status:</strong> {selectedClient?.status}</p>
                    <p><strong>Criado em:</strong> {selectedClient?.createdAt}</p>
                </div>
            </div>
            <div>
                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        onClick={() => {/* inativar */}}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                        </svg>
                        Inativar
                    </button>
                    <button 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => {/* alterar */}}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Alterar
                    </button>
                    <button 
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => {/* excluir */}}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Excluir
                    </button>
                </div>
            </div>
        </ModalBase>
    )
}