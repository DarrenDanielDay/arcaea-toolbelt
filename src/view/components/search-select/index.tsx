import { clickElsewhere } from "../../../utils/click-elsewhere";
import { Component, HyplateElement, computed, element, mount, signal, unmount } from "hyplate";
import type { Rendered } from "hyplate/types";
import { sheet } from "./style.css.js";

@Component({
  tag: "search-select",
  styles: [sheet],
  formAssociated: true,
})
export class SearchSelect<T> extends HyplateElement {
  panel = element("div");
  searchInput = element("input");
  selectedItem = signal<T | null>(null);
  lastRendered: Rendered<any> | null = null;

  panelVisible = signal(false);

  constructor(
    public renderItem: (this: SearchSelect<T>, item: T) => JSX.Element,
    public searchItems: (this: SearchSelect<T>, text: string) => T[] | Promise<T[]>,
    public getItemValue: (this: SearchSelect<T>, item: T) => string
  ) {
    super();
  }

  override render() {
    this.effect(() => {
      let count = 0;
      const onInput = async () => {
        count++;
        const current = count;
        const result = await this.searchItems(this.searchInput.value);
        if (count === current) {
          this.renderSearchResults(result);
        }
      };
      const onFocus = () => {
        this.searchInput.select();
      };
      const onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === "arrowdown") {
          this.panel.querySelector("div[tabindex]")?.focus();
        }
        if (key === "escape" && this.panelVisible()) {
          e.preventDefault();
          this.togglePanelVisible(false);
        }
      };
      const rendered = mount(
        <input
          ref={this.searchInput}
          type="text"
          class="form-control"
          autocomplete="off"
          onInput={onInput}
          onFocus={onFocus}
          onKeydown={onKeyDown}
        />,
        this
      );
      this.togglePanelVisible(false);
      return () => {
        unmount(rendered);
      };
    });
    this.effect(() =>
      clickElsewhere(this.panel, () => {
        this.togglePanelVisible(false);
      })
    );
    return (
      <>
        <slot></slot>
        <div
          ref={this.panel}
          class="search-panel"
          style:display={computed(() => (this.panelVisible() ? "block" : "none"))}
        ></div>
      </>
    );
  }

  private togglePanelVisible(visible: boolean) {
    this.panelVisible.set(visible);
  }

  private renderSearchResults(results: T[]) {
    this.togglePanelVisible(true);
    if (this.lastRendered) unmount(this.lastRendered);
    const items = results.map((result) => ({ el: element("div"), result }));
    this.lastRendered = mount(
      <>
        {items.map(({ el, result }, i) => {
          const handleSelect = () => {
            this.selectItem(result);
            this.togglePanelVisible(false);
          };
          const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === "enter") {
              handleSelect();
            }
            if (key === "arrowdown") {
              items[(i + 1) % items.length]?.el.focus();
            }
            if (key === "arrowup") {
              items[(i - 1 + items.length) % items.length]?.el.focus();
            }
            if (key === "escape") {
              e.preventDefault();
              this.togglePanelVisible(false);
              this.searchInput?.focus();
            }
          };
          return (
            <div ref={el} class="search-item" tabindex={0} onClick={handleSelect} onKeydown={handleKeyDown}>
              {this.renderItem(result)}
            </div>
          );
        })}
      </>,
      this.panel
    );
  }

  private selectItem(item: T) {
    if (this.searchInput) {
      this.selectedItem.set(item);
      const formValue = this.getItemValue(item);
      this.searchInput.value = formValue;
      this.internals!.setFormValue(formValue);
      this.searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}
