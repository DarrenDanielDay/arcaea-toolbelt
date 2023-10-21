import { CachedHttpGetClient } from "../services/cache";

function toJSONString(obj: any) {
  return JSON.stringify(obj, undefined, 2) + "\n";
}
export async function saveJSON(root: FileSystemDirectoryHandle, json: any, path: string) {
  const file = await getFileHandle(root, path);
  await writeJSON(file, json);
}

export async function patchJSON(root: FileSystemDirectoryHandle, json: any, path: string) {
  const file = await getFileHandle(root, path);
  const original = await readJSON<any>(file);
  await writeJSON(file, Object.assign(original, json));
}

export async function getDirectoryHandle(root: FileSystemDirectoryHandle, path: string) {
  const segments = path.split(/[\\\/]/).filter((s) => !!s);
  let dir = root;
  for (let i = 0, l = segments.length; i < l; i++) {
    const segment = segments[i]!;
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }
  return dir;
}

export async function getFileHandle(root: FileSystemDirectoryHandle, path: string) {
  const segments = path.split(/[\\\/]/).filter((s) => !!s);
  let dir = root;
  for (let i = 0, l = segments.length - 1; i < l; i++) {
    const segment = segments[i]!;
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }
  const fileName = segments.at(-1)!;
  const file = await dir.getFileHandle(fileName, { create: true });
  return file;
}

async function writeText(file: FileSystemFileHandle, content: FileSystemWriteChunkType) {
  const stream = await file.createWritable({ keepExistingData: false });
  await stream.write(content);
  await stream.close();
}

async function writeJSON(file: FileSystemFileHandle, json: any) {
  await writeText(file, toJSONString(json));
}
export async function readAsText(handle: FileSystemFileHandle) {
  const file = await handle.getFile();
  const content = await file.text();
  return content;
}
export async function readJSON<T>(handle: FileSystemFileHandle): Promise<T> {
  const text = await readAsText(handle);
  return JSON.parse(text);
}

export async function readProjectJSON<T>(path: string) {
  const dir = await getProjectRootDirectory();
  const handle = await getFileHandle(dir, path);
  return readJSON<T>(handle);
}

export async function saveProjectJSON(json: any, path: string) {
  await saveJSON(await getProjectRootDirectory(), json, path);
}

let projectRoot: FileSystemDirectoryHandle | null = null;
export async function getProjectRootDirectory() {
  return (projectRoot ??= await window.showDirectoryPicker({ id: "project-root", mode: "readwrite" }));
}

export function extractName(version: string) {
  return `arcaea_${version}`;
}

export function apkName(version: string) {
  return `${extractName(version)}.apk`;
}

export const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;

export const miscDataClient = new CachedHttpGetClient("misc-data");
