import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MarketDataProvider, AssetMetadata } from './market-data.provider';
import type { AssetSearchResult } from './yahoo-market.service';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * OpLab API V3 Response Types
 */
interface OpLabInstrument {
  symbol: string;
  name?: string;
  description?: string;
  type?: string;
  sector?: string;
  category?: string;
  has_options?: boolean;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  variation?: number;
  financial_volume?: number;
}

interface OpLabOptionSeries {
  symbol: string;
  strike: number;
  due_date: string;
  type: 'CALL' | 'PUT';
  days_to_maturity: number;
  category?: string;
  spot?: OpLabSpotInfo;
  close?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  variation?: number;
  open_interest?: number;
  theoretical_price?: number;
  implied_volatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

interface OpLabSpotInfo {
  symbol: string;
  name?: string;
  close?: number;
}

interface OpLabQuote {
  symbol: string;
  name?: string;
  type?: string;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  variation?: number;
  bid?: number;
  ask?: number;
  strike?: number;
  due_date?: string;
  option_type?: 'CALL' | 'PUT';
  spot?: OpLabSpotInfo;
}

interface OpLabSearchResponse {
  data: OpLabInstrument[];
}

/**
 * Actual OpLab series response format - nested structure
 */
interface OpLabSeriesStrike {
  strike: number;
  call?: OpLabSeriesOption;
  put?: OpLabSeriesOption;
}

interface OpLabSeriesOption {
  symbol: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  bid?: number;
  ask?: number;
  volume?: number;
  financial_volume?: number;
  variation?: number;
  maturity_type?: 'AMERICAN' | 'EUROPEAN';
  contract_size?: number;
  market_maker?: boolean;
  time?: string;
  category?: 'CALL' | 'PUT';
  strike?: number;
}

interface OpLabSeriesGroup {
  due_date: string;
  days_to_maturity: number;
  call: string; // Letter code like "A"
  put: string; // Letter code like "M"
  strikes: OpLabSeriesStrike[];
}

interface OpLabSeriesResponse {
  symbol: string;
  name?: string;
  close?: number;
  series: OpLabSeriesGroup[];
}

interface OpLabInstrumentResponse {
  data: OpLabInstrument;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const SERIES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for option series
const OPLAB_BASE_URL = 'https://api.oplab.com.br/v3';

/**
 * OpLab Market Data Service
 * Provides access to B3 derivatives data via OpLab API V3
 *
 * Main features:
 * - Real option series listing for underlying assets
 * - Option quotes with Greeks
 * - Search for options and stocks
 */
@Injectable()
export class OpLabMarketService extends MarketDataProvider {
  private readonly logger = new Logger(OpLabMarketService.name);
  private readonly priceCache = new Map<string, CacheEntry<number>>();
  private readonly seriesCache = new Map<
    string,
    CacheEntry<OpLabOptionSeries[]>
  >();
  private readonly accessToken: string;

  constructor() {
    super();
    this.accessToken = process.env.OPLAB_ACCESS_TOKEN ?? '';
    if (!this.accessToken) {
      this.logger.warn(
        'OPLAB_ACCESS_TOKEN not configured. Derivatives features will not work.',
      );
    }
  }

  /**
   * Check if the service is configured with a valid token
   */
  isConfigured(): boolean {
    return !!this.accessToken;
  }

  /**
   * Check if a cached entry is still valid
   */
  private isCacheValid<T>(
    entry: CacheEntry<T> | undefined,
    ttl = CACHE_TTL_MS,
  ): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < ttl;
  }

  /**
   * Prune expired cache entries
   */
  private pruneCache(now = Date.now()): void {
    for (const [ticker, entry] of this.priceCache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        this.priceCache.delete(ticker);
      }
    }
    for (const [symbol, entry] of this.seriesCache.entries()) {
      if (now - entry.timestamp >= SERIES_CACHE_TTL_MS) {
        this.seriesCache.delete(symbol);
      }
    }
  }

