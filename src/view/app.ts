import app from "bundle-text:./app.html";
import { sheet } from "./app.css.js";
import { PlayResultForm } from "./components/play-result-form";
import { ProfilePage } from "./components/profile";
import { Best30 } from "./components/b30";
import { sheet as bootstrap } from "./styles/bootstrap.part.css.js";
import { provide } from "../services/di";
import { $ChartService, $MusicPlayService, $ProfileService } from "../services/declarations";
import { ChartServiceImpl } from "../services/chart-data";
import { MusicPlayServiceImpl } from "../services/music-play";
import { ProfileServiceImpl } from "../services/player-profile";
import { check } from "../utils/component";
import { ChartSelect } from "./components/chart-select";
import { ResultCard } from "./components/result-card";
document.adoptedStyleSheets = [bootstrap, sheet];

const chart = new ChartServiceImpl();
provide($ChartService, document.body, chart);
const music = new MusicPlayServiceImpl();
provide($MusicPlayService, document.body, music);
const profile = new ProfileServiceImpl(music, chart);
provide($ProfileService, document.body, profile);

check([Best30, ChartSelect, PlayResultForm, ProfilePage, ResultCard]);

document.body.innerHTML = app;
const toggler = document.querySelector("button.navbar-toggler")!;
const collapsePanel = document.querySelector("div.collapse")!;
const main = document.querySelector("main")!;
const profileLink = document.querySelector("a#profile")!;
const b30Link = document.querySelector("a#b30")!;
const addResultLink = document.querySelector("a#add-result")!;
const show = "show";
toggler.onclick = () => {
  if (collapsePanel.classList.contains(show)) {
    collapsePanel.classList.remove(show);
  } else {
    collapsePanel.classList.add(show);
  }
};

const pages: {
  link: HTMLElement;
  setup(): void;
}[] = [
  {
    link: profileLink,
    setup() {
      main.appendChild(new ProfilePage());
    },
  },
  {
    link: addResultLink,
    setup() {
      const form = new PlayResultForm();
      main.appendChild(form);
      const row = document.createElement("div");
      row.classList.add("row", "my-2");
      row.innerHTML = `<div class="col m-3"><button type="button" class="btn btn-primary">添加成绩</button></div>`;
      const add = row.querySelector("button")!;
      add.onclick = () => {
        const res = form.getPlayResult();
        if (res) {
          profile.addResult(res);
          form.chartSelect.searchInput.focus();
        }
      };
      main.appendChild(row);
    },
  },
  {
    link: b30Link,
    setup() {
      const b30Card = new Best30();
      const width = window.innerWidth;
      if (width < 800) {
        document.body.style.setProperty("--inner-width", `${width}`);
      }
      main.appendChild(b30Card);
    },
  },
];

for (const page of pages) {
  page.link.onclick = () => {
    collapsePanel.classList.remove(show);
    for (const others of pages) {
      if (others === page) {
        others.link.classList.add("active");
      } else {
        others.link.classList.remove("active");
      }
    }
    main.innerHTML = "";
    page.setup();
  };
}
window.addEventListener("message", (e) => {
  const data = e.data;
  if (Array.isArray(data)) {
    profile.syncProfiles(data);
  }
});

profileLink.click();
