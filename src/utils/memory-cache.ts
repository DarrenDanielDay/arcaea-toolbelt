import { PromiseOr } from "./misc";

export interface DataProvider<P extends readonly any[], T> {
  key(...args: P): string;
  alloc(...args: P): Promise<T>;
  clone?(result: T, args: P): T;
  free?(data: T): PromiseOr<void>;
}

export class MemoryCache<P extends readonly any[], T> {
  #cache = new Map<string, T>();
  #pending = new Map<string, Promise<T>>();

  constructor(private readonly provider: DataProvider<P, T>) {}

  async get(...args: P): Promise<T> {
    const cache = this.#cache;
    const key = this.provider.key(...args);
    const cached = cache.get(key);
    if (cached) return cached;
    let pending = this.#pending.get(key);
    if (pending != null) {
      return this.complete(pending, args, key);
    }
    try {
      pending = this.provider.alloc(...args);
      this.#pending.set(key, pending);
      const data = await pending;
      return this.complete(data, args, key);
    } finally {
      this.#pending.delete(key);
    }
  }

  async delete(...args: P) {
    const cache = this.#cache;
    const key = this.provider.key(...args);
    const cached = cache.get(key);
    if (cached) {
      await this.provider.free?.(cached);
      cache.delete(key);
    }
  }

  async clear() {
    const cache = this.#cache;
    for (const key of [...cache.keys()]) {
      const cached = cache.get(key)!;
      await this.provider.free?.(cached);
      cache.delete(key);
    }
  }

  async complete(promise: PromiseOr<T>, args: P, key: string) {
    const data = await promise;
    this.#cache.set(key, data);
    return this.provider.clone?.(data, args) ?? data;
  }
}
