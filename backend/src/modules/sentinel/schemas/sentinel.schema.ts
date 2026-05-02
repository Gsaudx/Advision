export interface SseEventPayload {
  type: 'dividends_updated' | 'check_complete';
  data?: unknown;
}

// Resposta da OpLab para GET /v3/market/options/{symbol}
export interface OpLabOptionFlat {
  symbol: string;
  due_date: string;
  strike: number;
  strike_eod: number;
  bid: number;
  ask: number;
  volume: number;
  days_to_maturity: number;
  category: 'CALL' | 'PUT';
  maturity_type: string;
}

// Resposta da OpLab para GET /v3/market/historical/options/{spot}/{from}/{to}
export interface OpLabHistoricalEntry {
  symbol: string;
  time: string; // ISO date "2026-04-23T00:00:00.000Z"
  strike: number;
  close?: number;  // prêmio de fechamento da opção
  due_date: string;
  type: 'CALL' | 'PUT';
  spot: { price: number; symbol: string };
}
