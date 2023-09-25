import { create } from "sheetly";
import { text } from "./bootstrap.part.css.js";
export { sheet as title } from "./title.css.js";

export const bootstrap = create(text.replaceAll(":root", ":host"), "");
