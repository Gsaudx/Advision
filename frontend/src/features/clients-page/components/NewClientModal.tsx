import ModalBase from "@/components/layout/ModalBase"
import InputCpf from "@/components/ui/InputCpf";
import InputEmail from "@/components/ui/InputEmail";
import InputName from "@/components/ui/InputName";
import InputPhone from "@/components/ui/InputPhone";
import { User, X } from "lucide-react";
import { useNewClientModal } from "../hooks/useNewClientModal";

interface ModalClientProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: "sm" | "md" | "lg" | "xl" | "xxl";
}

export default function NewClientModal({ isOpen, onClose, title, size }: ModalClientProps) {
    const { formData, errors, handleChange, handlePhoneChange, handleSubmit } = useNewClientModal();

    const handleClose = () => {
        onClose();
    };

    return (
        <ModalBase isOpen={isOpen} onClose={handleClose} title={title} size={size} backgroundColor="bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">Novo Cliente</h2>
                </div>
                <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-6">
                <div className="flex flex-col">
                    <InputName
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.name ? 'border-red-500' : 'border-slate-600'}`}
                        placeholder="Digite o nome completo do cliente"
                    />
                    {errors.name && <span className="text-red-500 text-sm">{errors.name}</span>}
                </div>
                <div className="flex flex-col">
                    <InputEmail
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.email ? 'border-red-500' : 'border-slate-600'}`}
                        placeholder="Digite o e-mail do cliente"
                    />
                    {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <InputPhone
                            inputId="phone"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            containerClassName="flex flex-col gap-1.5 sm:gap-2"
                            inputClassName={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.phone ? 'border-red-500' : 'border-slate-600'}`}
                            size="lg"
                            error={!!errors.phone}
                            errorMessage={errors.phone}
                        />
                    </div>
                    <div className="flex flex-col">
                        <InputCpf
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleChange}
                            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.cpf ? 'border-red-500' : 'border-slate-600'}`}
                            placeholder="000.000.000-00"
                        />
                        {errors.cpf && <span className="text-red-500 text-sm">{errors.cpf}</span>}
                    </div>
                </div>

                {/* Footer com botões */}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                        Cadastrar Cliente
                    </button>
                </div>
            </form>
        </ModalBase>
    )
}