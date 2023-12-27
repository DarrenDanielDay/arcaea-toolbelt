import { Injectable } from "classic-di";
import { $Database, $FileStorage, AppDatabaseContext, FileStorageService } from "./declarations";
import { UploadedFile } from "../models/file";
import { prefixWith, requestToPromise } from "../utils/indexed-db";
import { protocol } from "../models/data";
import { trimSlash } from "../utils/string";

@Injectable({
  requires: [$Database] as const,
  implements: $FileStorage,
})
export class FileStorageServiceImpl implements FileStorageService {
  constructor(private readonly database: AppDatabaseContext) {}

  createURL(site: URL, path: string): URL {
    return new URL(`${protocol}//vfs/${site.origin}${trimSlash(site.pathname)}/${path}`);
  }

  async upload(file: Blob, url: URL): Promise<void> {
    const store = await this.database.objectStore(this.database.files, "readwrite");
    const uploadedFile: UploadedFile = {
      blob: file,
      url: url.href,
    };
    await requestToPromise(store.put(uploadedFile));
  }

  async list(url: URL): Promise<URL[]> {
    const store = await this.database.objectStore(this.database.files);
    const res = await requestToPromise(store.get(prefixWith(url.href)));
    console.log(res);
    return [];
  }

  async read(url: URL): Promise<UploadedFile | null> {
    const store = await this.database.objectStore(this.database.files);
    const request: IDBRequest<UploadedFile> = store.get(url.toString());
    const file = await requestToPromise(request);
    return file;
  }

}
