import icon from "../../../favicon.ico";
import github from "../../../assets/github.svg";
import { bootstrap } from "../../styles";
import { Inject } from "../../../services/di";
import { $Router, Router } from "../../pages/router";
import { clickElsewhere } from "../../../utils/click-elsewhere";
import { alert } from "../global-message";
import { Component, HyplateElement, computed, signal } from "hyplate";
import { $ChartService, ChartService } from "../../../services/declarations";

export
@Component({
  tag: "nav-bar",
  styles: [bootstrap],
})
class NavBar extends HyplateElement {
  @Inject($Router)
  accessor router!: Router;
  @Inject($ChartService)
  accessor chart!: ChartService;

  showMenu = signal(false);
  activeRoute = signal("");
  override render() {
    this.effect(() => clickElsewhere(this, () => this.showMenu.set(false)));
    this.effect(() => this.router.subscribe((newRoute) => this.activeRoute.set(newRoute.path)));
    return (
      <nav class="navbar navbar-expand-lg bg-body-tertiary">
        <div class="container-fluid">
          <a class="navbar-brand" href="#" onDblclick={this.showVersion}>
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
                    onClick={() => {
                      this.router.navigate(route);
                      this.showMenu.set(false);
                    }}
                  >
                    {route.title}
                  </a>
                </li>
              ))}
            </ul>
            <ul class="navbar-nav">
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

  showVersion = () => {
    alert(
      <div>
        <p>Arcaea Toolbelt 版本: {process.env.COMMIT_SHA}</p>
        <p>最大潜力值: {this.chart.maximumPotential}</p>
      </div>
    );
  };

  toggleMenu = () => {
    this.showMenu.update((show) => !show);
  };
}
