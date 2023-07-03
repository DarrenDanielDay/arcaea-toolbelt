import { sheet } from "./app.css.js";
import { bootstrap } from "./styles";
import { provide } from "../services/di";
import { $ChartService, $MusicPlayService, $ProfileService, $WorldModeService } from "../services/declarations";
import { ChartServiceImpl } from "../services/chart-data";
import { MusicPlayServiceImpl } from "../services/music-play";
import { ProfileServiceImpl } from "../services/player-profile";
import { $Router, Router } from "./pages/router";
import { routes } from "./pages";
import { NavBar } from "./components/nav-bar";
import { WorldModeServiceImpl } from "../services/world-mode";
import { element } from "hyplate";
document.adoptedStyleSheets = [bootstrap, sheet];

const chart = new ChartServiceImpl();
provide($ChartService, document.body, chart);
const music = new MusicPlayServiceImpl();
provide($MusicPlayService, document.body, music);
const profile = new ProfileServiceImpl(music, chart);
provide($ProfileService, document.body, profile);
const worldMode = new WorldModeServiceImpl(chart, music);
provide($WorldModeService, document.body, worldMode);
const main = element("main");
const router = new Router(main, routes, routes[0]!);
provide($Router, document.body, router);

document.body.append(new NavBar(), main);
