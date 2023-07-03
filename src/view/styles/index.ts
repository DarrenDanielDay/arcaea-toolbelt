import { create } from "sheetly";
import { text } from "./bootstrap.part.css.js";

export const bootstrap = create(text.replaceAll(":root", ":host"), "");
