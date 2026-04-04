import { BrapiDividendsService } from '../services/brapi-dividends.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BrapiDividendsService', () => {
  let service: BrapiDividendsService;

  beforeEach(() => {
    service = new BrapiDividendsService();
    mockFetch.mockReset();
  });

  const brapiResponse = (cashDividends: unknown[]) => ({
    ok: true,
    json: async () => ({
      results: [
        {
          symbol: 'PETR4',
          dividendsData: { cashDividends },
        },
      ],
    }),
  });

  it('should map brapi response to BrapiDividendDto[]', async () => {
    mockFetch.mockResolvedValue(
      brapiResponse([
        {
          label: 'DIVIDENDO',
          approvedOn: '2026-02-01',
          paymentDate: '2026-03-15',
          lastDatePrior: '2026-03-01',
          rate: 1.234,
        },
      ]),
    );

    const result = await service.fetchDividends('PETR4');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ticker: 'PETR4',
      dividendType: 'DIVIDENDO',
      approvedDate: '2026-02-01',
      paymentDate: '2026-03-15',
      exDividendDate: '2026-03-01',
      valuePerShare: 1.234,
      rawPayload: expect.any(Object),
    });
  });

  it('should return empty array when no cashDividends', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ symbol: 'PETR4' }] }),
    });

    const result = await service.fetchDividends('PETR4');
    expect(result).toEqual([]);
  });

  it('should return empty array when results is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    const result = await service.fetchDividends('PETR4');
    expect(result).toEqual([]);
  });

  it('should throw on HTTP error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.fetchDividends('PETR4')).rejects.toThrow(
      'brapi returned 500 for PETR4',
    );
  });

  it('should handle null fields gracefully', async () => {
    mockFetch.mockResolvedValue(
      brapiResponse([{ label: null, rate: null }]),
    );

    const result = await service.fetchDividends('PETR4');

    expect(result[0]).toMatchObject({
      ticker: 'PETR4',
      dividendType: null,
      approvedDate: null,
      paymentDate: null,
      exDividendDate: null,
      valuePerShare: null,
    });
  });

  it('should pass dividends=true in URL', async () => {
    mockFetch.mockResolvedValue(brapiResponse([]));

    await service.fetchDividends('VALE3');

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('dividends=true');
    expect(calledUrl).toContain('VALE3');
  });
});
