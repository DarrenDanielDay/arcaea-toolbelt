import { Injectable } from "classic-di";
import {
  $AssetsCacheService,
  $Database,
  AppDatabaseContext,
  AssetsCacheService,
  Gateway,
  ImageMemoryCache,
} from "./declarations";
import { CachedHttpGetClient, migrateOldCaches } from "./cache";
import { future } from "../utils/future";
import { DataProvider, MemoryCache } from "../utils/memory-cache";
import { PromiseOr } from "../utils/misc";

@Injectable({
  requires: [$Database],
  implements: $AssetsCacheService,
})
export class AssetsCacheServiceImpl implements AssetsCacheService, DataProvider<[URL, RequestInit], ImageMemoryCache> {
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
  async alloc(input: URL, init?: RequestInit | undefined): Promise<ImageMemoryCache> {
    const res = await this.#client.fetch(input, init);
    const blob = await res.blob();
    return { blob, blobURL: URL.createObjectURL(blob) };
  }

  free(data: ImageMemoryCache): PromiseOr<void> {
    URL.revokeObjectURL(data.blobURL);
  }

  async cachedGet(url: URL, init?: RequestInit | undefined): Promise<ImageMemoryCache> {
    const imageCache = await this.#cache.get(url, init);
    return imageCache;
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
