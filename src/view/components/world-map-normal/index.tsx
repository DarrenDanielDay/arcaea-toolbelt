import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { CurrentProgress, MapPlatform, NormalWorldMap, PlatformType, RewardType } from "../../../models/world-mode";
import { alert } from "../fancy-dialog";
import { Component, For, HyplateElement, computed, element, nil, signal } from "hyplate";
import type { CleanUpFunc, WritableSignal } from "hyplate/types";
import { Inject } from "../../../services/di";
import { $AssetsResolver, $Gateway, AssetsResolver, Gateway } from "../../../services/declarations";

const specialPlatformImages: Record<
  PlatformType,
  {
    banner: string;
    main: string;
  }
> = {
  [PlatformType.FixedSpeed]: {
    banner: "img/step_banner_speedrestrict.png",
    main: "img/1080/step_tile_speedrestrict.png",
  },
  [PlatformType.Random]: {
    banner: "img/step_banner_random.png",
    main: "img/1080/step_tile_random.png",
  },
  [PlatformType.Restriction]: {
    banner: "img/step_banner_restrict.png",
    main: "img/1080/step_tile_restrict.png",
  },
  [PlatformType.Stamina]: {
    banner: "img/step_banner_plusstamina.png",
    main: "img/1080/step_tile_plusstamina.png",
  },
};

const defaultPlatformImage = "img/1080/step_tile.png";
const currentPlatformImage = "img/1080/step_tile_current.png";

interface PlatformContext {
  cell: HTMLDivElement;
  platform: MapPlatform;
  level: number;
  highlighted: WritableSignal<boolean>;
}

export
@Component({
  tag: "world-map-normal",
  styles: [bootstrap, sheet],
})
class WorldMapNormal extends HyplateElement {
  @Inject($AssetsResolver)
  accessor resolver!: AssetsResolver;
  @Inject($Gateway)
  accessor gateway!: Gateway;
  platformsContainer = element("div");