  /**
   * Make authenticated request to OpLab API
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('OpLab API token not configured');
    }

    const url = new URL(`${OPLAB_BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      this.logger.error(`OpLab API error ${response.status}: ${errorText}`);
      throw new Error(`OpLab API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get current price for a ticker (stock or option)
   */
  async getPrice(ticker: string): Promise<number> {
    this.pruneCache();

    const upperTicker = ticker.toUpperCase();
    const cached = this.priceCache.get(upperTicker);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    try {
      // OpLab quote endpoint returns array directly, not wrapped in { data: [] }
      const quotes = await this.makeRequest<OpLabQuote[]>('/market/quote', {
        tickers: upperTicker,
      });

      if (!quotes || quotes.length === 0) {
        throw new NotFoundException(`Preco nao encontrado para ${ticker}`);
      }

      const quote = quotes[0];
      const price = quote.close ?? quote.bid ?? quote.ask;

      if (price === undefined || price === null) {
        throw new NotFoundException(`Preco nao encontrado para ${ticker}`);
      }

      this.priceCache.set(upperTicker, {
        value: price,
        timestamp: Date.now(),
      });

      return price;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Erro ao buscar preco para ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Preco nao encontrado para ${ticker}`);
    }
  }

  /**
   * Get metadata for an asset (stock or option)
   */
  async getMetadata(ticker: string): Promise<AssetMetadata> {
    const upperTicker = ticker.toUpperCase();

    try {
      // First try to get as an instrument
      const data = await this.makeRequest<OpLabInstrumentResponse>(
        `/market/instruments/${upperTicker}`,
      );

      const instrument = data.data;

      // Check if it's an option by type or by checking for option-specific fields
      if (
        instrument.type === 'OPTION' ||
        this.looksLikeOptionTicker(upperTicker)
      ) {
        return this.getOptionMetadataFromOpLab(upperTicker);
      }

      return {
        ticker: upperTicker,
        type: 'STOCK',
        name: instrument.name || instrument.description || upperTicker,
        sector: instrument.sector,
      };
    } catch (error) {
      // If instrument lookup fails, try as option
      if (this.looksLikeOptionTicker(upperTicker)) {
        return this.getOptionMetadataFromOpLab(upperTicker);
      }

      this.logger.error(
        `Erro ao buscar metadados para ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Ativo nao encontrado: ${ticker}`);
    }
  }

  /**
   * Check if a ticker looks like a B3 option ticker
   * Format: XXXX[A-X][1-3 digits][W digit]? e.g., PETRA240, VALEB35, PETRM237W5
   * Weekly options have a W suffix followed by the week number
   */
  private looksLikeOptionTicker(ticker: string): boolean {
    return /^[A-Z]{4}[A-X]\d{1,3}(W\d)?$/.test(ticker);
  }

  /**
   * Get option metadata from OpLab
   * First tries to use cached series data (most reliable), then falls back to direct API call
   */
  private async getOptionMetadataFromOpLab(
    ticker: string,
  ): Promise<AssetMetadata> {
    // First, try to find the option in cached series data
    // This is more reliable as we know the series endpoint works correctly
    const cachedOption = this.findOptionInSeriesCache(ticker);
    if (cachedOption) {
      this.logger.debug(
        `Found option ${ticker} in series cache: strike=${cachedOption.strike}, due_date=${cachedOption.due_date}`,
      );
      return {
        ticker,
        type: 'OPTION',
        name: this.buildOptionName(cachedOption),
        underlyingSymbol: cachedOption.spot?.symbol,
        optionType: cachedOption.type,
        exerciseType: 'AMERICAN', // B3 options are typically American
        strikePrice: cachedOption.strike,
        expirationDate: cachedOption.due_date
          ? new Date(cachedOption.due_date)
          : undefined,
      };
    }

    // If not in cache, try the direct API call
    try {
      // The API may return data directly or wrapped in { data: {...} }
      const response = await this.makeRequest<
        OpLabOptionSeries | { data: OpLabOptionSeries }
      >(`/market/options/details/${ticker}`);

      // Handle both response formats
      const option =
        'data' in response &&
        (response as { data: OpLabOptionSeries }).data?.symbol
          ? (response as { data: OpLabOptionSeries }).data
          : (response as OpLabOptionSeries);

      this.logger.debug(
        `Got option details from API for ${ticker}: strike=${option.strike}, due_date=${option.due_date}`,
      );

      return {
        ticker,
        type: 'OPTION',
        name: this.buildOptionName(option),
        underlyingSymbol: option.spot?.symbol,
        optionType: option.type,
        exerciseType: 'AMERICAN', // B3 options are typically American
        strikePrice: option.strike,
        expirationDate: option.due_date ? new Date(option.due_date) : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar detalhes da opcao ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Opcao nao encontrada: ${ticker}`);
    }
  }

  /**
   * Search for an option in the series cache by ticker symbol
   */
  private findOptionInSeriesCache(ticker: string): OpLabOptionSeries | null {
    const upperTicker = ticker.toUpperCase();

    // Iterate through all cached series to find the option
    for (const [, entry] of this.seriesCache.entries()) {
      if (!this.isCacheValid(entry, SERIES_CACHE_TTL_MS)) {
        continue;
      }

      const found = entry.value.find(
        (opt) => opt.symbol.toUpperCase() === upperTicker,
      );
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Build a human-readable option name
   */
  private buildOptionName(option: OpLabOptionSeries): string {
    const underlying = option.spot?.name || option.spot?.symbol || 'Unknown';
    const type = option.type === 'CALL' ? 'CALL' : 'PUT';
    const strike = option.strike?.toFixed(2) ?? '?';
    const expiry = option.due_date
      ? new Date(option.due_date).toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        })
      : '?';

    return `${underlying} ${type} R$${strike} (${expiry})`;
  }

  /**
   * Get prices for multiple tickers in batch
   */
  async getBatchPrices(tickers: string[]): Promise<Record<string, number>> {
    this.pruneCache();

    const result: Record<string, number> = {};
    const tickersToFetch: string[] = [];

    // Check cache first
    for (const ticker of tickers) {
      const upperTicker = ticker.toUpperCase();
      const cached = this.priceCache.get(upperTicker);
      if (this.isCacheValid(cached)) {
        result[upperTicker] = cached!.value;
      } else {
        tickersToFetch.push(upperTicker);
      }
    }

    if (tickersToFetch.length === 0) {
      return result;
    }

    try {
      // OpLab quote endpoint returns array directly, not wrapped in { data: [] }
      const quotes = await this.makeRequest<OpLabQuote[]>('/market/quote', {
        tickers: tickersToFetch.join(','),
      });

      if (quotes && quotes.length > 0) {
        for (const quote of quotes) {
          const price = quote.close ?? quote.bid ?? quote.ask;
          if (quote.symbol && price !== undefined) {
            result[quote.symbol] = price;
            this.priceCache.set(quote.symbol, {
              value: price,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao buscar precos em lote: ${(error as Error).message}`,
      );
    }

    return result;
  }

  /**
   * Search for instruments (stocks and options)
   */
  async search(query: string, limit = 10): Promise<AssetSearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    if (!this.isConfigured()) {
      return [];
    }

    const upperQuery = query.toUpperCase();
    const results: AssetSearchResult[] = [];

    try {
      // Search for instruments with options
      const data = await this.makeRequest<OpLabSearchResponse>(
        '/market/instruments/search',
        {
          expr: upperQuery,
          limit: String(limit),
          has_options: 'true',
        },
      );

      if (data.data) {
        for (const instrument of data.data) {
          results.push({
            ticker: instrument.symbol,
            name:
              instrument.name || instrument.description || instrument.symbol,
            type: instrument.type === 'OPTION' ? 'OPTION' : 'STOCK',
            exchange: 'B3',
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao buscar instrumentos: ${(error as Error).message}`,
      );
    }

    return results.slice(0, limit);
  }

  /**
   * Search specifically for options of an underlying asset
   * This is the key method for the derivatives feature
   */
  async searchOptions(
    underlying: string,
    optionType?: 'CALL' | 'PUT',
    limit = 20,
  ): Promise<AssetSearchResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const upperUnderlying = underlying.toUpperCase();
    const series = await this.getOptionSeries(upperUnderlying);

    let filtered = series;
    if (optionType) {
      filtered = series.filter((s) => s.type === optionType);
    }

    return filtered.slice(0, limit).map((option) => ({
      ticker: option.symbol,
      name: this.buildOptionName(option),
      type: 'OPTION' as const,
      exchange: 'B3',
      strike: option.strike,
      expirationDate: option.due_date,
      optionType: option.type,
    }));
  }

  /**
   * Get all option series for an underlying asset
   * Uses caching to avoid excessive API calls
   *
   * Note: The OpLab API returns a nested structure that we flatten into
   * a list of individual options for easier consumption.
   */
  async getOptionSeries(underlying: string): Promise<OpLabOptionSeries[]> {
    if (!this.isConfigured()) {
      return [];
    }

    this.pruneCache();

    const upperUnderlying = underlying.toUpperCase();
    const cached = this.seriesCache.get(upperUnderlying);
    if (this.isCacheValid(cached, SERIES_CACHE_TTL_MS)) {
      return cached!.value;
    }

    try {
      const data = await this.makeRequest<OpLabSeriesResponse>(
        `/market/instruments/series/${upperUnderlying}`,
      );

      // Flatten the nested structure into a flat array of options
      const flattenedOptions: OpLabOptionSeries[] = [];

      if (data.series && Array.isArray(data.series)) {
        for (const seriesGroup of data.series) {
          if (!seriesGroup.strikes || !Array.isArray(seriesGroup.strikes)) {
            continue;
          }

          for (const strikeData of seriesGroup.strikes) {
            // Add CALL option if exists
            if (strikeData.call && strikeData.call.symbol) {
              flattenedOptions.push({
                symbol: strikeData.call.symbol,
                strike: strikeData.strike,
                due_date: seriesGroup.due_date,
                type: 'CALL',
                days_to_maturity: seriesGroup.days_to_maturity,
                close: strikeData.call.close,
                bid: strikeData.call.bid,
                ask: strikeData.call.ask,
                volume: strikeData.call.volume,
                spot: {
                  symbol: data.symbol,
                  name: data.name,
                  close: data.close,
                },
              });
            }

            // Add PUT option if exists
            if (strikeData.put && strikeData.put.symbol) {
              flattenedOptions.push({
                symbol: strikeData.put.symbol,
                strike: strikeData.strike,
                due_date: seriesGroup.due_date,
                type: 'PUT',
                days_to_maturity: seriesGroup.days_to_maturity,
                close: strikeData.put.close,
                bid: strikeData.put.bid,
                ask: strikeData.put.ask,
                volume: strikeData.put.volume,
                spot: {
                  symbol: data.symbol,
                  name: data.name,
                  close: data.close,
                },
              });
            }
          }
        }
      }

      this.seriesCache.set(upperUnderlying, {
        value: flattenedOptions,
        timestamp: Date.now(),
      });

      this.logger.log(
        `Loaded ${flattenedOptions.length} options for ${upperUnderlying}`,
      );

      return flattenedOptions;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar series de opcoes para ${underlying}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Get option details with Greeks
   * First checks cached series data, then falls back to direct API call
   */
  async getOptionDetails(ticker: string): Promise<OpLabOptionSeries | null> {
    if (!this.isConfigured()) {
      return null;
    }

    // Check series cache first
    const cached = this.findOptionInSeriesCache(ticker);
    if (cached) {
      return cached;
    }

    try {
      // The API may return data directly or wrapped in { data: {...} }
      const response = await this.makeRequest<
        OpLabOptionSeries | { data: OpLabOptionSeries }
      >(`/market/options/details/${ticker.toUpperCase()}`);

      // Handle both response formats
      if ('data' in response && (response as { data: OpLabOptionSeries }).data?.symbol) {
        return (response as { data: OpLabOptionSeries }).data;
      }
      return response as OpLabOptionSeries;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar detalhes da opcao ${ticker}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
