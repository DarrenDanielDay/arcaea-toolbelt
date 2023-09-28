import { Attribute, Component, HyplateElement, computed } from "hyplate";
import type { GlobalAttributes, Signal } from "hyplate/types";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $Router, Router } from "../../pages/router";

export interface RouteLinkProps {}

export
@Component({
  tag: "route-link",
  styles: [bootstrap],
})
class RouteLink extends HyplateElement {
  @Attribute("path")
  accessor path!: Signal<string | null>;
  @Inject($Router)
  accessor router!: Router;
  override render() {
    return (
      <a
        href={computed(() => `#${this.path()}`)}
        onClick={(e) => {
          if (e.ctrlKey) {
            return;
          }
          const path = this.path();
          if (!path) {
            return;
          }
          this.router.navigate(this.router.matchRoute(path));
        }}
      >
        <slot></slot>
      </a>
    );
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "route-link": JSXAttributes<RouteLinkProps & GlobalAttributes, RouteLink>;
    }
  }
}
