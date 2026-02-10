import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MarketDataProvider,
  AssetMetadata,
  MARKET_CACHE_TTL_MS,
} from './market-data.provider';
import type { AssetSearchResult } from './yahoo-market.service';

interface CacheEntry {
  value: number;
  timestamp: number;
}

interface BrapiQuoteResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  marketCap?: number;
  logourl?: string;
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[];
  requestedAt?: string;
  took?: string;
}

interface BrapiListStock {
  stock: string;
  name: string;
  close?: number;
  change?: number;
  volume?: number;
  market_cap?: number;
  logo?: string;
  sector?: string;
  type?: string;
}

interface BrapiListResponse {
  stocks: BrapiListStock[];
  indexes?: Array<{ stock: string; name: string }>;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  totalCount?: number;
  hasNextPage?: boolean;
}

interface BrapiAvailableResponse {
  indexes: string[];
  stocks: string[];
}

const BRAPI_BASE_URL = 'https://brapi.dev/api';

/**
 * B3 Option Naming Convention:
 * - Format: {BASE}{MONTH_CODE}{STRIKE}
 * - BASE: 4-letter underlying ticker (e.g., PETR, VALE)
 * - MONTH_CODE: Single letter indicating month and option type
 *   - A-L = CALL (January-December)
 *   - M-X = PUT (January-December)
 * - STRIKE: 1-3 digits indicating strike price
 *
 * Example: PETRA240 = PETR Call January, strike ~R$24.00
 */
const CALL_MONTHS = 'ABCDEFGHIJKL';
const PUT_MONTHS = 'MNOPQRSTUVWX';

interface ParsedOption {
  underlyingTicker: string;
  optionType: 'CALL' | 'PUT';
  expirationMonth: number; // 0-11
  strikeCode: string;
  estimatedStrike: number;
}

/**
 * Parse a B3 option ticker to extract underlying asset, type, and strike
 * Handles both standard options (PETRA240) and weekly options (PETRM237W5)
 */
function parseOptionTicker(ticker: string): ParsedOption | null {
  // Option tickers: XXXX{A-X}{1-3 digits}[W{digit}]?
  // Weekly options have a W suffix followed by the week number
  const optionRegex = /^([A-Z]{4})([A-X])(\d{1,3})(W\d)?$/;
  const match = ticker.toUpperCase().match(optionRegex);

  if (!match) {
    return null;
  }

  const [, baseTicker, monthCode, strikeCode] = match;
  const upperMonthCode = monthCode.toUpperCase();

  const callIndex = CALL_MONTHS.indexOf(upperMonthCode);
  const putIndex = PUT_MONTHS.indexOf(upperMonthCode);

  if (callIndex === -1 && putIndex === -1) {
    return null;
  }

  const isCall = callIndex !== -1;
  const expirationMonth = isCall ? callIndex : putIndex;

  // Estimate strike price (B3 convention varies, but typically strike = code / 10)
  const strikeNum = parseInt(strikeCode, 10);
  const estimatedStrike = strikeNum >= 100 ? strikeNum / 10 : strikeNum;

  return {
    underlyingTicker: baseTicker,
    optionType: isCall ? 'CALL' : 'PUT',
    expirationMonth,
    strikeCode,
    estimatedStrike,
  };
}

/**
 * Calculate the expiration date for a B3 option
 * B3 options typically expire on the 3rd Friday of the expiration month
 */
function calculateExpirationDate(month: number, year?: number): Date {
  const now = new Date();
  let targetYear = year ?? now.getFullYear();

  // If the month has passed, use next year
  if (month < now.getMonth()) {
    targetYear++;
  }

  // Find the 3rd Friday of the month
  const date = new Date(targetYear, month, 1);

  // Find first Friday
  const dayOfWeek = date.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  date.setDate(1 + daysUntilFriday);

  // Move to 3rd Friday
  date.setDate(date.getDate() + 14);

  // Set to end of trading day (18:00 BRT = 21:00 UTC)
  date.setUTCHours(21, 0, 0, 0);

  return date;
}

/**
 * Check if a ticker looks like a B3 option
 */
function isOptionTicker(ticker: string): boolean {
  return parseOptionTicker(ticker) !== null;
}

@Injectable()
export class BrapiMarketService extends MarketDataProvider {
  private readonly logger = new Logger(BrapiMarketService.name);
  private readonly priceCache = new Map<string, CacheEntry>();
  private readonly token: string;

  constructor() {
    super();
    this.token = process.env.BRAPI_TOKEN ?? '';
    if (!this.token) {
      this.logger.warn(
        'BRAPI_TOKEN not configured. Some features may not work correctly.',
      );
    }
  }

