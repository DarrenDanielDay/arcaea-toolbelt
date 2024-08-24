import { sheet } from "./style.css.js";
import { Component, HyplateElement, computed } from "hyplate";
import { bootstrap } from "../../styles";
import { Mountable, Signal } from "hyplate/types";
import { Inject } from "../../../services/di.js";
import { $PreferenceService, PreferenceService } from "../../../services/declarations.js";

const activeBadgeColor = "#E7E2F6";
const inactiveBadgeColor = "#211938";
const bg = "#2F2352";
const activeTextColor = "#6B4CC3";
const inactiveTextColor = "#42366c";
const buttonWidth = 80;
const gap = 8;
const optionWidth = buttonWidth + gap;
const boostRatios = [1, 1.2, 1.25, 1.3];
export
@Component({
  tag: "world-boost-select",
  styles: [bootstrap, sheet],
})
class WorldBoostSelect extends HyplateElement {
  @Inject($PreferenceService)
  accessor preference!: PreferenceService;

  override render(): Mountable<any> {
    const width = 20 + boostRatios.length * optionWidth;
    const selectedBoost = this.preference.signal("aolWorldBoost");
    return (
      <svg viewBox={`0 0 ${width} 48`} width={`${width}`} height="48">
        <filter id="active-shadow">
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
        </filter>
        <rect width={`${width}`} height="48" fill={bg}></rect>
        {boostRatios.map((ratio, index) => {
          return this.renderOption(
            ratio,
            index,
            computed(() => selectedBoost() === ratio)
          );
        })}
      </svg>
    );
  }

  private renderOption(ratio: number, index: number, active: Signal<boolean>) {
    const percent = `${Math.round((ratio - 1) * 100)}%`;
    const x = (value: number) => value + index * 88 - 60;
    return (
      <g
        style:cursor="pointer"
        on:click={() => {
          this.preference.update({ aolWorldBoost: ratio });
        }}
      >
        <polygon
          points={`${x(60)},0 ${x(140)},0 ${x(164)},30 ${x(152)},48 ${x(72)},48 ${x(84)},30`}
          fill={computed(() => (active() ? activeBadgeColor : inactiveBadgeColor))}
          filter={computed(() => (active() ? "url(#active-shadow)" : ""))}
        ></polygon>
        <text
          x={`${x(103)}`}
          y="33"
          font-size="18"
          font-weight="700"
          fill={computed(() => (active() ? activeTextColor : inactiveTextColor))}
        >
          {percent}
        </text>
      </g>
    );
  }
}
