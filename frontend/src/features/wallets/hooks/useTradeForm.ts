import { useState, useMemo, type ChangeEvent } from 'react';
import { getFormErrors } from '@/lib/utils';
import { getLocalDateTimeString, localToISO } from '@/lib/formatters';
import type { TradeFormData, TradeInput, TradeType, Position } from '../types';
import { generateIdempotencyKey } from '../types';

interface UseTradeFormProps {
  tradeType: TradeType;
  currentBalance: number;
  positions: Position[];
  onSubmit: (data: TradeInput) => void;
}

function getInitialFormData(): TradeFormData {
  return {
    ticker: '',
    quantity: '',
    price: '',
    date: getLocalDateTimeString(),
  };
}

export function useTradeForm({
  tradeType,
  currentBalance,
  positions,
  onSubmit,
}: UseTradeFormProps) {
  const [formData, setFormData] = useState<TradeFormData>(getInitialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalValue = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    return qty * price;
  }, [formData.quantity, formData.price]);

  const selectedPosition = useMemo(() => {
    if (!formData.ticker) return null;
    return (
      positions.find(
        (p) => p.ticker.toUpperCase() === formData.ticker.toUpperCase(),
      ) || null
    );
  }, [formData.ticker, positions]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'ticker') {
      formattedValue = value.toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const quantity = parseFloat(formData.quantity);
    const price = parseFloat(formData.price);
    const total = quantity * price;

    const validations = [
      {
        isInvalid: !formData.ticker.trim(),
        message: 'Digite o ticker do ativo.',
        inputName: 'ticker',
      },
      {
        isInvalid: formData.ticker.trim().length > 20,
        message: 'O ticker deve ter no maximo 20 caracteres.',
        inputName: 'ticker',
      },
      {
        isInvalid: !formData.quantity || isNaN(quantity),
        message: 'Digite uma quantidade valida.',
        inputName: 'quantity',
      },
      {
        isInvalid: quantity <= 0,
        message: 'A quantidade deve ser maior que zero.',
        inputName: 'quantity',
      },
      {
        isInvalid: !formData.price || isNaN(price),
        message: 'Digite um preco valido.',
        inputName: 'price',
      },
      {
        isInvalid: price <= 0,
        message: 'O preco deve ser maior que zero.',
        inputName: 'price',
      },
      {
        isInvalid: tradeType === 'BUY' && total > currentBalance,
        message: `Saldo insuficiente. Disponivel: R$ ${currentBalance.toFixed(2)}`,
        inputName: 'quantity',
      },
      {
        isInvalid: tradeType === 'SELL' && !selectedPosition,
        message: 'Voce nao possui este ativo na carteira.',
        inputName: 'ticker',
      },
      {
        isInvalid:
          tradeType === 'SELL' &&
          !!selectedPosition &&
          quantity > selectedPosition.quantity,
        message: `Quantidade insuficiente. Disponivel: ${selectedPosition?.quantity ?? 0}`,
        inputName: 'quantity',
      },
      {
        isInvalid: !formData.date,
        message: 'Selecione uma data.',
        inputName: 'date',
      },
    ];

    const errorList = getFormErrors(validations);

    if (errorList) {
      setErrors(errorList);
      return;
    }

    setErrors({});

    const tradeData: TradeInput = {
      ticker: formData.ticker.trim().toUpperCase(),
      quantity,
      price,
      date: localToISO(formData.date),
      idempotencyKey: generateIdempotencyKey(),
    };

    onSubmit(tradeData);
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setErrors({});
  };

  return {
    formData,
    errors,
    totalValue,
    selectedPosition,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData,
    setErrors,
  };
}
