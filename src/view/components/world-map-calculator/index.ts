import html from "bundle-text:./template.html";
import { sheet } from "./style.css.js";
import { Component, OnConnected, query, textContent } from "../../../utils/component";
import { bootstrap } from "../../styles";
import { WorldMapSelect } from "../world-map-select";
import { WorldMapNormal } from "../world-map-normal";
import { getFormData } from "../../../utils/form";
import { Inject } from "../../../services/di";
import { $WorldModeService, WorldModeService } from "../../../services/declarations";
import { alert } from "../global-message";

export
@Component({
  selector: "world-mode-calculator",
  html,
  css: [bootstrap, sheet],
})
class WorldModeCalculator extends HTMLElement implements OnConnected {
  @Inject($WorldModeService)
  accessor worldMode!: WorldModeService;

  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    const refs = query({
      jumpForm: `form#jump-platform`,
      calcForm: `form#calc-progress`,
      jump: `button[name="jump"]`,
      focus: `button[name="focus"]`,
      calc: `button[name="calc"]`,
      caclRes: `span.calc-result`,
    } as const)(shadow);
    const { jumpForm, calcForm, jump, focus, calc } = refs;
    const select = new WorldMapSelect();
    const worldMap = new WorldMapNormal();
    select.onSelect = (map) => {
      worldMap.setMap(map);
    };
    shadow.insertBefore(worldMap, jumpForm);
    shadow.insertBefore(select, worldMap);
    jump.onclick = () => {
      if (!jumpForm.reportValidity()) {
        return;
      }
      const { complete, progress } = getFormData<{ complete: string; progress: string }>(jumpForm);
      worldMap.setCurrentPlatform({ level: +complete + 1, progress: +progress });
    };
    focus.onclick = () => {
      if (!jumpForm.reportValidity()) {
        return;
      }
      const { complete } = getFormData<{ complete: string; progress: string }>(jumpForm);
      worldMap.focusLevel(+complete + 1);
    };
    calcForm.addEventListener("change", () => {
      if (!calcForm.reportValidity()) {
        return;
      }
      const {
        fragment,
        potential,
        step,
        "memory-x4": x4,
      } = getFormData<{ step: string; potential: string; fragment: string; "memory-x4"?: string }>(calcForm);
      try {
        const result = this.worldMode.computeProgress(+step, +potential, +fragment, x4 === "on");
        textContent(refs, { caclRes: `进度 ${result}` });
      } catch (error) {
        if (error instanceof Error) {
          alert(error.message);
        }
      }
    });
  }
}
