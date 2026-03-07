import { Injectable, Logger } from '@nestjs/common';
import { MarketDataProvider, AssetMetadata } from './market-data.provider';
import { BrapiMarketService } from './brapi-market.service';
import { OpLabMarketService } from './oplab-market.service';
import type { AssetSearchResult } from './yahoo-market.service';

/**
 * Composite Market Data Service
 *
 * Routes requests to the appropriate provider:
 * - Stocks -> BrapiMarketService (Brapi.dev)
 * - Options/Derivatives -> OpLabMarketService (OpLab API)
 *
 * The search method combines results from both providers for a complete search experience.
 */
@Injectable()
export class CompositeMarketService extends MarketDataProvider {
  private readonly logger = new Logger(CompositeMarketService.name);

  constructor(
    private readonly brapiService: BrapiMarketService,
    private readonly opLabService: OpLabMarketService,
  ) {
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
   * Get current price for a ticker
   * Routes to OpLab for options, Brapi for stocks
   */
  async getPrice(ticker: string): Promise<number> {
    const upperTicker = ticker.toUpperCase();

    if (this.isOptionTicker(upperTicker)) {
      // Try OpLab first for options
      if (this.opLabService.isConfigured()) {
        try {
          return await this.opLabService.getPrice(upperTicker);
        } catch {
          this.logger.warn(
            `OpLab price lookup failed for ${upperTicker}, falling back to Brapi`,
          );
        }
      }
    }

    // Default to Brapi for stocks
    return this.brapiService.getPrice(upperTicker);
  }

  /**
   * Get metadata for an asset
   * Routes to OpLab for options, Brapi for stocks
   */
  async getMetadata(ticker: string): Promise<AssetMetadata> {
    const upperTicker = ticker.toUpperCase();

    if (this.isOptionTicker(upperTicker)) {
      // Try OpLab first for options
      if (this.opLabService.isConfigured()) {
        try {
          return await this.opLabService.getMetadata(upperTicker);
        } catch {
          this.logger.warn(
            `OpLab metadata lookup failed for ${upperTicker}, falling back to Brapi`,
          );
        }
      }
    }

    // Default to Brapi for stocks (which also handles option parsing as fallback)
    return this.brapiService.getMetadata(upperTicker);
  }

  /**
   * Get prices for multiple tickers in batch
   * Separates options from stocks and routes accordingly
   */
  async getBatchPrices(tickers: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const stockTickers: string[] = [];
    const optionTickers: string[] = [];

    // Separate tickers by type
    for (const ticker of tickers) {
      const upperTicker = ticker.toUpperCase();
      if (this.isOptionTicker(upperTicker)) {
        optionTickers.push(upperTicker);
      } else {
        stockTickers.push(upperTicker);
      }
    }

    // Fetch stock prices from Brapi
    if (stockTickers.length > 0) {
      const stockPrices = await this.brapiService.getBatchPrices(stockTickers);
      Object.assign(result, stockPrices);
    }

    // Fetch option prices from OpLab
    if (optionTickers.length > 0 && this.opLabService.isConfigured()) {
      try {
        const optionPrices =
          await this.opLabService.getBatchPrices(optionTickers);
        Object.assign(result, optionPrices);
      } catch (error) {
        this.logger.warn(
          `Failed to fetch batch option prices: ${(error as Error).message}`,
        );
      }
    }

    return result;
  }

  /**
   * Search for assets - combines results from both providers
   * This is the key method for the autocomplete feature
   *
   * @param query - Search query
   * @param limit - Maximum results to return
   * @param includeOptions - Whether to include option series in results
   */
  async search(
    query: string,
    limit = 10,
    includeOptions = false,
  ): Promise<AssetSearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const upperQuery = query.toUpperCase();
    const results: AssetSearchResult[] = [];

    // If query looks like an option ticker, prioritize option search
    if (this.isOptionTicker(upperQuery) && this.opLabService.isConfigured()) {
      try {
        const optionResults = await this.opLabService.search(upperQuery, limit);
        results.push(
          ...optionResults.map((r) => ({
            ...r,
            type: r.type || 'OPTION',
          })),
        );
      } catch (error) {
        this.logger.warn(`OpLab search failed: ${(error as Error).message}`);
      }
    }

    // Search for stocks from Brapi
    const stockResults = await this.brapiService.search(
      upperQuery,
      limit - results.length,
    );
    results.push(...stockResults);

    // If includeOptions is true, also search for option series of matching stocks
    if (
      includeOptions &&
      this.opLabService.isConfigured() &&
      results.length < limit
    ) {
      // Find stocks that might have options
      const stocksWithOptions = results
        .filter((r) => r.type === 'STOCK')
        .slice(0, 3); // Limit to avoid too many API calls

      for (const stock of stocksWithOptions) {
        if (results.length >= limit) break;

        try {
          const optionSeries = await this.opLabService.searchOptions(
            stock.ticker,
            undefined,
            Math.min(5, limit - results.length),
          );
          results.push(...optionSeries);
        } catch {
          // Ignore errors for individual stock option lookups
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
    limit = 20,
  ): Promise<AssetSearchResult[]> {
    if (!this.opLabService.isConfigured()) {
      this.logger.warn('OpLab not configured, cannot search options');
      return [];
    }

    return this.opLabService.searchOptions(underlying, optionType, limit);
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
   * Check if OpLab service is configured and available
   */
  isOpLabConfigured(): boolean {
    return this.opLabService.isConfigured();
  }
}
