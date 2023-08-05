import { bootstrap } from "../../styles";
import { Component, HyplateElement, element } from "hyplate";
import { sheet } from "../global-message/style.css.js";
import type { JSXChildNode } from "hyplate/types";

@Component({
  tag: "loading-message",
  styles: [bootstrap, sheet],
})
class Loading extends HyplateElement {
  dialog = element("dialog");
  content: JSXChildNode | null = null;
  override render() {
    return (
      <dialog ref={this.dialog} onCancel={(e) => e.preventDefault()}>
        {this.content}
      </dialog>
    );
  }
}

export const loading = async <T extends unknown>(promise: PromiseLike<T>, message: JSXChildNode): Promise<T> => {
  const loading = new Loading();
  loading.content = message;
  document.body.appendChild(loading);
  loading.dialog.showModal();
  try {
    const result = await promise;
    return result;
  } finally {
    loading.dialog.close();
    document.body.removeChild(loading);
  }
};
