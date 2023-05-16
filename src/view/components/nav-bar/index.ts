import html from "bundle-text:./template.html";
import {
  CleanUp,
  Component,
  Disposable,
  OnConnected,
  OnDisconnected,
  cleanup,
  clone,
  effect,
  fragment,
  query,
} from "../../../utils/component";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $Router, Router } from "../../pages/router";
import { onClickElsewhere } from "../../../utils/click-elsewhere";

const templates = query({
  nav: "template#nav-bar",
  item: "template#nav-item",
} as const)(fragment(html));

export
@Component({
  selector: "nav-bar",
  html: templates.nav,
  css: [bootstrap],
})
class NavBar extends HTMLElement implements OnConnected, OnDisconnected, Disposable {
  @Inject($Router)
  accessor router!: Router;
  cleanups: CleanUp[] = [];
  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    const toggler = shadow.querySelector("button.navbar-toggler")!;
    const collapsePanel = shadow.querySelector("div.collapse")!;
    const routesContainer = shadow.querySelector("ul.navbar-nav:first-child")!;
    const show = "show";
    toggler.onclick = () => {
      collapsePanel.classList.toggle(show);
    };
    const itemTemplate = templates.item.content.querySelector("li.nav-item")!;
    const routeItems = this.router.routes.map((route) => {
      const node = clone(itemTemplate);
      const anchor = node.querySelector("a")!;
      anchor.textContent = route.title;
      anchor.onclick = () => {
        this.router.navigate(route);
        collapsePanel.classList.remove(show);
      };
      return { node, route };
    });
    routesContainer.append(...routeItems.map((r) => r.node));
    onClickElsewhere(this, this, () => {
      collapsePanel.classList.remove(show);
    });
    effect(this, () =>
      this.router.subscribe((newRoute) => {
        const target = routeItems.find((r) => r.route.path === newRoute.path);
        if (!target) {
          return;
        }
        for (const item of routeItems) {
          item.node.classList.toggle("active", item === target);
        }
      })
    );
  }
  disconnectedCallback(): void {
    cleanup(this);
  }
}
