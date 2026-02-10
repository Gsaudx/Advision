import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { YahooMarketService } from '../providers/yahoo-market.service';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => {
  return jest.fn().mockImplementation(() => ({
    quote: jest.fn(),
    search: jest.fn(),
  }));
});

describe('YahooMarketService', () => {
  let service: YahooMarketService;
  let mockYahooFinance: {
    quote: jest.Mock;
    search: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YahooMarketService],
    }).compile();

    service = module.get<YahooMarketService>(YahooMarketService);

    // Access the mocked yahooFinance instance
    mockYahooFinance = (service as any).yahooFinance;
    mockYahooFinance.quote = jest.fn();
    mockYahooFinance.search = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the price cache between tests
    (service as any).priceCache.clear();
  });

  describe('toYahooTicker', () => {
    it('adds .SA suffix when ticker has no dot', () => {
      const result = (service as any).toYahooTicker('PETR4');
      expect(result).toBe('PETR4.SA');
    });

    it('returns ticker as-is when it already has a suffix', () => {
      const result = (service as any).toYahooTicker('AAPL.US');
      expect(result).toBe('AAPL.US');
    });

    it('returns ticker as-is when it already has .SA suffix', () => {
      const result = (service as any).toYahooTicker('PETR4.SA');
      expect(result).toBe('PETR4.SA');
    });
  });

  describe('isCacheValid', () => {
    it('returns false when entry is undefined', () => {
      const result = (service as any).isCacheValid(undefined);
      expect(result).toBe(false);
    });

    it('returns false when entry is expired', () => {
      const expiredEntry = {
        value: 30,
        timestamp: Date.now() - 120000, // 2 minutes ago (TTL is 60s)
      };
      const result = (service as any).isCacheValid(expiredEntry);
      expect(result).toBe(false);
    });

    it('returns true when entry is valid', () => {
      const validEntry = {
        value: 30,
        timestamp: Date.now() - 30000, // 30 seconds ago (within 60s TTL)
      };
      const result = (service as any).isCacheValid(validEntry);
      expect(result).toBe(true);
    });
  });

  describe('pruneCache', () => {
    it('removes expired entries from cache', () => {
      const cache = (service as any).priceCache;
      const now = Date.now();

      // Add an expired entry
      cache.set('EXPIRED', { value: 10, timestamp: now - 120000 });
      // Add a valid entry
      cache.set('VALID', { value: 20, timestamp: now - 30000 });

      (service as any).pruneCache(now);

      expect(cache.has('EXPIRED')).toBe(false);
      expect(cache.has('VALID')).toBe(true);
    });

    it('keeps all entries when none are expired', () => {
      const cache = (service as any).priceCache;
      const now = Date.now();

      cache.set('TICKER1', { value: 10, timestamp: now - 10000 });
      cache.set('TICKER2', { value: 20, timestamp: now - 20000 });

      (service as any).pruneCache(now);

      expect(cache.size).toBe(2);
    });
  });

  describe('getPrice', () => {
    it('returns cached price when valid', async () => {
      const cache = (service as any).priceCache;
      cache.set('PETR4', { value: 30, timestamp: Date.now() });

      const price = await service.getPrice('PETR4');

      expect(price).toBe(30);
      expect(mockYahooFinance.quote).not.toHaveBeenCalled();
    });

    it('fetches from API when cache is empty', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        regularMarketPrice: 35.5,
      });

      const price = await service.getPrice('PETR4');

      expect(price).toBe(35.5);
      expect(mockYahooFinance.quote).toHaveBeenCalledWith('PETR4.SA');
    });

    it('fetches from API when cache is expired', async () => {
      const cache = (service as any).priceCache;
      cache.set('PETR4', { value: 30, timestamp: Date.now() - 120000 });

      mockYahooFinance.quote.mockResolvedValue({
        regularMarketPrice: 35.5,
      });

      const price = await service.getPrice('PETR4');

      expect(price).toBe(35.5);
    });

    it('caches the fetched price', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        regularMarketPrice: 35.5,
      });

      await service.getPrice('PETR4');

      const cache = (service as any).priceCache;
      expect(cache.get('PETR4')?.value).toBe(35.5);
    });

    it('throws NotFoundException when quote is null', async () => {
      mockYahooFinance.quote.mockResolvedValue(null);

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when regularMarketPrice is undefined', async () => {
      mockYahooFinance.quote.mockResolvedValue({});

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when API throws error', async () => {
      mockYahooFinance.quote.mockRejectedValue(new Error('API Error'));

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMetadata', () => {
    it('returns stock metadata for equity', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        shortName: 'Petrobras',
        longName: 'Petroleo Brasileiro S.A.',
        sector: 'Energy',
        quoteType: 'EQUITY',
      });

      const metadata = await service.getMetadata('PETR4');

      expect(metadata).toEqual({
        ticker: 'PETR4',
        type: 'STOCK',
        name: 'Petrobras',
        sector: 'Energy',
      });
    });

    it('uses longName when shortName is missing', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        longName: 'Petroleo Brasileiro S.A.',
        quoteType: 'EQUITY',
      });

      const metadata = await service.getMetadata('PETR4');

      expect(metadata.name).toBe('Petroleo Brasileiro S.A.');
    });

    it('uses ticker when both names are missing', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        quoteType: 'EQUITY',
      });

      const metadata = await service.getMetadata('PETR4');

      expect(metadata.name).toBe('PETR4');
    });

    it('returns option metadata for options', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        shortName: 'PETR4 Call',
        quoteType: 'OPTION',
        underlyingSymbol: 'PETR4.SA',
        strike: 30,
        expireDate: new Date('2024-06-15'),
        optionType: 'call',
      });

      const metadata = await service.getMetadata('PETRA30');

      expect(metadata).toEqual({
        ticker: 'PETRA30',
        type: 'OPTION',
        name: 'PETR4 Call',
        sector: undefined,
        underlyingSymbol: 'PETR4.SA',
        strikePrice: 30,
        expirationDate: expect.any(Date),
        optionType: 'CALL',
        exerciseType: 'AMERICAN',
      });
    });

    it('handles option without expireDate', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        shortName: 'PETR4 Call',
        quoteType: 'OPTION',
        underlyingSymbol: 'PETR4.SA',
        strike: 30,
        optionType: 'put',
      });

      const metadata = await service.getMetadata('PETRA30');

      expect(metadata.expirationDate).toBeUndefined();
      expect(metadata.optionType).toBe('PUT');
    });

    it('throws NotFoundException when quote is null', async () => {
      mockYahooFinance.quote.mockResolvedValue(null);

      await expect(service.getMetadata('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when API throws error', async () => {
      mockYahooFinance.quote.mockRejectedValue(new Error('API Error'));

      await expect(service.getMetadata('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBatchPrices', () => {
    it('returns all from cache when all are cached', async () => {
      const cache = (service as any).priceCache;
      const now = Date.now();
      cache.set('PETR4', { value: 30, timestamp: now });
      cache.set('VALE3', { value: 70, timestamp: now });

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices).toEqual({ PETR4: 30, VALE3: 70 });
      expect(mockYahooFinance.quote).not.toHaveBeenCalled();
    });

    it('fetches only uncached tickers', async () => {
      const cache = (service as any).priceCache;
      cache.set('PETR4', { value: 30, timestamp: Date.now() });

      mockYahooFinance.quote.mockResolvedValue([{ regularMarketPrice: 70 }]);

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices).toEqual({ PETR4: 30, VALE3: 70 });
      expect(mockYahooFinance.quote).toHaveBeenCalledWith(['VALE3.SA']);
    });

    it('handles single ticker response (non-array)', async () => {
      mockYahooFinance.quote.mockResolvedValue({ regularMarketPrice: 30 });

      const prices = await service.getBatchPrices(['PETR4']);

      expect(prices).toEqual({ PETR4: 30 });
    });

    it('handles array ticker response', async () => {
      mockYahooFinance.quote.mockResolvedValue([
        { regularMarketPrice: 30 },
        { regularMarketPrice: 70 },
      ]);

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices).toEqual({ PETR4: 30, VALE3: 70 });
    });

    it('skips tickers with undefined price', async () => {
      mockYahooFinance.quote.mockResolvedValue([
        { regularMarketPrice: 30 },
        {}, // no price
      ]);

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices).toEqual({ PETR4: 30 });
      expect(prices.VALE3).toBeUndefined();
    });

    it('returns cached values on API error', async () => {
      const cache = (service as any).priceCache;
      cache.set('PETR4', { value: 30, timestamp: Date.now() });

      mockYahooFinance.quote.mockRejectedValue(new Error('API Error'));

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices).toEqual({ PETR4: 30 });
    });

    it('returns empty object when all tickers fail', async () => {
      mockYahooFinance.quote.mockRejectedValue(new Error('API Error'));

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices).toEqual({});
    });

    it('caches fetched prices', async () => {
      mockYahooFinance.quote.mockResolvedValue([{ regularMarketPrice: 30 }]);

      await service.getBatchPrices(['PETR4']);

      const cache = (service as any).priceCache;
      expect(cache.get('PETR4')?.value).toBe(30);
    });
  });

  describe('search', () => {
    it('returns empty array for empty query', async () => {
      const results = await service.search('');

      expect(results).toEqual([]);
      expect(mockYahooFinance.search).not.toHaveBeenCalled();
    });

    it('returns empty array for query shorter than 2 chars', async () => {
      const results = await service.search('P');

      expect(results).toEqual([]);
      expect(mockYahooFinance.search).not.toHaveBeenCalled();
    });

    it('returns empty array when searchResult is null', async () => {
      mockYahooFinance.search.mockResolvedValue(null);

      const results = await service.search('PETR');

      expect(results).toEqual([]);
    });

    it('returns empty array when quotes is undefined', async () => {
      mockYahooFinance.search.mockResolvedValue({});

      const results = await service.search('PETR');

      expect(results).toEqual([]);
    });

    it('filters for Brazilian stocks only', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          { symbol: 'PETR4.SA', shortname: 'Petrobras', quoteType: 'EQUITY' },
          { symbol: 'PBR', shortname: 'Petrobras ADR', quoteType: 'EQUITY' },
        ],
      });

      const results = await service.search('PETR');

      expect(results).toHaveLength(1);
      expect(results[0].ticker).toBe('PETR4');
    });

    it('includes both equities and options', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          { symbol: 'PETR4.SA', shortname: 'Petrobras', quoteType: 'EQUITY' },
          { symbol: 'PETRA30.SA', shortname: 'PETR Call', quoteType: 'OPTION' },
        ],
      });

      const results = await service.search('PETR');

      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('PETR4');
      expect(results[0].type).toBe('STOCK');
      expect(results[1].ticker).toBe('PETRA30');
      expect(results[1].type).toBe('OPTION');
    });

    it('filters out options when includeOptions is false', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          { symbol: 'PETR4.SA', shortname: 'Petrobras', quoteType: 'EQUITY' },
          { symbol: 'PETRA30.SA', shortname: 'PETR Call', quoteType: 'OPTION' },
        ],
      });

      const results = await service.search('PETR', 10, false);

      expect(results).toHaveLength(1);
      expect(results[0].ticker).toBe('PETR4');
    });

    it('skips quotes without symbol', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          { shortname: 'No Symbol', quoteType: 'EQUITY' },
          { symbol: 'PETR4.SA', shortname: 'Petrobras', quoteType: 'EQUITY' },
        ],
      });

      const results = await service.search('PETR');

      expect(results).toHaveLength(1);
      expect(results[0].ticker).toBe('PETR4');
    });

    it('uses longname when shortname is missing', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          {
            symbol: 'PETR4.SA',
            longname: 'Petroleo Brasileiro',
            quoteType: 'EQUITY',
          },
        ],
      });

      const results = await service.search('PETR');

      expect(results[0].name).toBe('Petroleo Brasileiro');
    });

    it('uses ticker when both names are missing', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [{ symbol: 'PETR4.SA', quoteType: 'EQUITY' }],
      });

      const results = await service.search('PETR');

      expect(results[0].name).toBe('PETR4');
    });

    it('uses default exchange when not provided', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          {
            symbol: 'PETR4.SA',
            shortname: 'Petrobras',
            quoteType: 'EQUITY',
          },
        ],
      });

      const results = await service.search('PETR');

      expect(results[0].exchange).toBe('BVMF');
    });

    it('uses provided exchange', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          {
            symbol: 'PETR4.SA',
            shortname: 'Petrobras',
            quoteType: 'EQUITY',
            exchange: 'SAO',
          },
        ],
      });

      const results = await service.search('PETR');

      expect(results[0].exchange).toBe('SAO');
    });

    it('respects limit parameter', async () => {
      mockYahooFinance.search.mockResolvedValue({
        quotes: [
          {
            symbol: 'PETR4.SA',
            shortname: 'Petrobras',
            quoteType: 'EQUITY',
          },
          {
            symbol: 'PETR3.SA',
            shortname: 'Petrobras PN',
            quoteType: 'EQUITY',
          },
          {
            symbol: 'VALE3.SA',
            shortname: 'Vale',
            quoteType: 'EQUITY',
          },
        ],
      });

      const results = await service.search('PETR', 2);

      expect(results).toHaveLength(2);
    });

    it('returns empty array on API error', async () => {
      mockYahooFinance.search.mockRejectedValue(new Error('API Error'));

      const results = await service.search('PETR');

      expect(results).toEqual([]);
    });
  });
});
