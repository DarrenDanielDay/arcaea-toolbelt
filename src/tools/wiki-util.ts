import { CachedHttpGetClient } from "../services/cache";

export const htmlDocument = document.implementation.createHTMLDocument();

export function prepareDocument(page: string, url: string | URL) {
  htmlDocument.open();
  htmlDocument.write(page);
  htmlDocument.close();
  const base = htmlDocument.createElement("base");
  base.href = new URL(url).origin;
  htmlDocument.head.appendChild(base);
}

export async function initPageDocument(url: string | URL) {
  const response = await fetch(url);
  const page = await response.text();
  prepareDocument(page, url);
}

export const wikiBaseURL = new URL("https://wiki.arcaea.cn");

export const pathName = (path: string): string => new URL(path, location.href).pathname;

export const wikiURL = (path: string) => new URL(pathName(path), wikiBaseURL);


export function findNextElWhere(start: Element, where: (el: Element) => boolean): Element | null {
  let node: Element | null = start;
  for (; node && !where(node); node = node.nextElementSibling);
  return node;
}

export const arcaeaCNClient = new CachedHttpGetClient("arcaea-cn-cache", 1);
