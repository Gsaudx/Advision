import { NotFoundException } from '@nestjs/common';
import { BrapiMarketService } from '../providers/brapi-market.service';

describe('BrapiMarketService', () => {
  let service: BrapiMarketService;

  beforeEach(() => {
    service = new BrapiMarketService();
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPrice', () => {
    it('returns cached price if valid', async () => {
      // First call to populate cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ symbol: 'PETR4', regularMarketPrice: 35.5 }],
          }),
      });

      const price1 = await service.getPrice('PETR4');
      expect(price1).toBe(35.5);

      // Second call should use cache
      const price2 = await service.getPrice('PETR4');
      expect(price2).toBe(35.5);

      // fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when price not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when results are empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMetadata', () => {
    it('returns asset metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                symbol: 'PETR4',
                shortName: 'Petrobras PN',
                regularMarketPrice: 35.5,
              },
            ],
          }),
      });

      const metadata = await service.getMetadata('PETR4');

      expect(metadata.ticker).toBe('PETR4');
      expect(metadata.name).toBe('Petrobras PN');
      expect(metadata.type).toBe('STOCK');
    });

    it('throws NotFoundException when asset not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(service.getMetadata('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBatchPrices', () => {
    it('returns prices for multiple tickers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { symbol: 'PETR4', regularMarketPrice: 35.5 },
              { symbol: 'VALE3', regularMarketPrice: 72.3 },
            ],
          }),
      });

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices.PETR4).toBe(35.5);
      expect(prices.VALE3).toBe(72.3);
    });

    it('uses cache for already fetched tickers', async () => {
      // First call for PETR4
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ symbol: 'PETR4', regularMarketPrice: 35.5 }],
          }),
      });

      await service.getPrice('PETR4');

      // Reset mock to track new calls
      (global.fetch as jest.Mock).mockClear();

      // Batch call including cached PETR4
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [{ symbol: 'VALE3', regularMarketPrice: 72.3 }],
          }),
      });

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices.PETR4).toBe(35.5);
      expect(prices.VALE3).toBe(72.3);

      // Should only fetch VALE3 (PETR4 was cached)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('VALE3');
    });
  });

  describe('search', () => {
    it('returns empty array for short queries', async () => {
      const results = await service.search('A');
      expect(results).toEqual([]);
    });

    it('searches for assets', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            stocks: [
              { stock: 'PETR4', name: 'Petrobras PN', type: 'stock' },
              { stock: 'PETR3', name: 'Petrobras ON', type: 'stock' },
            ],
          }),
      });

      const results = await service.search('PETR');

      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('PETR4');
      expect(results[0].name).toBe('Petrobras PN');
      expect(results[0].type).toBe('STOCK');
      expect(results[0].exchange).toBe('B3');
    });

    it('falls back to available endpoint on list failure', async () => {
      // First call fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      // Fallback succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            stocks: ['PETR4', 'PETR3'],
          }),
      });

      const results = await service.search('PETR');

      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('PETR4');
    });

    it('returns empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const results = await service.search('PETR');

      expect(results).toEqual([]);
    });
  });

  describe('option parsing', () => {
    it('returns option metadata for valid option ticker', async () => {
      // Mock the underlying asset fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                symbol: 'PETR4',
                shortName: 'Petrobras PN',
                regularMarketPrice: 35.5,
              },
            ],
          }),
      });

      const metadata = await service.getMetadata('PETRA240');

      expect(metadata.ticker).toBe('PETRA240');
      expect(metadata.type).toBe('OPTION');
      expect(metadata.optionType).toBe('CALL');
      expect(metadata.underlyingSymbol).toBe('PETR');
      expect(metadata.strikePrice).toBe(24);
      expect(metadata.expirationDate).toBeDefined();
    });

    it('returns PUT option metadata for PUT ticker', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                symbol: 'VALE3',
                shortName: 'Vale ON',
                regularMarketPrice: 72.0,
              },
            ],
          }),
      });

      const metadata = await service.getMetadata('VALEM650');

      expect(metadata.ticker).toBe('VALEM650');
      expect(metadata.type).toBe('OPTION');
      expect(metadata.optionType).toBe('PUT');
      expect(metadata.underlyingSymbol).toBe('VALE');
      expect(metadata.strikePrice).toBe(65);
    });

    it('searches for option ticker and returns option result', async () => {
      // First call for option underlying validation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                symbol: 'PETR4',
                shortName: 'Petrobras PN',
                regularMarketPrice: 35.5,
              },
            ],
          }),
      });

      // Second call for stock search (underlying)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            stocks: [{ stock: 'PETR4', name: 'Petrobras PN', type: 'stock' }],
          }),
      });

      const results = await service.search('PETRA240');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].ticker).toBe('PETRA240');
      expect(results[0].type).toBe('OPTION');
    });
  });
});
