import icon from "../../../favicon.ico";
import { sheet } from "./style.css.js";
import { Component, HyplateElement } from "hyplate";
import { bootstrapLocal } from "../../styles";

export
@Component({
  tag: "plugin-button",
  styles: [bootstrapLocal, sheet],
})
class PluginButton extends HyplateElement {
  override render() {
    return (
      <div role="button" onClick={(e) => this.onclick?.(e)}>
        <img src={icon}></img>
      </div>
    );
  }
}
