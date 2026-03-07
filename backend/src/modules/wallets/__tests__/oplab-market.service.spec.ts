import { NotFoundException } from '@nestjs/common';
import { OpLabMarketService } from '../providers/oplab-market.service';

describe('OpLabMarketService', () => {
  let service: OpLabMarketService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, OPLAB_ACCESS_TOKEN: 'test-token' };
    service = new OpLabMarketService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('returns true when token is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('returns false when token is not set', () => {
      process.env = { ...originalEnv };
      delete process.env.OPLAB_ACCESS_TOKEN;
      const serviceWithoutToken = new OpLabMarketService();
      expect(serviceWithoutToken.isConfigured()).toBe(false);
    });
  });

  describe('getPrice', () => {
    it('returns price from OpLab API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ symbol: 'PETR4', close: 35.5 }]),
      });

      const price = await service.getPrice('PETR4');
      expect(price).toBe(35.5);
    });

    it('returns cached price on subsequent calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ symbol: 'PETR4', close: 35.5 }]),
      });

      await service.getPrice('PETR4');
      const price2 = await service.getPrice('PETR4');

      expect(price2).toBe(35.5);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('uses bid price if close is not available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ symbol: 'PETRA240', bid: 1.25 }]),
      });

      const price = await service.getPrice('PETRA240');
      expect(price).toBe(1.25);
    });

    it('throws NotFoundException when price not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      await expect(service.getPrice('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMetadata', () => {
    it('returns stock metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              symbol: 'PETR4',
              name: 'Petrobras PN',
              type: 'STOCK',
              sector: 'Oil & Gas',
            },
          }),
      });

      const metadata = await service.getMetadata('PETR4');

      expect(metadata.ticker).toBe('PETR4');
      expect(metadata.name).toBe('Petrobras PN');
      expect(metadata.type).toBe('STOCK');
      expect(metadata.sector).toBe('Oil & Gas');
    });

    it('returns option metadata for option ticker', async () => {
      // First call fails for instrument, triggering option lookup
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      // Second call for option details
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              symbol: 'PETRA240',
              strike: 24.0,
              due_date: '2026-01-16',
              type: 'CALL',
              spot: { symbol: 'PETR4', name: 'Petrobras PN' },
            },
          }),
      });

      const metadata = await service.getMetadata('PETRA240');

      expect(metadata.ticker).toBe('PETRA240');
      expect(metadata.type).toBe('OPTION');
      expect(metadata.optionType).toBe('CALL');
      expect(metadata.underlyingSymbol).toBe('PETR4');
      expect(metadata.strikePrice).toBe(24.0);
    });

    it('throws NotFoundException when asset not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      await expect(service.getMetadata('INVALID123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBatchPrices', () => {
    it('returns prices for multiple tickers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { symbol: 'PETR4', close: 35.5 },
            { symbol: 'VALE3', close: 72.3 },
          ]),
      });

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices.PETR4).toBe(35.5);
      expect(prices.VALE3).toBe(72.3);
    });

    it('uses cache for already fetched tickers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ symbol: 'PETR4', close: 35.5 }]),
      });

      await service.getPrice('PETR4');
      (global.fetch as jest.Mock).mockClear();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ symbol: 'VALE3', close: 72.3 }]),
      });

      const prices = await service.getBatchPrices(['PETR4', 'VALE3']);

      expect(prices.PETR4).toBe(35.5);
      expect(prices.VALE3).toBe(72.3);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('search', () => {
    it('returns empty array for short queries', async () => {
      const results = await service.search('A');
      expect(results).toEqual([]);
    });

    it('returns empty array when not configured', async () => {
      process.env = { ...originalEnv };
      delete process.env.OPLAB_ACCESS_TOKEN;
      const unconfiguredService = new OpLabMarketService();

      const results = await unconfiguredService.search('PETR');
      expect(results).toEqual([]);
    });

    it('searches for instruments with options', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                symbol: 'PETR4',
                name: 'Petrobras PN',
                type: 'STOCK',
                has_options: true,
              },
              {
                symbol: 'PETR3',
                name: 'Petrobras ON',
                type: 'STOCK',
                has_options: true,
              },
            ],
          }),
      });

      const results = await service.search('PETR');

      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('PETR4');
      expect(results[0].name).toBe('Petrobras PN');
      expect(results[0].exchange).toBe('B3');
    });

    it('returns empty array on API error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const results = await service.search('PETR');
      expect(results).toEqual([]);
    });
  });

  describe('searchOptions', () => {
    it('returns empty array when not configured', async () => {
      process.env = { ...originalEnv };
      delete process.env.OPLAB_ACCESS_TOKEN;
      const unconfiguredService = new OpLabMarketService();

      const results = await unconfiguredService.searchOptions('PETR4');
      expect(results).toEqual([]);
    });

    it('returns option series for underlying', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETR4',
            name: 'Petrobras PN',
            close: 35.0,
            series: [
              {
                due_date: '2026-01-16',
                days_to_maturity: 10,
                call: 'A',
                put: 'M',
                strikes: [
                  {
                    strike: 24.0,
                    call: {
                      symbol: 'PETRA240',
                      close: 11.0,
                      category: 'CALL',
                    },
                    put: null,
                  },
                  {
                    strike: 26.0,
                    call: {
                      symbol: 'PETRA260',
                      close: 9.0,
                      category: 'CALL',
                    },
                    put: null,
                  },
                ],
              },
            ],
          }),
      });

      const results = await service.searchOptions('PETR4');

      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('PETRA240');
      expect(results[0].type).toBe('OPTION');
      expect(results[0].strike).toBe(24.0);
      expect(results[0].optionType).toBe('CALL');
    });

    it('filters by option type', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETR4',
            name: 'Petrobras PN',
            close: 35.0,
            series: [
              {
                due_date: '2026-01-16',
                days_to_maturity: 10,
                call: 'A',
                put: 'M',
                strikes: [
                  {
                    strike: 24.0,
                    call: {
                      symbol: 'PETRA240',
                      close: 11.0,
                      category: 'CALL',
                    },
                    put: {
                      symbol: 'PETRM240',
                      close: 0.5,
                      category: 'PUT',
                    },
                  },
                ],
              },
            ],
          }),
      });

      const results = await service.searchOptions('PETR4', 'PUT');

      expect(results).toHaveLength(1);
      expect(results[0].ticker).toBe('PETRM240');
      expect(results[0].optionType).toBe('PUT');
    });
  });

  describe('getOptionSeries', () => {
    it('returns empty array when not configured', async () => {
      process.env = { ...originalEnv };
      delete process.env.OPLAB_ACCESS_TOKEN;
      const unconfiguredService = new OpLabMarketService();

      const series = await unconfiguredService.getOptionSeries('PETR4');
      expect(series).toEqual([]);
    });

    it('returns option series from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETR4',
            name: 'Petrobras PN',
            close: 35.0,
            series: [
              {
                due_date: '2026-01-16',
                days_to_maturity: 10,
                call: 'A',
                put: 'M',
                strikes: [
                  {
                    strike: 24.0,
                    call: {
                      symbol: 'PETRA240',
                      close: 11.0,
                      category: 'CALL',
                    },
                    put: null,
                  },
                  {
                    strike: 26.0,
                    call: {
                      symbol: 'PETRA260',
                      close: 9.0,
                      category: 'CALL',
                    },
                    put: null,
                  },
                ],
              },
            ],
          }),
      });

      const series = await service.getOptionSeries('PETR4');

      expect(series).toHaveLength(2);
      expect(series[0].symbol).toBe('PETRA240');
      expect(series[0].strike).toBe(24.0);
    });

    it('caches series results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETR4',
            name: 'Petrobras PN',
            close: 35.0,
            series: [
              {
                due_date: '2026-01-16',
                days_to_maturity: 10,
                call: 'A',
                put: 'M',
                strikes: [
                  {
                    strike: 24.0,
                    call: {
                      symbol: 'PETRA240',
                      close: 11.0,
                      category: 'CALL',
                    },
                    put: null,
                  },
                ],
              },
            ],
          }),
      });

      await service.getOptionSeries('PETR4');
      await service.getOptionSeries('PETR4');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns empty array on API error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const series = await service.getOptionSeries('PETR4');
      expect(series).toEqual([]);
    });
  });

  describe('getOptionDetails', () => {
    it('returns null when not configured', async () => {
      process.env = { ...originalEnv };
      delete process.env.OPLAB_ACCESS_TOKEN;
      const unconfiguredService = new OpLabMarketService();

      const details = await unconfiguredService.getOptionDetails('PETRA240');
      expect(details).toBeNull();
    });

    it('returns option details with Greeks', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              symbol: 'PETRA240',
              strike: 24.0,
              due_date: '2026-01-16',
              type: 'CALL',
              implied_volatility: 0.35,
              delta: 0.65,
              gamma: 0.08,
              theta: -0.02,
              vega: 0.12,
            },
          }),
      });

      const details = await service.getOptionDetails('PETRA240');

      expect(details).not.toBeNull();
      expect(details!.symbol).toBe('PETRA240');
      expect(details!.delta).toBe(0.65);
      expect(details!.implied_volatility).toBe(0.35);
    });

    it('returns null on API error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const details = await service.getOptionDetails('PETRA240');
      expect(details).toBeNull();
    });

    it('handles direct response format (no data wrapper)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETRA240',
            strike: 24.0,
            due_date: '2026-01-16',
            type: 'CALL',
            delta: 0.65,
          }),
      });

      const details = await service.getOptionDetails('PETRA240');

      expect(details).not.toBeNull();
      expect(details!.symbol).toBe('PETRA240');
      expect(details!.strike).toBe(24.0);
      expect(details!.delta).toBe(0.65);
    });

    it('returns cached series data before calling API', async () => {
      // First populate the series cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETR4',
            name: 'Petrobras PN',
            close: 35.0,
            series: [
              {
                due_date: '2026-01-16',
                days_to_maturity: 10,
                call: 'A',
                put: 'M',
                strikes: [
                  {
                    strike: 24.0,
                    call: {
                      symbol: 'PETRA240',
                      close: 11.0,
                      category: 'CALL',
                    },
                    put: null,
                  },
                ],
              },
            ],
          }),
      });

      await service.getOptionSeries('PETR4');
      (global.fetch as jest.Mock).mockClear();

      // getOptionDetails should find it in cache, no API call needed
      const details = await service.getOptionDetails('PETRA240');

      expect(details).not.toBeNull();
      expect(details!.symbol).toBe('PETRA240');
      expect(details!.strike).toBe(24.0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('getMetadata with series cache', () => {
    it('uses cached series data for option metadata', async () => {
      // Populate the series cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'VALE3',
            name: 'Vale ON',
            close: 58.0,
            series: [
              {
                due_date: '2026-01-30',
                days_to_maturity: 15,
                call: 'A',
                put: 'M',
                strikes: [
                  {
                    strike: 58.65,
                    call: {
                      symbol: 'VALEA620W5',
                      close: 1.5,
                      category: 'CALL',
                    },
                    put: null,
                  },
                ],
              },
            ],
          }),
      });

      await service.getOptionSeries('VALE3');
      (global.fetch as jest.Mock).mockClear();

      // First call to getMetadata fails for instrument, then finds in cache
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      const metadata = await service.getMetadata('VALEA620W5');

      expect(metadata.ticker).toBe('VALEA620W5');
      expect(metadata.type).toBe('OPTION');
      expect(metadata.strikePrice).toBe(58.65);
      expect(metadata.underlyingSymbol).toBe('VALE3');
      // Should NOT have made a second API call for option details
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('handles direct API response when cache is empty', async () => {
      // First call fails for instrument
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      // Second call returns option details directly (no data wrapper)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: 'PETRA240',
            strike: 24.0,
            due_date: '2026-01-16',
            type: 'CALL',
            spot: { symbol: 'PETR4', name: 'Petrobras PN' },
          }),
      });

      const metadata = await service.getMetadata('PETRA240');

      expect(metadata.ticker).toBe('PETRA240');
      expect(metadata.type).toBe('OPTION');
      expect(metadata.strikePrice).toBe(24.0);
      expect(metadata.underlyingSymbol).toBe('PETR4');
    });
  });

  describe('API request headers', () => {
    it('includes Access-Token header in requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ symbol: 'PETR4', close: 35.5 }]),
      });

      await service.getPrice('PETR4');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Access-Token': 'test-token',
          }),
        }),
      );
    });
  });
});
