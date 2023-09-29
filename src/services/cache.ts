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
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const openRequest = indexedDB.open(this.cacheDbName, this.version);
      openRequest.onerror = reject;
      openRequest.onupgradeneeded = (event) => {
        const target = event.target;
        if (!(target instanceof IDBOpenDBRequest)) {
          return;
        }
        const db = target.result;
        db.createObjectStore(storeName, { keyPath: "url" });
      };

      openRequest.onsuccess = () => {
        resolve(openRequest.result);
      };
    });
    return (this.db = db);
  }

  async fetch(input: string | URL, expireTime?: number): Promise<Response> {
    const now = getNow();
    const db = await this.getDB();
    const url = getURL(input);
    const result = await new Promise<HttpGetCache | null>((resolve) => {
      const queryRequest = db.transaction([storeName]).objectStore(storeName).get(url);
      queryRequest.onsuccess = () => {
        resolve(queryRequest.result);
      };
      queryRequest.onerror = (e) => {
        console.error(e);
        resolve(null);
      };
    });
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
    await new Promise<void>((resolve) => {
      const saveRequest = db.transaction([storeName], "readwrite").objectStore(storeName).put(cache);
      saveRequest.onsuccess = () => {
        console.debug(`Cached request URL: ${saveRequest.result}`);
        resolve();
      };
      saveRequest.onerror = () => {
        resolve();
      };
    });
    return new Response(blob);
  }

  async invalidateCache(input: string | URL): Promise<any> {
    const db = await this.getDB();
    const url = getURL(input);
    return new Promise((resolve, reject) => {
      const deleteRequest = db.transaction([storeName], "readwrite").objectStore(storeName).delete(url);
      deleteRequest.onsuccess = resolve;
      deleteRequest.onerror = reject;
    });
  }
}

function getURL(input: string | URL) {
  return input instanceof URL ? input.href : input;
}
