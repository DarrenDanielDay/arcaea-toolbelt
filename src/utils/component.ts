import { ParseSelector } from "typed-query-selector/parser";
import { element, listen, registerDirective } from "hyplate";
import { CleanUpFunc, JSXDirective } from "hyplate/types";

export const query =
  <T extends Record<string, string>>(queries: T): Query<T> =>
  (host) =>
    // @ts-expect-error Dynamic Implementation
    Object.fromEntries(Object.entries(queries).map(([key, value]) => [key, host.querySelector(value)]));

export type Query<T extends Record<string, string>> = (host: ParentNode) => Refs<T>;

export type Refs<T extends Record<string, string>> = {
  [K in keyof T]: ParseSelector<T[K]>;
};

export type RefsOf<Q> = Q extends Query<infer T> ? Refs<T> : never;

export const input = () => element("input");

export class EnterSubmitDirective implements JSXDirective<boolean> {
  prefix = "keypress-submit";
  requireParams = false;
  apply(el: Element, _params: string | null, input: boolean): void | CleanUpFunc {
    if (input && el instanceof HTMLInputElement) {
      return listen(el)("keypress", (e) => {
        if (e.key.toLowerCase() === "enter") el.form?.requestSubmit();
      });
    }
  }
}

registerDirective(new EnterSubmitDirective());

declare module "hyplate/types" {
  export interface ElementDirectives<E extends Element> {
    "keypress-submit"?: boolean;
  }
}
