import { PromiseOr } from "./misc";

export type DataMigration = (db: IDBDatabase) => PromiseOr<void>;

export type VersionMigrate = (db: IDBDatabase, migrate: (apply: DataMigration) => void) => void;

export class DBVersionManager {
  #versions = new Map<number, VersionMigrate>();
  version(version: number, migrate: VersionMigrate) {
    this.#versions.set(version, migrate);
    return this;
  }

  async open(name: string, version: number): Promise<IDBDatabase> {
    let oldVersion = 0,
      newVersion = version;
    let db: IDBDatabase | null = null;
    const dbs = (await indexedDB.databases?.()) ?? [];
    const targetDB = dbs.find((db) => db.name === name);
    oldVersion = targetDB?.version ?? 0;
    if (!oldVersion) {
      // 除了首次访问，还有可能是Firefox 不支持indexedDB.databses方法，无法获取当前数据库的版本
      return openDB(name, version, (event, request) => {
        const db = request.result;
        const { oldVersion, newVersion } = event;
        if (newVersion == null) throw new Error(`Unexpected Error: DB ${name} is being deleted.`);
        const upgradeRange = this.#getUpgradeRange(oldVersion, newVersion);
        for (const [, upgrade] of upgradeRange) {
          upgrade(db, () => {
            // 在Firefox支持indexedDB.databases之前只能放弃所有数据迁移步骤
          });
        }
      });
    }
    const upgradeRange = this.#getUpgradeRange(oldVersion, newVersion);
    let currentVersion = oldVersion;
    for (const [nextVersion, upgrade] of upgradeRange) {
      let migrations: DataMigration[] = [];
      db?.close();
      const currentDB = await openDB(name, nextVersion, (event, request) => {
        const { oldVersion, newVersion } = event;
        if (newVersion == null) throw new Error(`Unexpected Error: DB ${name} is being deleted.`);
        console.assert(oldVersion === currentVersion, `old version does not match: ${oldVersion} != ${currentVersion}`);
        console.assert(newVersion === nextVersion, `new version does not match: ${newVersion} != ${nextVersion}`);
        const db = request.result;
        upgrade(db, (apply) => {
          migrations.push(apply);
        });
      });
      if (migrations.length) {
        console.debug(`Migrating data of ${name} from v${currentVersion} to v${nextVersion}...`);
        await Promise.all(migrations.map((migrate) => migrate(currentDB)));
      }
      db = currentDB;
      currentVersion = nextVersion;
    }

    if (!db) {
      throw new Error(`Version ${version} of database "${name}" not defined.`);
    }
    return db;
  }

  #getUpgradeRange(oldVersion: number, newVersion: number) {
    return [...this.#versions.entries()]
      .filter(([version]) => oldVersion <= version && version <= newVersion)
      .sort(([a], [b]) => a - b);
  }
}

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
