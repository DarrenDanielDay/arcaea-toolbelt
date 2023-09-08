import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { Chart, Song } from "../../../models/music-play";
import { element, mount } from "hyplate";
import type { FC } from "hyplate/types";
import { addSheet } from "sheetly";
import { ChartService } from "../../../services/declarations.js";

export const ChartInfo: FC<{ song: Song; chart: Chart; chartService: ChartService }> = ({
  chart,
  song,
  chartService,
}) => {
  const container = element("div");
  const shadow = container.attachShadow({ mode: "open" });
  addSheet([bootstrap, sheet], shadow);
  mount(
    <>
      <div class="cover-container">
        <img class="cover" src={chartService.getCover(chart, song)} />
      </div>
      <div class="row my-3">
        <div class="col">
          <div>
            名称：<span class="name">{chartService.getName(chart, song)}</span>
          </div>
          <div>
            等级：
            <span class="level">
              {chart.difficulty} {chart.level}
            </span>
          </div>
          <div>
            定数：<span class="constant">{chart.constant.toFixed(1)}</span>
          </div>
          <div>
            曲包：<span class="pack">{song.pack}</span>
          </div>
          <div>
            bpm：<span class="bpm">{song.bpm}</span>
          </div>
          <div>
            note数：<span class="notes">{chart.note}</span>
          </div>
        </div>
      </div>
    </>,
    shadow
  );
  return <div ref={container} var:difficulty={`var(--${chart.difficulty})`}></div>;
};
