import { token } from "../../../services/di";
import { CleanUp } from "../../../utils/component";

export interface Route {
  path: string;
  title: string;
  setup(): Element;
}

type RouteChangeCallback = (newRoute: Route) => void;

export class Router {
  private subscribers = new Set<RouteChangeCallback>();
  constructor(
    private readonly container: Element,
    public readonly routes: Route[],
    public readonly defaultRoute: Route
  ) {
    queueMicrotask(() => {
      this.navigate(this.matchRoute(location.hash.slice(1)));
    });
  }

  matchRoute(path: string): Route {
    return this.routes.find((r) => r.path === path) || this.defaultRoute;
  }

  navigate(route: Route) {
    const url = new URL(location.href);
    url.hash = route.path;
    history.replaceState({}, "", url);
    this.container.innerHTML = "";
    this.container.appendChild(route.setup());
    for (const subscriber of [...this.subscribers]) {
      subscriber(route);
    }
  }

  subscribe(subscriber: RouteChangeCallback): CleanUp {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
}

export const $Router = token<Router>("router");
