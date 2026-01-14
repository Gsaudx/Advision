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
            case "name":
                formattedValue = formatName(value);
                break;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: formattedValue
        }));
    };

    const handlePhoneChange = (value: string | undefined) => {
        setFormData((prev) => ({
            ...prev,
            phone: value ?? ""
        }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // TODO: implement form validation and submission
        validateEmail(formData.email);
    };

    return {
        formData,
        handleChange,
        handlePhoneChange,
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}