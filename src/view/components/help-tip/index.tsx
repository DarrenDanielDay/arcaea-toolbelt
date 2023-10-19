import help from "../../../assets/help.svg";
import { sheet } from "./style.css.js";
import { sheet as dialogSheet } from "../fancy-dialog/style.css.js";
import { Component, HyplateElement, element } from "hyplate";
import type { GlobalAttributes } from "hyplate/types";
import { bootstrap } from "../../styles";
import { SVGIcon } from "../svg-icon";

export interface HelpTipProps {}

export
@Component({
  tag: "help-tip",
  styles: [bootstrap, sheet, dialogSheet],
})
class HelpTip extends HyplateElement {
  dialog = element("dialog");
  override render() {
    return (
      <div>
        <SVGIcon src={help} onClick={() => this.dialog.showModal()} />
        <dialog ref={this.dialog}>
          <div class="modal-root" part="modal-root">
            <div class="modal-content mb-3">
              <slot></slot>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" onClick={() => this.dialog.close()}>
                了解
              </button>
            </div>
          </div>
        </dialog>
      </div>
    );
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "help-tip": JSXAttributes<HelpTipProps & GlobalAttributes, HelpTip>;
    }
  }
}
