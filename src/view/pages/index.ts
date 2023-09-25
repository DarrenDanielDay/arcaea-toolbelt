import { AddResultRoute } from "./add-result";
import { ConstantToolsRoute } from "./constant-tools";
import { PlayerB30Route } from "./player-b39";
import { ProfileRoute } from "./profile";
import { ChartsRoute } from "./query-charts";
import { Route } from "./router";
import { WorldModeRoute } from "./world-mode";

export const routes: Route[] = [
  ProfileRoute,
  AddResultRoute,
  PlayerB30Route,
  ChartsRoute,
  WorldModeRoute,
  ConstantToolsRoute,
];
