import { Injectable } from "classic-di";
import { $AssetsCacheService, $Database, AppDatabaseContext, AssetsCacheService, Gateway } from "./declarations";
import { CachedHttpGetClient, migrateOldCaches } from "./cache";
import { future } from "../utils/future";
import { DataProvider, MemoryCache } from "../utils/memory-cache";
import { PromiseOr } from "../utils/misc";

@Injectable({
  requires: [$Database],
  implements: $AssetsCacheService,
})
export class AssetsCacheServiceImpl implements AssetsCacheService, DataProvider<[URL, RequestInit], string> {
  #cache = new MemoryCache(this);
  #client: CachedHttpGetClient;
  #migrated = future();

  constructor(private readonly database: AppDatabaseContext) {
    this.#client = new CachedHttpGetClient(database);
    this.#migrate();
  }

  key(input: URL, init?: RequestInit | undefined): string {
    return input.toString();
  }
  async alloc(input: URL, init?: RequestInit | undefined): Promise<string> {
    const res = await this.#client.fetch(input, init);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  free(data: string): PromiseOr<void> {
    URL.revokeObjectURL(data);
  }

  async cachedGet(url: URL, init?: RequestInit | undefined): Promise<string> {
    return this.#cache.get(url, init);
  }

  cacheUsage(): Promise<number> {
    return this.#client.cacheUsage();
  }

  async clearCache(): Promise<void> {
    await this.#client.clear();
    await this.#cache.clear();
  }

  async #migrate() {
    await migrateOldCaches("assets-image-cache", this.database);
    this.#migrated.done();
  }
}
