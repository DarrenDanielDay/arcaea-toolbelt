import { WorldModeCalculator } from "../../components/world-map-calculator";
import { Route } from "../router";

export const WorldModeRoute: Route = {
  path: "/world-mode",
  title: "世界模式",
  setup() {
    return new WorldModeCalculator();
  },
};