  bg = signal("");
  bgY = signal("");
  currentMap = signal<NormalWorldMap | null>(null);
  platforms = signal<PlatformContext[]>([]);
  currentProgress = signal<CurrentProgress | null>(null);
  #cleanupHighlight: CleanUpFunc | null = null;
  override render() {
    return (
      <div class="panel-root">
        <div class="bg" style:background-image={this.bg} style:background-position-y={this.bgY}></div>
        <div
          ref={this.platformsContainer}
          class="platforms"
          onScroll={() => {
            requestAnimationFrame(() => {
              const { scrollTop, scrollHeight, clientHeight } = this.platformsContainer;
              this.bgY.set(`${(scrollTop / (scrollHeight - clientHeight)) * 100}%`);
            });
          }}
        >
          <For of={this.platforms}>
            {({ cell, highlighted, level, platform }) => {
              const offset = 5 - Math.abs(((level - 1) % 10) - 5);
              cell.style.left = `${((offset * 100) / 6).toFixed(6)}%`;
              const { special, length, reward } = platform;
              return (
                <div class="level">
                  <div
                    ref={cell}
                    class="cell"
                    data-level={level}
                    class:highlighted={highlighted}
                    onClick={(e) => {
                      this.dispatchEvent(new CustomEvent("click-cell", { detail: level }));
                    }}
                  >
                    <img
                      class="platform-img"
                      src={computed(() => {
                        const currentProgress = this.currentProgress();
                        if (currentProgress?.level === level) {
                          return this.assets(currentPlatformImage);
                        }
                        return this.assets(special ? specialPlatformImages[special.type]!.main : defaultPlatformImage);
                      })}
                    />
                    <span class="length">
                      {computed(() => {
                        const currentProgress = this.currentProgress();
                        if (currentProgress?.level === level) {
                          return `${currentProgress.progress.toFixed(1)}/${length}`;
                        }
                        return length;
                      })}
                    </span>
                    {special ? (
                      <img
                        class="banner"
                        src={this.assets(specialPlatformImages[special.type].banner)}
                        onClick={(e) => {
                          e.stopPropagation();
                          const { type } = special;
                          const renderRange = (range: string | string[], message: string) => (
                            <>
                              {message}：<br />
                              {(typeof range === "string" ? [range] : range).map((song) => (
                                <>
                                  {song}
                                  <br />
                                </>
                              ))}
                            </>
                          );
                          switch (special.type) {
                            case PlatformType.FixedSpeed:
                              alert(`限速 ≤ ${special.max}`);
                              break;
                            case PlatformType.Random:
                              alert(renderRange(special.range, "随机范围"));
                              break;
                            case PlatformType.Restriction:
                              alert(renderRange(special.range, "限制范围"));
                              break;
                            case PlatformType.Stamina:
                              break;
                            default:
                              throw new Error(`未知台阶类型： ${type}`);
                          }
                        }}
                      ></img>
                    ) : (
                      nil
                    )}
                    {special?.type === PlatformType.Stamina ? <span class="stamina-count">+{special.count}</span> : nil}
                    {(() => {
                      if (!reward) {
                        return nil;
                      }
                      switch (reward.type) {
                        case RewardType.Character:
                        case RewardType.Background:
                        case RewardType.Song:
                          return <img class="reward" referrerpolicy="no-referrer" src={reward.img}></img>;
                        case RewardType.Item: {
                          if (reward.name === "残片") {
                            return (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="fragment">
                                  <rect
                                    x="4"
                                    y="4"
                                    width="16"
                                    height="16"
                                    transform="rotate(45 12 12)"
                                    fill="#164864"
                                  ></rect>
                                  <rect
                                    x="6"
                                    y="6"
                                    rx="1"
                                    ry="1"
                                    width="12"
                                    height="12"
                                    transform="rotate(45 12 12)"
                                    fill="#0e2840"
                                    filter="blur(1px)"
                                  ></rect>
                                </svg>
                                <span class="fragment-count">{reward.count}</span>
                                <span class="fragment-banner">{reward.name}</span>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <img src={reward.img} referrerpolicy="no-referrer" class="reward item"></img>
                                <span class="item-info text-banner">
                                  {reward.name} × {reward.count}
                                </span>
                              </>
                            );
                          }
                        }
                      }
                    })()}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    );
  }

  setMap(map: NormalWorldMap) {
    this.currentMap.set(map);
    const platforms = map.platforms;
    const platformsContext = Object.keys(platforms)
      .sort((a, b) => +b - +a)
      .reduce<PlatformContext[]>((result, key) => {
        const platform = platforms[+key];
        if (!platform) {
          return result;
        }
        const level = +key;
        result.push({
          cell: element("div"),
          level,
          highlighted: signal(false),
          platform,
        });
        return result;
      }, []);
    this.platforms.set(platformsContext);
    const chapter = +map.id[0]! || 0;
    this.bg.set(`url(${JSON.stringify(this.assets(`img/world/1080/${chapter}.jpg`))})`);
    this.platformsContainer.lastElementChild!.scrollIntoView({ behavior: "smooth" });
  }

  setCurrentPlatform(current: CurrentProgress | null) {
    this.currentProgress.set(current);
  }

  focusLevel(level: number) {
    const targetRef = this.findPlatform(level);
    if (targetRef) {
      targetRef.cell.scrollIntoView({ behavior: "smooth" });
      this.highlightLevel(level);
    }
  }

  highlightLevel(level: number) {
    const targetRef = this.findPlatform(level);
    if (targetRef) {
      this.#cleanupHighlight?.();
      this.#cleanupHighlight = () => {
        this.#cleanupHighlight = null;
        targetRef.highlighted.set(false);
        cancelAnimationFrame(animationFrame);
        clearTimeout(timer);
      };
      const timer = setTimeout(this.#cleanupHighlight, 3000);
      const animationFrame = requestAnimationFrame(() => {
        targetRef.highlighted.set(true);
      });
    }
  }

  private findPlatform(level: number) {
    const platforms = this.platforms();
    return platforms[platforms.length - level];
  }

  private assets(path: string) {
    return this.gateway.direct(this.resolver.resolve(path)).href;
  }
}
