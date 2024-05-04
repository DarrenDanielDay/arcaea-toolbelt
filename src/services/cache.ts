import { moveData, openDB, requestToPromise } from "../utils/indexed-db";
import { sum } from "../utils/math";
import { once } from "../utils/misc";
import { getNow } from "../utils/time";
import { CacheDBContext } from "./declarations";

export interface HttpGetCache {
  url: string;
  time?: Date;
  blob: Blob;
}

export type CreateClientInit = string | CacheDBContext;

export class DefaultCacheDBContext implements CacheDBContext {
  constructor(private readonly name: string) {}
  caches = "caches";
  getDB = once(() => this.#createDB());

  async transaction(stores: string[], mode?: IDBTransactionMode | undefined): Promise<IDBTransaction> {
    const db = await this.getDB();
    return db.transaction(stores, mode);
  }
  async objectStore(store: string, mode?: IDBTransactionMode | undefined): Promise<IDBObjectStore> {
    const transaction = await this.transaction([store], mode);
    return transaction.objectStore(store);
  }

  #createDB() {
    return openDB(this.name, 1, (_, request) => {
      const db = request.result;
      db.createObjectStore(this.caches, { keyPath: "url" });
    });
  }
}

export class CachedHttpGetClient {
  dbContext: CacheDBContext;
  constructor(init: CreateClientInit) {
    this.dbContext = typeof init === "string" ? new DefaultCacheDBContext(init) : init;
  }

  async fetch(input: string | URL, init?: RequestInit, expireTime?: number): Promise<Response> {
    const now = getNow();
    const store = await this.#cacheStore();
    const url = getURL(input);
    const queryRequest: IDBRequest<HttpGetCache | null> = store.get(url);
    const result = await requestToPromise(queryRequest);
    if (result && (!result.time || +result.time + (expireTime ?? Infinity) > +now)) {
      console.debug(`Found cached result for url: ${result.url}`);
      return new Response(result.blob);
    }
    const response = await fetch(url, init);
    if (response.status.toString().match(/^4|5/)) {
      throw new Error("Request failed.");
    }
    const blob = await response.blob();
    const cache: HttpGetCache = {
      url,
      blob,
      time: getNow(),
    };
    const saveRequest = (await this.#cacheStore("readwrite")).put(cache);
    const savedKey = await requestToPromise(saveRequest);
    if (savedKey) {
      console.debug(`Cached request URL: ${saveRequest.result}`);
    }
    return new Response(blob);
  }

  async invalidateCache(input: string | URL): Promise<any> {
    const store = await this.#cacheStore("readwrite");
    const url = getURL(input);
    const deleteRequest = store.delete(url);
    await requestToPromise(deleteRequest, { emitError: true });
  }

  async cacheUsage() {
    const query: IDBRequest<HttpGetCache[]> = (await this.#cacheStore()).getAll();
    const httpGetCaches = (await requestToPromise(query, { emitError: true })) ?? [];
    const byteSize = sum(httpGetCaches.map((cache) => cache.blob.size));
    return byteSize;
  }

  async clear() {
    const store = await this.#cacheStore("readwrite");
    const request = store.clear();
    await requestToPromise(request, { emitError: true });
  }

  #cacheStore(mode?: IDBTransactionMode) {
    return this.dbContext.objectStore(this.dbContext.caches, mode);
  }
}

export const migrateOldCaches = async (oldName: string, to: CacheDBContext) => {
  const databases = (await indexedDB.databases?.()) ?? [];
  const old = databases.find((d) => d.name === oldName);
  if (!old) {
    return;
  }
  const oldClient = new DefaultCacheDBContext(oldName);
  const oldDB = await oldClient.getDB();
  await moveData(
    {
      db: oldDB,
      store: oldClient.caches,
    },
    {
      db: await to.getDB(),
      store: to.caches,
    }
  );
  oldDB.close();
  await requestToPromise(indexedDB.deleteDatabase(oldName));
};

function getURL(input: string | URL) {
  return input instanceof URL ? input.href : input;
}
