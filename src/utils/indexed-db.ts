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

export const transactionToPromise = (transaction: IDBTransaction, options?: IDBOptions) =>
  new Promise<void>((resolve, reject) => {
    transaction.onerror = reject;
    transaction.onabort = reject;
    transaction.oncomplete = () => resolve();
  });

export interface DBStore {
  db: IDBDatabase;
  store: string;
}

export const moveData = async (from: DBStore, to: DBStore) => {
  const oldObjects = await requestToPromise(from.db.transaction([from.store]).objectStore(from.store).getAll());
  if (oldObjects) {
    const transaction = to.db.transaction([to.store], "readwrite");
    const store = transaction.objectStore(to.store);
    for (const old of oldObjects) {
      store.put(old);
    }
    await transactionToPromise(transaction);
  }
};

export const dropDatabase = (name: string) => requestToPromise(indexedDB.deleteDatabase(name), { emitError: true });
