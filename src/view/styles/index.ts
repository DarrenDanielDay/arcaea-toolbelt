import { create } from "sheetly";
import { text } from "./bootstrap.part.css.js";
export { sheet as title } from "./title.css.js";
export { sheet as theme } from "./theme.css.js";
export { sheet as bootstrap } from "./bootstrap.part.css.js";
export { sheet as table } from "./table.css.js";
export { sheet as viewTransition } from "./view-transition.css.js";

export const bootstrapLocal = create(text.replaceAll(":root", ":host"), "");