  /**
   * Check if a cached price is still valid
   */
  private isCacheValid(entry: CacheEntry | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < MARKET_CACHE_TTL_MS;
  }

  private pruneCache(now = Date.now()): void {
    for (const [ticker, entry] of this.priceCache.entries()) {
      if (now - entry.timestamp >= MARKET_CACHE_TTL_MS) {
        this.priceCache.delete(ticker);
      }
    }
  }

  /**
   * Build URL with optional token
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string> = {},
  ): string {
    const url = new URL(`${BRAPI_BASE_URL}${endpoint}`);
    if (this.token) {
      url.searchParams.set('token', this.token);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  async getPrice(ticker: string): Promise<number> {
    this.pruneCache();

    const cached = this.priceCache.get(ticker);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    try {
      const url = this.buildUrl(`/quote/${ticker.toUpperCase()}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new NotFoundException(`Preço não encontrado para ${ticker}`);
      }

      const data = (await response.json()) as BrapiQuoteResponse;

      if (
        !data.results ||
        data.results.length === 0 ||
        data.results[0].regularMarketPrice === undefined
      ) {
        throw new NotFoundException(`Preço não encontrado para ${ticker}`);
      }

      const price = data.results[0].regularMarketPrice;

      this.priceCache.set(ticker, {
        value: price,
        timestamp: Date.now(),
      });

      return price;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar preço para ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Preço não encontrado para ${ticker}`);
    }
  }

  async getMetadata(ticker: string): Promise<AssetMetadata> {
    const upperTicker = ticker.toUpperCase();

    // Check if this is a B3 option ticker
    const parsedOption = parseOptionTicker(upperTicker);
    if (parsedOption) {
      return this.getOptionMetadata(upperTicker, parsedOption);
    }

    // Otherwise, fetch from Brapi as a stock
    try {
      const url = this.buildUrl(`/quote/${upperTicker}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new NotFoundException(`Ativo nao encontrado: ${ticker}`);
      }

      const data = (await response.json()) as BrapiQuoteResponse;

      if (!data.results || data.results.length === 0) {
        throw new NotFoundException(`Ativo nao encontrado: ${ticker}`);
      }

      const quote = data.results[0];

      return {
        ticker: upperTicker,
        type: 'STOCK',
        name: quote.shortName || quote.longName || upperTicker,
        sector: undefined,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar metadados para ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Ativo nao encontrado: ${ticker}`);
    }
  }

  /**
   * Build metadata for a B3 option based on parsed ticker
   */
  private async getOptionMetadata(
    ticker: string,
    parsed: ParsedOption,
  ): Promise<AssetMetadata> {
    const { underlyingTicker, optionType, expirationMonth, estimatedStrike } =
      parsed;

    // Validate that the underlying asset exists in B3
    try {
      const url = this.buildUrl(`/quote/${underlyingTicker}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new NotFoundException(
          `Ativo subjacente ${underlyingTicker} nao encontrado`,
        );
      }

      const data = (await response.json()) as BrapiQuoteResponse;

      if (!data.results || data.results.length === 0) {
        throw new NotFoundException(
          `Ativo subjacente ${underlyingTicker} nao encontrado`,
        );
      }

      const underlyingQuote = data.results[0];
      const underlyingName =
        underlyingQuote.shortName ||
        underlyingQuote.longName ||
        underlyingTicker;

      // Calculate expiration date (3rd Friday of the month)
      const expirationDate = calculateExpirationDate(expirationMonth);

      // Build option name
      const monthNames = [
        'Janeiro',
        'Fevereiro',
        'Marco',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ];
      const optionName = `${underlyingName} ${optionType} ${monthNames[expirationMonth]} R$${estimatedStrike.toFixed(2)}`;

      this.logger.log(
        `Parsed option ${ticker}: ${optionType} on ${underlyingTicker}, ` +
          `strike ~R$${estimatedStrike}, expires ${expirationDate.toISOString().slice(0, 10)}`,
      );

      return {
        ticker,
        type: 'OPTION',
        name: optionName,
        underlyingSymbol: underlyingTicker,
        optionType,
        exerciseType: 'AMERICAN', // B3 options are typically American style
        strikePrice: estimatedStrike,
        expirationDate,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar metadados para opcao ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Opcao nao encontrada: ${ticker}`);
    }
  }

