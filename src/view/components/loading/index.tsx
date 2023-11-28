import { bootstrap } from "../../styles";
import { Component, HyplateElement, element } from "hyplate";
import { sheet } from "../fancy-dialog/style.css.js";
import type { JSXChildNode } from "hyplate/types";
import { FancyDialog, alert } from "../fancy-dialog";
import { formatError } from "../../../utils/format";

@Component({
  tag: "loading-message",
  styles: [bootstrap, sheet],
})
class Loading extends HyplateElement {
  dialog = element("dialog");
  content: JSXChildNode | null = null;
  error = new FancyDialog();
  override render() {
    return (
      <>
        {this.error}
        <dialog ref={this.dialog} onCancel={(e) => e.preventDefault()}>
          {this.content}
        </dialog>
      </>
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
  } catch (error) {
    await loading.error.showAlert(<p>出现错误：{formatError(error)}</p>);
    throw error;
  } finally {
    loading.dialog.close();
    document.body.removeChild(loading);
  }
};
