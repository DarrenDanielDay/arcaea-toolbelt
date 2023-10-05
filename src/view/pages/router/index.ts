import type { CleanUpFunc } from "hyplate/types";
import { token } from "classic-di";

export interface Route {
  cahce?: boolean;
  path: string;
  title: string;
  setup(): Element;
}

export interface NavigateConfig<T> {
  query: T;
  cache: boolean;
}

type RouteChangeCallback = (newRoute: Route) => void;

export type QueryParams<P extends string> = {
  [key in P]: string | undefined | null;
};

export class Router {
  private currentRoute: Route | null = null;
  private caches: Record<string, object> = {};
  private subscribers = new Set<RouteChangeCallback>();
  constructor(
    private readonly container: Element,
    public readonly routes: Route[],
    public readonly defaultRoute: Route
  ) {
    queueMicrotask(() => {
      this.navigate(this.matchRoute(location.hash.slice(1)), {
        query: this.parseQuery(),
      });
    });
  }

  matchRoute(path: string): Route {
    return this.routes.find((r) => r.path === path) || this.defaultRoute;
  }

  parseQuery<P extends string>(url: URL = this.getURL()): Partial<QueryParams<P>> {
    const search: Partial<QueryParams<P>> = {};
    url.searchParams.forEach((value, key) => {
      Reflect.set(search, key, value);
    });
    return search;
  }

  updateLocation(url: URL) {
    history.replaceState({}, "", url);
  }

  getURL() {
    return new URL(location.href);
  }

  updateSearchParams(url: URL, search?: object) {
    for (const key in search) {
      const value = Reflect.get(search, key);
      if (value != null) {
        url.searchParams.set(key, `${value}`);
      } else {
        url.searchParams.delete(key);
      }
    }
  }

  updateQuery<P extends string>(search?: Partial<QueryParams<P>>) {
    const url = this.getURL();
    this.updateSearchParams(url, search);
    this.updateLocation(url);
  }

  navigate<T extends object>(route: Route, config?: Partial<NavigateConfig<T>>) {
    const url = this.getURL();
    const currentRoute = this.currentRoute;
    if (currentRoute && (config?.cache ?? currentRoute.cahce)) {
      this.caches[currentRoute.path] = this.parseQuery(url);
    }
    const newURL = new URL(url.pathname, url.origin);
    newURL.hash = route.path;
    this.updateSearchParams(newURL, config?.query ?? this.caches[route.path]);
    this.updateLocation(newURL);
    this.currentRoute = route;
    this.container.innerHTML = "";
    this.container.appendChild(route.setup());
    this.dispatchChanges(route);
  }

  private dispatchChanges(route: Route) {
    for (const subscriber of [...this.subscribers]) {
      subscriber(route);
    }
  }

  subscribe(subscriber: RouteChangeCallback): CleanUpFunc {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
}

export const $Router = token<Router>("router");
