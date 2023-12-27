import { Injectable } from "classic-di";
import { $Database, AppDatabaseContext } from "./declarations";
import { DBVersionManager } from "../utils/indexed-db";
import { once } from "../utils/misc";

@Injectable({
  implements: $Database,
})
export class ArcaeaToolbeltDatabaseContext implements AppDatabaseContext {
  caches: string = "caches";
  preference: string = "preference";
  profiles: string = "profiles";
  core: string = "core";
  files: string = "files";

  getDB = once(() => this.#create());
  async transaction(stores: string[], mode?: IDBTransactionMode | undefined): Promise<IDBTransaction> {
    const db = await this.getDB();
    return db.transaction(stores, mode);
  }
  async objectStore(store: string, mode?: IDBTransactionMode | undefined): Promise<IDBObjectStore> {
    const transaction = await this.transaction([store], mode);
    return transaction.objectStore(store);
  }

  #create() {
    const manager = new DBVersionManager()
      .version(1, (db) => {
        db.createObjectStore(this.caches, { keyPath: "url" });
        db.createObjectStore(this.preference, { keyPath: "key" });
        db.createObjectStore(this.profiles, { keyPath: "username" });
      })
      .version(2, (db) => {
        db.createObjectStore(this.core, { keyPath: "path" });
      })
      .version(3, (db) => {
        db.createObjectStore(this.files, { keyPath: "url" });
      });
    return manager.open("arcaea-toolbelt", 3);
  }
}
