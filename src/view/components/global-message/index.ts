import html from "bundle-text:./template.html";
import { sheet } from "./style.css.js";
import { Component, OnConnected, clone } from "../../../utils/component";
import { bootstrap } from "../../styles";

export
@Component({
  selector: "global-message",
  css: [sheet, bootstrap],
  html,
})
class GlobalMessage extends HTMLElement implements OnConnected {
  dialog!: HTMLDialogElement;
  alertTemplate!: DocumentFragment;
  confirmTemplate!: DocumentFragment;
  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    this.dialog = shadow.querySelector("dialog")!;
    this.alertTemplate = shadow.querySelector("template#alert")!.content;
    this.confirmTemplate = shadow.querySelector("template#confirm")!.content;
  }

  showAlert(message: string | Node) {
    this.dialog.innerHTML = "";
    const alert = clone(this.alertTemplate);
    const ok = alert.querySelector("button.btn-primary")!;
    const content = alert.querySelector("div.modal-content")!;
    content.append(message);
    ok.onclick = () => {
      this.dialog.close();
    };
    this.dialog.appendChild(alert);
    this.dialog.showModal();
  }

  showConfirm(message: string | Node): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.dialog.innerHTML = "";
      const confirm = clone(this.confirmTemplate);
      const ok = confirm.querySelector("button.btn-primary")!;
      const cancel = confirm.querySelector("button.btn-secondary")!;
      const content = confirm.querySelector("div.modal-content")!;
      content.append(message);
      this.dialog.appendChild(confirm);
      ok.onclick = () => {
        this.dialog.close();
        resolve(true);
      };
      cancel.onclick = () => {
        this.dialog.close();
        resolve(false);
      };
      this.dialog.show();
    });
  }
}

const globalMessage = new GlobalMessage();

export const confirm = (message: string | Node) => {
  document.body.appendChild(globalMessage);
  return globalMessage.showConfirm(message);
};
export const alert = (message: string | Node) => {
  document.body.appendChild(globalMessage);
  return globalMessage.showAlert(message);
};
