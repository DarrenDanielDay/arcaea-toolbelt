import { ColorTheme } from "../services/declarations";

export const getUserTheme = (): ColorTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
