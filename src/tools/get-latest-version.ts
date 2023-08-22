import { WritableSignal } from "hyplate/types";
import { apkName, getFileHandle, getProjectRootDirectory } from "./shared";

export interface APKResponse {
  url: string;
  version: string;
}

export async function getLatestVersion(): Promise<APKResponse> {
  const res = await fetch("https://webapi.lowiro.com/webapi/serve/static/bin/arcaea/apk", {
    mode: "cors",
    credentials: "omit",
    cache: "no-cache",
    referrer: "https://arcaea.lowiro.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  const data = await res.json();
  if (!data?.success) throw new Error(data ? JSON.stringify(data) : "Failed to get APK info.");
  return data.value;
}

export async function downloadToLocal(
  projectRoot: FileSystemDirectoryHandle,
  { url, version }: APKResponse,
  total: WritableSignal<number>,
  received: WritableSignal<number>,
  signal?: AbortSignal
) {
  const fileHandle = await getFileHandle(projectRoot, `/arcaea/apk/${apkName(version)}`);
  const res = await fetch(url, {
    mode: "cors",
    credentials: "omit",
    referrer: "https://arcaea.lowiro.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    signal,
  });
  const length = +(res.headers.get("content-length") ?? "");
  if (!length) {
    console.warn("Invalid content length. Progress may not work.");
  }
  total.set(length);
  const { body } = res;
  if (!body) throw new Error("Unexpected empty body.");
  const writable = await fileHandle.createWritable({ keepExistingData: false });
  await body
    .pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const newLocal = chunk.length;
          received.update((prev) => prev + newLocal);
          controller.enqueue(chunk);
        },
      })
    )
    .pipeTo(writable);
}