  async getBatchPrices(tickers: string[]): Promise<Record<string, number>> {
    this.pruneCache();

    const result: Record<string, number> = {};
    const tickersToFetch: string[] = [];

    // Check cache first
    for (const ticker of tickers) {
      const cached = this.priceCache.get(ticker);
      if (this.isCacheValid(cached)) {
        result[ticker] = cached!.value;
      } else {
        tickersToFetch.push(ticker);
      }
    }

    if (tickersToFetch.length === 0) {
      return result;
    }

    try {
      // Brapi supports comma-separated tickers
      const tickerString = tickersToFetch.join(',');
      const url = this.buildUrl(`/quote/${tickerString}`);
      const response = await fetch(url);

      if (!response.ok) {
        return result; // Return whatever we have from cache
      }

      const data = (await response.json()) as BrapiQuoteResponse;

      if (data.results) {
        for (const quote of data.results) {
          if (quote.symbol && quote.regularMarketPrice !== undefined) {
            const ticker = quote.symbol;
            const price = quote.regularMarketPrice;
            result[ticker] = price;

            this.priceCache.set(ticker, {
              value: price,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao buscar preços em lote: ${(error as Error).message}`,
      );
      // Return whatever we have from cache
    }

    return result;
  }

  /**
   * Search for assets by query string (for autocomplete)
   * Uses Brapi's /api/quote/list endpoint with search parameter
   * Also handles B3 option ticker patterns
   */
  async search(query: string, limit = 10): Promise<AssetSearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const upperQuery = query.toUpperCase();
    const results: AssetSearchResult[] = [];

    // Check if the query looks like an option ticker
    const parsedOption = parseOptionTicker(upperQuery);
    if (parsedOption) {
      // This is an option ticker - add it as a suggestion
      try {
        const metadata = await this.getOptionMetadata(upperQuery, parsedOption);
        results.push({
          ticker: upperQuery,
          name: metadata.name,
          type: 'OPTION',
          exchange: 'B3',
        });
      } catch {
        // Underlying not found, skip
      }
    }

    // Check if query could be a partial option ticker (e.g., "PETRA" without full strike)
    // and suggest the underlying stock
    if (isOptionTicker(upperQuery) && results.length > 0) {
      // Already added the option, return it with limited stock results
      const stockLimit = Math.max(1, limit - results.length);
      const stockResults = await this.searchStocks(
        upperQuery.slice(0, 4),
        stockLimit,
      );
      return [...results, ...stockResults].slice(0, limit);
    }

    // Search for stocks from Brapi
    const stockResults = await this.searchStocks(
      upperQuery,
      limit - results.length,
    );
    return [...results, ...stockResults].slice(0, limit);
  }

  /**
   * Search for stocks using Brapi API
   */
  private async searchStocks(
    query: string,
    limit: number,
  ): Promise<AssetSearchResult[]> {
    if (limit <= 0) return [];

    try {
      // Use the quote/list endpoint which supports search
      const url = this.buildUrl('/quote/list', {
        search: query.toUpperCase(),
        limit: String(limit),
      });

      const response = await fetch(url);

      if (!response.ok) {
        // Fallback to available endpoint if quote/list fails
        return this.searchAvailable(query, limit);
      }

      const data = (await response.json()) as BrapiListResponse;

      if (!data.stocks || data.stocks.length === 0) {
        return this.searchAvailable(query, limit);
      }

      return data.stocks.slice(0, limit).map((stock) => ({
        ticker: stock.stock,
        name: stock.name,
        type: this.mapBrapiType(stock.type),
        exchange: 'B3',
      }));
    } catch (error) {
      this.logger.error(`Erro ao buscar ativos: ${(error as Error).message}`);
      // Try fallback
      return this.searchAvailable(query, limit);
    }
  }

  /**
   * Fallback search using /api/available endpoint
   */
  private async searchAvailable(
    query: string,
    limit = 10,
  ): Promise<AssetSearchResult[]> {
    try {
      const url = this.buildUrl('/available', {
        search: query.toUpperCase(),
      });

      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as BrapiAvailableResponse;
      const results: AssetSearchResult[] = [];

      // Add stocks
      if (data.stocks) {
        for (const ticker of data.stocks.slice(0, limit)) {
          results.push({
            ticker,
            name: ticker, // Available endpoint doesn't include names
            type: 'STOCK',
            exchange: 'B3',
          });
          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar ativos disponiveis: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Map Brapi type to our internal type
   */
  private mapBrapiType(brapiType?: string): string {
    switch (brapiType) {
      case 'stock':
        return 'STOCK';
      case 'fund':
        return 'FII'; // Fundo Imobiliario
      case 'bdr':
        return 'BDR';
      default:
        return 'STOCK';
    }
  }
}
