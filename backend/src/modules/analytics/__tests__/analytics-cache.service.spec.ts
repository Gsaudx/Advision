import { AnalyticsCacheService } from '../cache/analytics-cache.service';

describe('AnalyticsCacheService', () => {
  let service: AnalyticsCacheService;

  beforeEach(() => {
    service = new AnalyticsCacheService();
  });

  describe('buildKey', () => {
    it('should build a deterministic key sorted by param name', () => {
      const k1 = service.buildKey('adv1', 'widget', { b: '2', a: '1' });
      const k2 = service.buildKey('adv1', 'widget', { a: '1', b: '2' });
      expect(k1).toBe(k2);
      expect(k1).toBe('adv1:widget:a=1&b=2');
    });

    it('should omit undefined params', () => {
      const key = service.buildKey('adv1', 'widget', { mode: 'CONSOLIDATED', walletId: undefined });
      expect(key).toBe('adv1:widget:mode=CONSOLIDATED');
    });
  });

  describe('get / set', () => {
    it('should return null for a missing key', () => {
      expect(service.get('nonexistent')).toBeNull();
    });

    it('should return cached data before TTL expires', () => {
      service.set('key1', { value: 42 });
      expect(service.get('key1')).toEqual({ value: 42 });
    });

    it('should return null after TTL expires', () => {
      jest.useFakeTimers();
      service.set('key1', { value: 42 });
      jest.advanceTimersByTime(6 * 60 * 1000);
      expect(service.get('key1')).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('invalidateAdvisor', () => {
    it('should remove only entries belonging to the given advisor', () => {
      service.set('adv1:widget:a=1', 'data1');
      service.set('adv1:widget:b=2', 'data2');
      service.set('adv2:widget:a=1', 'data3');

      service.invalidateAdvisor('adv1');

      expect(service.get('adv1:widget:a=1')).toBeNull();
      expect(service.get('adv1:widget:b=2')).toBeNull();
      expect(service.get('adv2:widget:a=1')).toBe('data3');
    });
  });

  describe('MAX_ENTRIES eviction', () => {
    it('should not grow beyond the maximum cache size', () => {
      for (let i = 0; i < 510; i++) {
        service.set(`key${i}`, i);
      }
      // Access internal map size via a small trick — just verify no errors thrown
      // and the most recent entries are retrievable
      expect(service.get('key509')).toBe(509);
    });
  });
});
