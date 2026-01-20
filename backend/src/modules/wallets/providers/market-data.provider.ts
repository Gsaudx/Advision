/**
 * Asset metadata returned by the market data provider
 */
export interface AssetMetadata {
  ticker: string;
  type: 'STOCK' | 'OPTION';
  name: string;
  sector?: string;
  underlyingSymbol?: string;
  strikePrice?: number;
  expirationDate?: Date;
  optionType?: 'CALL' | 'PUT';
  exerciseType?: 'AMERICAN' | 'EUROPEAN';
}

/**
 * Abstract class defining the market data provider interface.
 * Implementations should provide real-time price data and asset metadata.
 */
export abstract class MarketDataProvider {
  /**
   * Get the current price for a single ticker
   * @param ticker - The asset ticker symbol
   * @returns The current price
   */
  abstract getPrice(ticker: string): Promise<number>;

  /**
   * Get metadata for an asset including type, name, sector, and option details
   * @param ticker - The asset ticker symbol
   * @returns Asset metadata
   */
  abstract getMetadata(ticker: string): Promise<AssetMetadata>;

  /**
   * Get prices for multiple tickers in a single batch call
   * @param tickers - Array of ticker symbols
   * @returns Map of ticker to price
   */
  abstract getBatchPrices(tickers: string[]): Promise<Record<string, number>>;
}
