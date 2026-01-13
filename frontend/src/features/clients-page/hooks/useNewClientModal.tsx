import { useState, type ChangeEvent, type FormEvent } from "react";
import { type ClientFormData } from "../types/client";

const initialFormData: ClientFormData = {
    name: "",
    email: "",
    phone: "",
    cpf: ""
};

export function useNewClientModal() {

    const [formData, setFormData] = useState<ClientFormData>(initialFormData);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;
        switch (name) {
            case "cpf":
                formattedValue = formatCPF(value);
                break;

            case "phone":
                formattedValue = formatPhone(value);
                break;
            case "name":
                formattedValue = formatName(value);
                break;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: formattedValue
        }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const email = validateEmail(formData.email);
        console.log(email);
    };

    return {
        formData,
        handleChange,
        handleSubmit
    };
}


function formatCPF(cpf: string): string {
    const digits = cpf.replace(/\D/g, "").slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "").slice(0, 13);
    
    if (digits.length === 0) return "";
    
    const parts = [
        digits.slice(0, 2),
        digits.slice(2, 4),
        digits.slice(4, 9),
        digits.slice(9)
    ].filter(Boolean);
    
    if (parts.length === 1) return `+${parts[0]}`;
    if (parts.length === 2) return `+${parts[0]} (${parts[1]}`;
    if (parts.length === 3) return `+${parts[0]} (${parts[1]}) ${parts[2]}`;
    return `+${parts[0]} (${parts[1]}) ${parts[2]}-${parts[3]}`;
}

function formatName(name: string): string {
    const lowerWords = ["de", "da", "do", "das", "dos"];
    return name
        .toLowerCase()
        .split(" ")
        .map((word, index) => {
            if (index !== 0 && lowerWords.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

function validateEmail(email: string): boolean {
    // Regex para validar formato: algo@algo.algo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}