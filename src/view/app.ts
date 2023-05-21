import { sheet } from "./app.css.js";
import { PlayResultForm } from "./components/play-result-form";
import { ProfilePage } from "./components/profile";
import { Best30 } from "./components/b30";
import { bootstrap } from "./styles";
import { provide } from "../services/di";
import { $ChartService, $MusicPlayService, $ProfileService } from "../services/declarations";
import { ChartServiceImpl } from "../services/chart-data";
import { MusicPlayServiceImpl } from "../services/music-play";
import { ProfileServiceImpl } from "../services/player-profile";
import { check, element } from "../utils/component";
import { ChartSelect } from "./components/chart-select";
import { ResultCard } from "./components/result-card";
import { $Router, Router } from "./pages/router";
import { routes } from "./pages";
import { NavBar } from "./components/nav-bar";
document.adoptedStyleSheets = [bootstrap, sheet];

const chart = new ChartServiceImpl();
provide($ChartService, document.body, chart);
const music = new MusicPlayServiceImpl();
provide($MusicPlayService, document.body, music);
const profile = new ProfileServiceImpl(music, chart);
provide($ProfileService, document.body, profile);
const main = element("main");
const router = new Router(main, routes, routes[0]!);
provide($Router, document.body, router);

check([Best30, ChartSelect, PlayResultForm, ProfilePage, ResultCard, NavBar]);
document.body.append(new NavBar(), main);

