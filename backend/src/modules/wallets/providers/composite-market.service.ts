import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MarketDataProvider, AssetMetadata } from './market-data.provider';
import { OpLabMarketService } from './oplab-market.service';
import type { AssetSearchResult } from './yahoo-market.service';
import type { OptionSearchPageResponse } from '../schemas/wallet.schema';

/**
 * Composite Market Data Service
 *
 * Routes all requests to OpLabMarketService (stocks and options).
 */
@Injectable()
export class CompositeMarketService extends MarketDataProvider {
  private readonly logger = new Logger(CompositeMarketService.name);

  constructor(private readonly opLabService: OpLabMarketService) {
    super();
    this.logger.log(
      `CompositeMarketService initialized. OpLab configured: ${opLabService.isConfigured()}`,
    );
  }

  /**
   * Check if a ticker is an option ticker (B3 format)
   * Format: XXXX[A-X][1-3 digits][W digit]? e.g., PETRA240, VALEB35, PETRM237W5
   * Weekly options have a W suffix followed by the week number
   */
  private isOptionTicker(ticker: string): boolean {
    return /^[A-Z]{4}[A-X]\d{1,3}(W\d)?$/i.test(ticker);
  }

  /**
   * Get current price for a ticker (stock or option) via OpLab
   */
  async getPrice(ticker: string): Promise<number> {
    const upperTicker = ticker.toUpperCase();

    if (!this.opLabService.isConfigured()) {
      throw new NotFoundException(`OpLab não configurado: preço indisponível para ${upperTicker}`);
    }

    try {
      return await this.opLabService.getPrice(upperTicker);
    } catch {
      this.logger.warn(`OpLab price lookup failed for ${upperTicker}`);
      throw new NotFoundException(`Preço não encontrado para ${upperTicker}`);
    }
  }

  /**
   * Get metadata for an asset
   * Intentionally delegates to OpLab only — OpLab handles both stocks and options
   * via /market/instruments, so no Brapi fallback is needed or wanted here.
   */
  async getMetadata(ticker: string): Promise<AssetMetadata> {
    const upperTicker = ticker.toUpperCase();

    return this.opLabService.getMetadata(upperTicker);
  }

  /**
   * Get prices for multiple tickers in batch via OpLab (stocks and options)
   */
  async getBatchPrices(tickers: string[]): Promise<Record<string, number>> {
    if (!tickers.length || !this.opLabService.isConfigured()) return {};

    try {
      return await this.opLabService.getBatchPrices(
        tickers.map((t) => t.toUpperCase()),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch batch prices: ${(error as Error).message}`,
      );
      return {};
    }
  }

  /**
   * Search for assets via OpLab (stocks and options)
   */
  async search(
    query: string,
    limit = 10,
    includeOptions = false,
  ): Promise<AssetSearchResult[]> {
    if (!query || query.length < 2 || !this.opLabService.isConfigured()) {
      return [];
    }

    const upperQuery = query.toUpperCase();
    const results: AssetSearchResult[] = [];

    try {
      const opLabResults = await this.opLabService.search(upperQuery, limit);
      results.push(...opLabResults);
    } catch (error) {
      this.logger.warn(`OpLab search failed: ${(error as Error).message}`);
    }

    if (includeOptions && results.length < limit) {
      const stocks = results.filter((r) => r.type === 'STOCK').slice(0, 3);

      for (const stock of stocks) {
        if (results.length >= limit) break;
        try {
          const optionSeries = await this.opLabService.searchOptions(stock.ticker, undefined);
          results.push(...optionSeries.results);
        } catch {
          // ignore per-stock errors
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search specifically for options of an underlying asset
   * Delegates to OpLabMarketService
   */
  async searchOptions(
    underlying: string,
    optionType?: 'CALL' | 'PUT',
    page = 1,
    pageSize = 50,
    q?: string,
  ): Promise<OptionSearchPageResponse> {
    if (!this.opLabService.isConfigured()) {
      this.logger.warn('OpLab not configured, cannot search options');
      return { results: [], total: 0, page, pageSize, hasMore: false };
    }

    return this.opLabService.searchOptions(underlying, optionType, page, pageSize, q);
  }

  /**
   * Get all option series for an underlying asset
   * Delegates to OpLabMarketService
   */
  async getOptionSeries(underlying: string): Promise<
    Array<{
      symbol: string;
      strike: number;
      due_date: string;
      type: 'CALL' | 'PUT';
      days_to_maturity: number;
    }>
  > {
    if (!this.opLabService.isConfigured()) {
      this.logger.warn('OpLab not configured, cannot get option series');
      return [];
    }

    return this.opLabService.getOptionSeries(underlying);
  }

  /**
   * Get detailed option information including Greeks
   * Delegates to OpLabMarketService
   */
  async getOptionDetails(ticker: string): Promise<{
    symbol: string;
    strike: number;
    due_date: string;
    type: 'CALL' | 'PUT';
    implied_volatility?: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
  } | null> {
    if (!this.opLabService.isConfigured()) {
      return null;
    }

    return this.opLabService.getOptionDetails(ticker);
  }

  /**
   * Get historical strike for an option on a specific past date.
   * Delegates to OpLabMarketService with D-0/D-3 weekend fallback.
   */
  async getHistoricalOptionDetails(
    spot: string,
    ticker: string,
    date: Date,
  ): Promise<{
    strike: number;
    expirationDate: string;
    optionType: 'CALL' | 'PUT';
  } | null> {
    if (!this.opLabService.isConfigured()) return null;
    return this.opLabService.getHistoricalOptionDetails(spot, ticker, date);
  }

  /**
   * Check if OpLab service is configured and available
   */
  isOpLabConfigured(): boolean {
    return this.opLabService.isConfigured();
  }
}
