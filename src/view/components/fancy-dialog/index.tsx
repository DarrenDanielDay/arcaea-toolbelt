import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { Component, HyplateElement, Show, element, listen, mount, nil, signal, unmount } from "hyplate";
import type { GlobalAttributes, JSXChildNode, Rendered } from "hyplate/types";

type RenderedSlot = Rendered<any> | null;
type RenderWithClose = (done: () => void, cancel: () => void) => JSXChildNode;
type RenderWithAction<T> = (done: (result: T) => void, cancel: () => void) => JSXChildNode;

export
@Component({
  tag: "fancy-dialog",
  styles: [sheet, bootstrap],
})
class FancyDialog extends HyplateElement {
  dialog = element("dialog");
  content = signal<JSX.Element>(nil);
  #renderedSlot: RenderedSlot = null;
  override render() {
    this.effect(() =>
      listen(this.dialog)("close", () => {
        this.content.set(nil);
        this.#unmountSlots();
      })
    );
    return (
      <dialog ref={this.dialog}>
        <Show when={this.content}>{(node) => node}</Show>
      </dialog>
    );
  }

  showAlert(message: JSXChildNode, useSlot?: boolean) {
    if (useSlot) {
      this.#renderedSlot = mount(<>{message}</>, this);
    }
    this.content.set(
      <div class="modal-root" part="modal-root">
        <div class="modal-content mb-3">{useSlot ? <slot name="content"></slot> : message}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onClick={() => this.dialog.close()}>
            确认
          </button>
        </div>
      </div>
    );
    this.dialog.showModal();
  }

  done = () => this.dialog.close("confirm");
  cancel = () => this.dialog.close("cancel");
  showConfirm(message: JSXChildNode, renderFooter?: RenderWithClose): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.content.set(
        <div
          part="modal-root"
          class="modal-root"
          onSubmit={(e) => {
            e.preventDefault();
            this.done();
          }}
        >
          <div class="modal-content mb-3">{message}</div>
          <div class="modal-footer">
            {(
              renderFooter ??
              ((done, cancel) => [
                <button type="button" class="btn btn-primary" onClick={done}>
                  确认
                </button>,
                <button type="button" class="btn btn-secondary" onClick={cancel}>
                  取消
                </button>,
              ])
            )(this.done, this.cancel)}
          </div>
        </div>
      );
      this.dialog.onclose = () => {
        switch (this.dialog.returnValue) {
          case "confirm":
            resolve(true);
            break;
          default:
            resolve(false);
            break;
        }
      };
      this.dialog.showModal();
    });
  }

  showPicker<T>(renderContents: RenderWithAction<T>) {
    return new Promise<T | null>((resolve) => {
      this.#renderedSlot = mount(
        <>
          {renderContents(
            (value) => {
              resolve(value);
              this.done();
            },
            () => {
              resolve(null);
              this.cancel();
            }
          )}
        </>,
        this
      );
      this.content.set(
        <div
          part="modal-root"
          class="modal-root"
          onSubmit={(e) => {
            e.preventDefault();
            this.done();
          }}
        >
          <div class="modal-content mb-3">
            <slot name="content"></slot>
          </div>
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      );
      this.dialog.onclose = this.dialog.oncancel = () => resolve(null);
      this.dialog.showModal();
    });
  }

  #unmountSlots() {
    const unmountIf = (content: RenderedSlot) => content && unmount(content);
    unmountIf(this.#renderedSlot);
    this.#renderedSlot = null;
    this.innerHTML = "";
  }
}

const globalMessage = new FancyDialog();
const ensureInDocument = () => {
  if (!globalMessage.isConnected) {
    document.body.appendChild(globalMessage);
  }
};
export const confirm = (
  message: JSXChildNode,
  renderFooter?: (done: () => void, cancel: () => void) => JSX.Element | JSX.Element[]
) => {
  ensureInDocument();
  return globalMessage.showConfirm(message, renderFooter);
};
export const alert = (message: JSXChildNode) => {
  ensureInDocument();
  return globalMessage.showAlert(message);
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "fancy-dialog": JSXAttributes<GlobalAttributes, FancyDialog>;
    }
  }
}