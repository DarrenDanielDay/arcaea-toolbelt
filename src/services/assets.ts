import { Injectable } from "classic-di";
import {
  $AssetsResolver,
  $AssetsService,
  $Database,
  AppDatabaseContext,
  AssetsResolver,
  AssetsService,
} from "./declarations";
import { CachedHttpGetClient, migrateOldCaches } from "./cache";
import { future } from "../utils/future";

@Injectable({
  requires: [$AssetsResolver, $Database] as const,
  implements: $AssetsService,
})
export class AssetsServiceImpl implements AssetsService {
  /** Memory cache: raw URL -> blob URL */
  #cache: { [url: string]: string } = {};

  #client;

  #migrated = future();

  constructor(private resolver: AssetsResolver, private database: AppDatabaseContext) {
    this.#client = new CachedHttpGetClient(database);
    this.#migrate();
  }

  async getAssets(url: string | URL, noCache?: boolean): Promise<string> {
    await this.#migrated.promise;
    const memoryCache = this.#cache;
    const key = url.toString();
    const cached = memoryCache[key];
    if (cached) return cached;
    const req = await (noCache ? fetch(url) : this.#client.fetch(url));
    const blob = await req.blob();
    return (memoryCache[key] = URL.createObjectURL(blob));
  }

  cacheUsage(): Promise<number> {
    return this.#client.cacheUsage();
  }

  async clearCache(): Promise<void> {
    await this.#client.clear();
    const memoryCache = this.#cache;
    for (const url of Object.keys(memoryCache)) {
      const objURL = memoryCache[url]!;
      URL.revokeObjectURL(objURL);
      delete memoryCache[url];
    }
  }

  async #migrate() {
    await migrateOldCaches("assets-image-cache", this.database);
    this.#migrated.done();
  }
}
