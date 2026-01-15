import { useState, type ChangeEvent, type FormEvent } from "react";
import { type ClientFormData } from "../types";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getFormErrors } from "@/lib/utils";
import { useCreateClient } from "../api/useCreateClient";

const initialFormData: ClientFormData = {
    name: "",
    email: "",
    phone: "",
    cpf: ""
};

export function useNewClientModal() {
    const [formData, setFormData] = useState<ClientFormData>(initialFormData);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

        // Limpa erro do campo ao alterar
        setErrors((prev) => ({
            ...prev,
            [name]: ""
        }));
    };

    const handlePhoneChange = (value: string | undefined) => {
        setFormData((prev) => ({
            ...prev,
            phone: value ?? ""
        }));
        setErrors((prev) => ({
            ...prev,
            phone: ""
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validations = [

            {
                isInvalid: !formData.name,
                message: "Digite um nome.",
                inputName: "name"
            },
            {
                isInvalid: !validateName(formData.name),
                message: "O nome digitado deve conter apenas letras e espaços, números e caracteres especiais não são permitidos.",
                inputName: "name"
            },
            {
                isInvalid: !formData.email,
                message: "Digite um email.",
                inputName: "email"
            },
            {
                isInvalid: !validateEmail(formData.email),
                message: "O email digitado é inválido. O formato aceito é exemplo@dominio.com",
                inputName: "email"
            },
            {
                isInvalid: !formData.cpf,
                message: "Digite um CPF.",
                inputName: "cpf"
            },
            {
                isInvalid: !validarCPF(formData.cpf),
                message: "CPF informado é inválido.",
                inputName: "cpf"
            },
            {
                isInvalid: !validatePhoneNumber(formData.phone),
                message: "Telefone informado é inválido.",
                inputName: "phone"
            }
        ];

        const errorList = getFormErrors(validations);

        if (errorList) {
            setErrors(errorList);
            return;
        }

        setErrors({}); // Limpa erros anteriores

        const newUser = {
            name: formatPostName(formData.name),
            email: formData.email,
            phone: formData.phone,
            cpf: formatPostCPF(formData.cpf)
        };

        useCreateClient(newUser);
    };

    return {
        formData,
        errors,
        handleChange,
        handlePhoneChange,
        handleSubmit,
        setFormData,
        setErrors
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

function validateName(name: string): boolean {
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
    return nameRegex.test(name.trim());
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validarCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]+/g, '');

    // Verifica se tem 11 dígitos ou se é uma sequência repetida conhecida
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) {
        return false;
    }

    // Transforma a string em array de números
    const digitos = cpf.split('').map(el => +el);

    // Função para calcular o dígito verificador
    const calcularDigito = (count: number): number => {
        let soma = 0;
        for (let i = 0; i < count; i++) {
            soma += digitos[i] * ((count + 1) - i);
        }
        let resto = (soma * 10) % 11;
        return resto === 10 || resto === 11 ? 0 : resto;
    };

    // Valida o primeiro e o segundo dígito
    const dg1 = calcularDigito(9);
    const dg2 = calcularDigito(10);

    return dg1 === digitos[9] && dg2 === digitos[10];
}

function validatePhoneNumber(phoneNumber: string): boolean {
    const phone = parsePhoneNumberFromString(phoneNumber);
    return phone ? phone.isValid() : false;
}

function formatPostName(name: string): string {
    return name.trim().toUpperCase();
}

function formatPostCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
}