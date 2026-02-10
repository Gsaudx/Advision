import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import {
  MarketDataProvider,
  AssetMetadata,
  MARKET_CACHE_TTL_MS,
} from './market-data.provider';

interface CacheEntry {
  value: number;
  timestamp: number;
}

export interface AssetSearchResult {
  ticker: string;
  name: string;
  type: string;
  exchange: string;
  // Option-specific fields (optional, used by OpLab search results)
  strike?: number;
  expirationDate?: string;
  optionType?: 'CALL' | 'PUT';
}

interface YahooQuote {
  regularMarketPrice?: number;
  shortName?: string;
  longName?: string;
  sector?: string;
  quoteType?: string;
  underlyingSymbol?: string;
  strike?: number;
  expireDate?: number | Date;
  optionType?: string;
}

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
}

interface YahooSearchResult {
  quotes: YahooSearchQuote[];
}

@Injectable()
export class YahooMarketService extends MarketDataProvider {
  private readonly logger = new Logger(YahooMarketService.name);
  private readonly priceCache = new Map<string, CacheEntry>();
  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey'],
  });

  /**
   * Convert Brazilian ticker to Yahoo Finance format
   * Brazilian tickers need .SA suffix (e.g., PETR4 -> PETR4.SA)
   */
  private toYahooTicker(ticker: string): string {
    // If already has a suffix, return as-is
    if (ticker.includes('.')) {
      return ticker;
    }
    // Add .SA suffix for Brazilian tickers
    return `${ticker}.SA`;
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

  async getPrice(ticker: string): Promise<number> {
    this.pruneCache();

    const cached = this.priceCache.get(ticker);
    if (this.isCacheValid(cached)) {
      return cached!.value;
    }

    const yahooTicker = this.toYahooTicker(ticker);

    try {
      const quote = (await Promise.resolve(
        this.yahooFinance.quote(yahooTicker),
      )) as YahooQuote;

      if (!quote || quote.regularMarketPrice === undefined) {
        throw new NotFoundException(`Preço não encontrado para ${ticker}`);
      }

      const price = quote.regularMarketPrice;

      this.priceCache.set(ticker, {
        value: price,
        timestamp: Date.now(),
      });

      return price;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar preco para ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Preço não encontrado para ${ticker}`);
    }
  }

  async getMetadata(ticker: string): Promise<AssetMetadata> {
    const yahooTicker = this.toYahooTicker(ticker);

    try {
      const quote = (await Promise.resolve(
        this.yahooFinance.quote(yahooTicker),
      )) as YahooQuote;

      if (!quote) {
        throw new NotFoundException(`Ativo nao encontrado: ${ticker}`);
      }

      // Check if it's an option based on quoteType
      const isOption = quote.quoteType === 'OPTION';

      if (isOption) {
        // For options, we need additional details
        return {
          ticker,
          type: 'OPTION',
          name: quote.shortName || quote.longName || ticker,
          sector: undefined,
          underlyingSymbol: quote.underlyingSymbol,
          strikePrice: quote.strike,
          expirationDate: quote.expireDate
            ? new Date(quote.expireDate)
            : undefined,
          optionType: quote.optionType?.toUpperCase() as 'CALL' | 'PUT',
          // Default to AMERICAN if not provided (most Brazilian options are American-style)
          exerciseType: 'AMERICAN',
        };
      }

      return {
        ticker,
        type: 'STOCK',
        name: quote.shortName || quote.longName || ticker,
        sector: quote.sector,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar metadados para ${ticker}: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Ativo nao encontrado: ${ticker}`);
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

    // Fetch remaining from Yahoo Finance
    const yahooTickers = tickersToFetch.map((t) => this.toYahooTicker(t));

    try {
      const quotes = await Promise.resolve(
        this.yahooFinance.quote(yahooTickers),
      );

      // Handle single quote response (when only one ticker)
      const quotesArray = Array.isArray(quotes)
        ? (quotes as YahooQuote[])
        : [quotes as YahooQuote];

      for (let i = 0; i < tickersToFetch.length; i++) {
        const ticker = tickersToFetch[i];
        const quote = quotesArray[i];

        if (quote && quote.regularMarketPrice !== undefined) {
          const price = quote.regularMarketPrice;
          result[ticker] = price;

          this.priceCache.set(ticker, {
            value: price,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao buscar precos em lote: ${(error as Error).message}`,
      );
      // Return whatever we have from cache
    }

    return result;
  }

  /**
   * Search for assets by query string (for autocomplete)
   * Includes Brazilian stocks (.SA suffix) and options
   */
  async search(
    query: string,
    limit = 10,
    includeOptions = true,
  ): Promise<AssetSearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const searchResult = (await Promise.resolve(
        this.yahooFinance.search(query, { quotesCount: limit * 3 }),
      )) as YahooSearchResult;

      if (!searchResult || !searchResult.quotes) {
        return [];
      }

      // Filter for Brazilian stocks, equities, and options
      const results: AssetSearchResult[] = [];

      for (const quote of searchResult.quotes) {
        // Skip if no symbol
        if (!quote.symbol) continue;

        // Include Brazilian stocks (.SA) or if user is searching with .SA
        const isBrazilian = quote.symbol.endsWith('.SA');
        const isEquity = quote.quoteType === 'EQUITY';
        const isOption = quote.quoteType === 'OPTION';

        if (isBrazilian && isEquity) {
          // Remove .SA suffix for display
          const ticker = quote.symbol.replace('.SA', '');

          results.push({
            ticker,
            name: quote.shortname || quote.longname || ticker,
            type: 'STOCK',
            exchange: quote.exchange || 'BVMF',
          });

          if (results.length >= limit) break;
        } else if (includeOptions && isOption) {
          // Include options (may have different suffix patterns)
          const ticker = quote.symbol.replace('.SA', '');

          results.push({
            ticker,
            name: quote.shortname || quote.longname || ticker,
            type: 'OPTION',
            exchange: quote.exchange || 'BVMF',
          });

          if (results.length >= limit) break;
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Erro ao buscar ativos: ${(error as Error).message}`);
      return [];
    }
  }
}
