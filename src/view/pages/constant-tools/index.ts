import { ConstantTools } from "../../components/constant-tools";
import type { Route } from "../router";

export const ConstantToolsRoute: Route = {
  path: "/constant-tools",
  title: "定数测算",
  setup() {
    return new ConstantTools();
  },
};
