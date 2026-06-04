import {
  resolvePeriod,
  formatYYYYMM,
  formatYYYYMMDD,
  monthRange,
} from '../utils/period.util';

describe('resolvePeriod', () => {
  it('should return CUSTOM range when period is CUSTOM and dates are provided', () => {
    const { from, to } = resolvePeriod('CUSTOM', '2024-01-01', '2024-03-31');
    expect(from.toISOString().startsWith('2024-01-01')).toBe(true);
    expect(to.toISOString().startsWith('2024-03-31')).toBe(true);
  });

  it('should return a range roughly 1 month back for period 1M', () => {
    const { from, to } = resolvePeriod('1M');
    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(27);
    expect(diffDays).toBeLessThan(32);
  });

  it('should set to.hours to end of day', () => {
    const { to } = resolvePeriod('1M');
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
  });

  it('should default to 1M for unknown period', () => {
    const { from: fromDefault } = resolvePeriod('1M');
    const { from: fromUnknown } = resolvePeriod('UNKNOWN');
    const diffMs = Math.abs(fromDefault.getTime() - fromUnknown.getTime());
    expect(diffMs).toBeLessThan(1000);
  });
});

describe('formatYYYYMM', () => {
  it('should format a date to YYYY-MM', () => {
    expect(formatYYYYMM(new Date('2024-06-15T00:00:00Z'))).toBe('2024-06');
  });
});

describe('formatYYYYMMDD', () => {
  it('should format a date to YYYY-MM-DD', () => {
    expect(formatYYYYMMDD(new Date('2024-06-15T00:00:00Z'))).toBe('2024-06-15');
  });
});

describe('monthRange', () => {
  it('should generate all months between two dates inclusive', () => {
    const from = new Date(2024, 0, 1); // Jan 1 local
    const to = new Date(2024, 2, 31); // Mar 31 local
    const months = monthRange(from, to);
    expect(months).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('should return a single month when from and to are in the same month', () => {
    const d = new Date(2024, 5, 10); // Jun 10 local
    expect(monthRange(d, d)).toEqual(['2024-06']);
  });
});
