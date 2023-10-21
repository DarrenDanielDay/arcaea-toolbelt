import { Injectable } from "classic-di";
import { $Database, AppDatabaseContext } from "./declarations";
import { openDB } from "../utils/indexed-db";
import { once } from "../utils/misc";

@Injectable({
  implements: $Database,
})
export class ArcaeaToolbeltDatabaseContext implements AppDatabaseContext {
  caches: string = "caches";
  preference: string = "preference";
  profiles: string = "profiles";

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
    return openDB("arcaea-toolbelt", 1, (_, request) => {
      const db = request.result;
      db.createObjectStore(this.caches, { keyPath: "url" });
      db.createObjectStore(this.preference, { keyPath: "key" });
      db.createObjectStore(this.profiles, { keyPath: "username" });
    });
  }
}
