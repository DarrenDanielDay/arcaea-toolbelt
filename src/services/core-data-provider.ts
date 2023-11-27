import { Injectable } from "classic-di";
import { $CoreDataProvider, $Database, $Gateway, AppDatabaseContext, CoreDataProvider, Gateway } from "./declarations";
import { DataProvider, MemoryCache } from "../utils/memory-cache";
import { ArcaeaToolbeltMeta } from "../models/misc";
import { ToolbeltCoreData, toolbelt } from "../models/data";
import { meta } from "../data/file-list";
import { requestToPromise } from "../utils/indexed-db";

@Injectable({
  requires: [$Database, $Gateway] as const,
  implements: $CoreDataProvider,
})
export class CoreDataProviderImpl implements CoreDataProvider, DataProvider<[path: string], any> {
  #memoryCache = new MemoryCache<[string], any>(this);
  #metaCache = new MemoryCache<[], ArcaeaToolbeltMeta>({
    key() {
      return "meta";
    },
    alloc: async () => this.fetchJSON(await this.gateway.proxyPass(toolbelt.data(meta))),
  });

  constructor(private readonly database: AppDatabaseContext, private readonly gateway: Gateway) {}
  key(path: string): string {
    return path;
  }
  async alloc(path: string): Promise<any> {
    const meta = await this.getMeta();
    const item = meta.index.find((item) => item.file === path);
    if (!item) {
      throw new Error(`Cannot resolve data file ${path}.`);
    }
    let store = await this.database.objectStore(this.database.core, "readwrite");
    const cache = await requestToPromise<ToolbeltCoreData>(store.get(path));
    if (cache?.hash === item.hash) {
      return cache.content;
    }
    const fetched = await this.fetchJSON(await this.gateway.proxyPass(toolbelt.data(path)));
    // check hash?
    const newData: ToolbeltCoreData = {
      hash: item.hash,
      path,
      content: fetched,
    };
    store = await this.database.objectStore(this.database.core, "readwrite");
    await requestToPromise(store.put(newData));
    return fetched;
  }

  async get<T>(path: string): Promise<T> {
    if (path === meta) return (await this.getMeta()) as T;
    return this.#memoryCache.get(path);
  }

  protected async getMeta() {
    return this.#metaCache.get();
  }

  protected async fetchJSON(url: URL) {
    const target = await this.gateway.proxyPass(url);
    const response = await fetch(target);
    return response.json();
  }
}
