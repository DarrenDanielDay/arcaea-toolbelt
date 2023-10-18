import icon from "../../../favicon.ico";
import moon from "bootstrap-icons/icons/moon-fill.svg";
import sun from "bootstrap-icons/icons/sun.svg";
import github from "../../../assets/github.svg";
import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $Router, Router } from "../../pages/router";
import { clickElsewhere } from "../../../utils/click-elsewhere";
import { Component, HyplateElement, computed, signal, subscribe } from "hyplate";
import { $PreferenceService, ColorTheme, Preference, PreferenceService } from "../../../services/declarations";
export
@Component({
  tag: "nav-bar",
  styles: [bootstrap, sheet],
})
class NavBar extends HyplateElement {
  @Inject($Router)
  accessor router!: Router;
  @Inject($PreferenceService)
  accessor preference!: PreferenceService;

  showMenu = signal(false);
  activeRoute = signal("");
  theme = signal<ColorTheme>("light");
  override render() {
    this.effect(() =>
      subscribe(this.preference.signal("theme"), (theme) => {
        document.documentElement.dataset["bsTheme"] = theme;
        document.documentElement.dataset["theme"] = theme;
        this.theme.set(theme);
      })
    );
    this.effect(() => clickElsewhere(this, () => this.showMenu.set(false)));
    this.effect(() => this.router.subscribe((newRoute) => this.activeRoute.set(newRoute.path)));
    return (
      <nav class="navbar navbar-expand-lg bg-body-tertiary">
        <div class="container-fluid">
          <a class="navbar-brand" href="#" onClick={(e) => e.preventDefault()}>
            <img src={icon} alt="Logo" width="24" height="24" class="d-inline-block align-text-top" />
            {" Arcaea Toolbelt "}
          </a>
          <button class="navbar-toggler" type="button" onClick={this.toggleMenu}>
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" class:show={this.showMenu}>
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
              {this.router.routes.map((route) => (
                <li class="nav-item" class:active={computed(() => this.activeRoute() === route.path)}>
                  <a
                    class="nav-link"
                    role="button"
                    href={`#${route.path}`}
                    onClick={(e) => {
                      if (!e.ctrlKey) {
                        this.router.navigate(route);
                        this.showMenu.set(false);
                      }
                    }}
                  >
                    {route.title}
                  </a>
                </li>
              ))}
            </ul>
            <ul class="navbar-nav">
              <li class="nav-item">
                <button class="btn btn-link nav-link" onClick={this.toggleTheme}>
                  <img src={computed(() => (this.theme() === "light" ? sun : moon))} alt="theme-icon.svg"></img>
                  <span class="d-lg-none">{computed(() => `切换${this.theme() === "light" ? "暗" : "亮"}色主题`)}</span>
                </button>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="https://github.com/DarrenDanielDay/arcaea-toolbelt" target="_blank">
                  <img src={github} width="24" height="24" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }

  toggleMenu = () => {
    this.showMenu.update((show) => !show);
  };

  toggleTheme = () => {
    this.preference.update({
      theme: this.theme() === "light" ? "dark" : "light",
    });
  };
}
