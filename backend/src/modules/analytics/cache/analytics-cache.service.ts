import { Injectable } from '@nestjs/common';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class AnalyticsCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000;

  buildKey(
    advisorId: string,
    widget: string,
    params: Record<string, string | undefined>,
  ): string {
    const sortedParams = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${advisorId}:${widget}:${sortedParams}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
  }

  invalidateAdvisor(advisorId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${advisorId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}
