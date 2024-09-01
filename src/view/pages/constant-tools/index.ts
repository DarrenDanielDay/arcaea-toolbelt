import { ConstantTools } from "../../components/constant-tools";
import type { Route } from "../router";

export const ConstantToolsRoute: Route = {
  path: "/constant-tools",
  title: "计算工具",
  setup() {
    return new ConstantTools();
  },
};
