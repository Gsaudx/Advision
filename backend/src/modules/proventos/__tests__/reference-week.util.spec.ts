import { getReferenceWeek } from '../utils/reference-week.util';

describe('getReferenceWeek', () => {
  it('should return correct week for a mid-week date', () => {
    // Wednesday, 2026-04-01 => Week 14 of 2026
    const result = getReferenceWeek(new Date(2026, 3, 1));
    expect(result).toBe('2026-W14');
  });

  it('should return correct week for a Monday (ISO week start)', () => {
    // Monday, 2026-03-30
    const result = getReferenceWeek(new Date(2026, 2, 30));
    expect(result).toBe('2026-W14');
  });

  it('should return correct week for a Sunday (ISO week end)', () => {
    // Sunday, 2026-04-05
    const result = getReferenceWeek(new Date(2026, 3, 5));
    expect(result).toBe('2026-W14');
  });

  it('should handle year boundary (Dec 31 may be W01 of next year)', () => {
    // Thursday, 2026-01-01 => Week 01 of 2026
    const result = getReferenceWeek(new Date(2026, 0, 1));
    expect(result).toBe('2026-W01');
  });

  it('should handle last day of year', () => {
    // 2026-12-31 (Thursday) => Week 53 of 2026
    const result = getReferenceWeek(new Date(2026, 11, 31));
    expect(result).toBe('2026-W53');
  });

  it('should handle year boundary where Jan 1 is in previous year week', () => {
    // 2027-01-01 (Friday) => still Week 53 of 2026
    const result = getReferenceWeek(new Date(2027, 0, 1));
    expect(result).toBe('2026-W53');
  });

  it('should default to current date when no argument is provided', () => {
    const result = getReferenceWeek();
    expect(result).toMatch(/^\d{4}-W\d{2}$/);
  });
});
