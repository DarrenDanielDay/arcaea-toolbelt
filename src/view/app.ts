import { sheet } from "./app.css.js";
import { bootstrap } from "./styles";
import { provide } from "../services/di";
import { NavBar } from "./components/nav-bar";
import { ChartServiceImpl } from "../services/chart-data";
import { MusicPlayServiceImpl } from "../services/music-play";
import { ProfileServiceImpl } from "../services/player-profile";
import { $Router, Router } from "./pages/router";
import { routes } from "./pages";
import { WorldModeServiceImpl } from "../services/world-mode";
import { element } from "hyplate";
import { Container } from "classic-di";
import { AssetsServiceImpl } from "../services/assets";
import { AssetsResolverImpl } from "../services/assets-resolver";
import { PreferenceServiceImpl } from "../services/preference.js";
document.adoptedStyleSheets = [bootstrap, sheet];

const ioc = new Container();
ioc.register(PreferenceServiceImpl);
ioc.register(AssetsResolverImpl);
ioc.register(AssetsServiceImpl);
ioc.register(ChartServiceImpl);
ioc.register(MusicPlayServiceImpl);
ioc.register(ProfileServiceImpl);
ioc.register(WorldModeServiceImpl);

const main = element("main");
const router = new Router(main, routes, routes[0]!);
ioc.add($Router, router);
provide(document.body, ioc);

document.body.append(new NavBar(), main);
