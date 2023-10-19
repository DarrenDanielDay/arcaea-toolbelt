import { openDB, requestToPromise } from "../utils/indexed-db";
import { sum } from "../utils/math";
import { getNow } from "../utils/time";

export interface HttpGetCache {
  url: string;
  time?: Date;
  blob: Blob;
}

const storeName = "caches";

export class CachedHttpGetClient {
  db: IDBDatabase | null = null;
  constructor(public cacheDbName: string, public version: number) {}

  async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    const db = await openDB(this.cacheDbName, this.version, (_, request) => {
      const db = request.result;
      db.createObjectStore(storeName, { keyPath: "url" });
    });
    return (this.db = db);
  }

  async fetch(input: string | URL, expireTime?: number): Promise<Response> {
    const now = getNow();
    const db = await this.getDB();
    const url = getURL(input);
    const queryRequest: IDBRequest<HttpGetCache | null> = db.transaction([storeName]).objectStore(storeName).get(url);
    const result = await requestToPromise(queryRequest);
    if (result && (!result.time || +result.time + (expireTime ?? Infinity) > +now)) {
      console.debug(`Found cached result for url: ${result.url}`);
      return new Response(result.blob);
    }
    const response = await fetch(url);
    const blob = await response.blob();
    const cache: HttpGetCache = {
      url,
      blob,
      time: getNow(),
    };
    const saveRequest = db.transaction([storeName], "readwrite").objectStore(storeName).put(cache);
    const savedKey = await requestToPromise(saveRequest);
    if (savedKey) {
      console.debug(`Cached request URL: ${saveRequest.result}`);
    }
    return new Response(blob);
  }

  async invalidateCache(input: string | URL): Promise<any> {
    const db = await this.getDB();
    const url = getURL(input);
    const deleteRequest = db.transaction([storeName], "readwrite").objectStore(storeName).delete(url);
    await requestToPromise(deleteRequest, { emitError: true });
  }

  async cacheUsage() {
    const db = await this.getDB();
    const query: IDBRequest<HttpGetCache[]> = db.transaction([storeName]).objectStore(storeName).getAll();
    const httpGetCaches = (await requestToPromise(query, { emitError: true })) ?? [];
    const byteSize = sum(httpGetCaches.map((cache) => cache.blob.size));
    return byteSize;
  }

  async clear() {
    const db = await this.getDB();
    const request = db.transaction([storeName], "readwrite").objectStore(storeName).clear();
    await requestToPromise(request, { emitError: true });
  }
}

function getURL(input: string | URL) {
  return input instanceof URL ? input.href : input;
}
