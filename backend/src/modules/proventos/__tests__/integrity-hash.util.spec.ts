import { generateDividendHash } from '../utils/integrity-hash.util';

describe('generateDividendHash', () => {
  const baseInput = {
    ticker: 'PETR4',
    dividendType: 'DIVIDENDO',
    approvedDate: '2026-02-01',
    paymentDate: '2026-03-15',
    valuePerShare: 1.234,
  };

  it('should return a 64-character hex string (SHA-256)', () => {
    const hash = generateDividendHash(baseInput);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic (same input -> same hash)', () => {
    const hash1 = generateDividendHash(baseInput);
    const hash2 = generateDividendHash(baseInput);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = generateDividendHash(baseInput);
    const hash2 = generateDividendHash({ ...baseInput, ticker: 'VALE3' });
    expect(hash1).not.toBe(hash2);
  });

  it('should handle null fields as empty strings', () => {
    const hash = generateDividendHash({
      ticker: 'PETR4',
      dividendType: null,
      approvedDate: null,
      paymentDate: null,
      valuePerShare: null,
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle undefined fields as empty strings', () => {
    const hash = generateDividendHash({ ticker: 'PETR4' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce same hash for null and undefined of same field', () => {
    const hashNull = generateDividendHash({
      ticker: 'PETR4',
      dividendType: null,
    });
    const hashUndefined = generateDividendHash({ ticker: 'PETR4' });
    expect(hashNull).toBe(hashUndefined);
  });

  it('should produce different hash when value changes slightly', () => {
    const hash1 = generateDividendHash(baseInput);
    const hash2 = generateDividendHash({
      ...baseInput,
      valuePerShare: 1.235,
    });
    expect(hash1).not.toBe(hash2);
  });
});
