export const openDB = (
  name: string,
  version: number,
  onupgradeneeded: (event: IDBVersionChangeEvent, request: IDBOpenDBRequest) => void
) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const openRequest = indexedDB.open(name, version);
    openRequest.onerror = reject;
    openRequest.onupgradeneeded = (event) => {
      if (!(event instanceof IDBVersionChangeEvent)) {
        return;
      }
      onupgradeneeded(event, openRequest);
    };
    openRequest.onsuccess = () => {
      resolve(openRequest.result);
    };
  });

export interface IDBOptions {
  emitError?: boolean;
}

export const requestToPromise = <T>(query: IDBRequest<T>, options?: IDBOptions) =>
  new Promise<T | null>((resolve, reject) => {
    query.onsuccess = () => {
      resolve(query.result);
    };
    query.onerror = (e) => {
      console.error(e);
      if (options?.emitError) {
        reject(e);
      } else {
        resolve(null);
      }
    };
  });
