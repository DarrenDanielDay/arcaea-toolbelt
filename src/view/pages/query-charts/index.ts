import { ChartQuery } from "../../components/chart-query";
import { Route } from "../router";

export const ChartsRoute: Route = {
  path: "/query-charts",
  title: `定数查谱`,
  setup() {
    return new ChartQuery();
  },
};
