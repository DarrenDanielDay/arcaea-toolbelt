import icon from "../../../favicon.ico";
import moon from "bootstrap-icons/icons/moon-fill.svg";
import sun from "bootstrap-icons/icons/sun.svg";
import github from "../../../assets/github.svg";
import { bootstrap } from "../../styles";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $Router, Router } from "../../pages/router";
import { clickElsewhere } from "../../../utils/click-elsewhere";
import { AutoRender, Component, HyplateElement, attr, computed, signal, subscribe } from "hyplate";
import { $PreferenceService, ColorTheme, PreferenceService } from "../../../services/declarations";
import { SVGIcon } from "../svg-icon";
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
        const documentElement = document.documentElement;
        attr(documentElement, "data-bs-theme", theme);
        attr(documentElement, "data-theme", theme);
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
                <AutoRender>
                  {() => {
                    const theme = this.theme();
                    const src = theme === "light" ? sun : moon;
                    const toggleThemeText = `切换${theme === "light" ? "纷争" : "光芒"}侧`;
                    return (
                      <button class="btn btn-link nav-link" title={toggleThemeText} onClick={this.toggleTheme}>
                        <SVGIcon src={src} role="img"></SVGIcon>
                        <span class="d-lg-none">{toggleThemeText}</span>
                      </button>
                    );
                  }}
                </AutoRender>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="https://github.com/DarrenDanielDay/arcaea-toolbelt" target="_blank">
                  <SVGIcon src={github} class="github-link" role="img" />
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
