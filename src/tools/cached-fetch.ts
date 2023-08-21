interface FetchCache {
  url: string;
  content: string;
}

const storeName = "caches";

class CachedFetchClient {
  db: IDBDatabase | null = null;
  constructor(public cacheDbName: string, public version: number) {}

  async ensureReady() {
    if (this.db) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
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
        this.db = openRequest.result;
        resolve();
      };
    });
  }

  async fetchAsText(input: string | URL): Promise<string> {
    await this.ensureReady();
    const url = getURL(input);
    const db = this.db!;
    const result = await new Promise<FetchCache | null>((resolve) => {
      const queryRequest = db.transaction([storeName]).objectStore(storeName).get(url);
      queryRequest.onsuccess = () => {
        console.log("cached result", queryRequest.result);
        resolve(queryRequest.result);
      };
      queryRequest.onerror = (e) => {
        console.error(e);
        resolve(null);
      };
    });
    if (result) {
      return result.content;
    }
    const response = await fetch(url);
    const content = await response.text();
    const cache: FetchCache = {
      url,
      content,
    };
    await new Promise<void>((resolve) => {
      const saveRequest = db.transaction([storeName], "readwrite").objectStore(storeName).put(cache);
      saveRequest.onsuccess = () => {
        console.log(`Cached request URL: ${saveRequest.result}`);
        resolve();
      };
      saveRequest.onerror = () => {
        resolve();
      };
    });
    return content;
  }

  async invalidateCache(input: string | URL): Promise<any> {
    await this.ensureReady();
    const url = getURL(input);
    const db = this.db!;
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
export const arcaeaCNClient = new CachedFetchClient("arcaea-cn-cache", 1);
Object.assign(window, { arcaeaCNClient });
