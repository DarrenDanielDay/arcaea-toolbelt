import { Attribute, AutoRender, Component, HyplateElement } from "hyplate";
import type { GlobalAttributes, Signal } from "hyplate/types";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $AssetsResolver, $AssetsService, AssetsResolver, AssetsService } from "../../../services/declarations";
import { syncProps } from "../../../utils/component";
import { AssetImage } from "../asset-image";

export interface PotentialBadgeProps {
  potential?: number;
}

export
@Component({
  tag: "potential-badge",
  styles: [sheet],
})
class PotentialBadge extends HyplateElement<PotentialBadgeProps> {
  @Attribute("potential", Number)
  accessor potential!: Signal<number | undefined | null>;
  @Inject($AssetsResolver)
  accessor resolver!: AssetsResolver;
  @Inject($AssetsService)
  accessor assets!: AssetsService;

  override render() {
    syncProps(this);
    return (
      <AutoRender>
        {() => {
          const potential = this.potential();
          const rating = this.#getPotentialRating(potential);
          return (
            <>
              <AssetImage noLoading src={this.assets.getAssets(this.resolver.resolvePotentialBadge(rating))}></AssetImage>
              <div class="potential">
                {potential == null || potential < 0 ? (
                  <span class="off">-</span>
                ) : (
                  [
                    <span class="decimal">{Math.floor(potential)}</span>,
                    <span class="fixed">
                      .{`${Math.floor(potential * 100 - Math.floor(potential) * 100)}`.padStart(2, "0")}
                    </span>,
                  ]
                )}
              </div>
            </>
          );
        }}
      </AutoRender>
    );
  }

  #getPotentialRating(potential: number | undefined | null): number {
    if (potential == null || potential < 0) {
      return -1;
    }
    return [3.5, 7.0, 10.0, 11.0, 12.0, 12.5, 13.0, Infinity].findIndex((bound) => potential < bound);
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "potential-badge": JSXAttributes<PotentialBadgeProps & GlobalAttributes, PotentialBadge>;
    }
  }
}
