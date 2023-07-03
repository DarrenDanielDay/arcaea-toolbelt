import { sheet } from "./style.css.js";
import { bootstrap } from "../../styles";
import { Component, HyplateElement, Show, element, nil, signal } from "hyplate";

export
@Component({
  tag: "global-message",
  styles: [sheet, bootstrap],
})
class GlobalMessage extends HyplateElement {
  dialog = element("dialog");
  content = signal<JSX.Element>(nil);

  override render() {
    return (
      <dialog ref={this.dialog}>
        <Show when={this.content}>{(node) => node}</Show>
      </dialog>
    );
  }

  showAlert(message: string | Node | JSX.Element) {
    this.content.set(
      <div class="modal-root">
        <div class="modal-content mb-3">{message}</div>
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
  showConfirm(
    message: string | Node | JSX.Element,
    renderFooter?: (done: () => void, cancel: () => void) => JSX.Element | JSX.Element[]
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.content.set(
        <div
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
}

const globalMessage = new GlobalMessage();
const ensureInDocument = () => {
  if (!globalMessage.isConnected) {
    document.body.appendChild(globalMessage);
  }
};
export const confirm = (
  message: string | Node | JSX.Element,
  renderFooter?: (done: () => void, cancel: () => void) => JSX.Element | JSX.Element[]
) => {
  ensureInDocument();
  return globalMessage.showConfirm(message, renderFooter);
};
export const alert = (message: string | Node | JSX.Element) => {
  ensureInDocument();
  return globalMessage.showAlert(message);
};
