import { onClickElsewhere } from "../utils/click-elsewhere";
import { query } from "../utils/component";
import "./shared.css";
import "bootstrap/dist/css/bootstrap.min.css";

export const docsPage = (content: string) => {
  document.body.innerHTML = content;
  const refs = query({
    tocMenu: "aside header",
    tocPanel: "div.toc-wrapper",
    toc: `ul#toc`,
  } as const)(document);
  const { toc, tocMenu, tocPanel } = refs;
  const hideToc = () => {
    toc.classList.toggle("visible", false);
  };
  onClickElsewhere({ cleanups: [] }, tocPanel, () => {
    hideToc();
  });
  tocMenu.onclick = () => {
    toc.classList.toggle("visible");
  };
  toc.querySelectorAll("li > a[href]").forEach((link) => {
    link.onclick = () => {
      hideToc();
    };
  });
};
