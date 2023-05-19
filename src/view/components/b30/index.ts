import html from "bundle-text:./template.html";
import { Component, OnConnected } from "../../../utils/component";
import { sheet } from "./style.css.js";
import { Inject } from "../../../services/di";
import { $ProfileService, ProfileService } from "../../../services/declarations";
import { ResultCard } from "../result-card";
import { BestResultItem } from "../../../models/profile";

export
@Component({
  selector: "best-30",
  html,
  css: [sheet],
})
class Best30 extends HTMLElement implements OnConnected {
  @Inject($ProfileService)
  accessor profile!: ProfileService;

  username!: HTMLDivElement;
  details!: HTMLDivElement;
  b10!: HTMLDivElement;
  b20!: HTMLDivElement;
  b30!: HTMLDivElement;
  b33!: HTMLDivElement;
  b36!: HTMLDivElement;
  b39!: HTMLDivElement;
  time!: HTMLTimeElement;

  connectedCallback(): void {
    const shadow = this.shadowRoot!;
    this.username = shadow.querySelector("div.username")!;
    this.details = shadow.querySelector("div.details")!;
    this.b10 = shadow.querySelector("div.best-1-10")!;
    this.b20 = shadow.querySelector("div.best-11-20")!;
    this.b30 = shadow.querySelector("div.best-21-30")!;
    this.b33 = shadow.querySelector("div.best-31-33")!;
    this.b36 = shadow.querySelector("div.best-34-36")!;
    this.b39 = shadow.querySelector("div.best-37-39")!;
    this.time = shadow.querySelector("time")!;
    this.renderB30();
  }

  private async renderB30() {
    const res = await this.profile.b30();
    const { b30, b31_39, b30Average, maxPotential, minPotential, potential, r10Average, username } = res;
    this.username.textContent = `${username} (${potential})`;
    this.details.textContent = `B30Avg=${b30Average.toFixed(4)} R10Avg=${r10Average.toFixed(
      4
    )} Ptt Range [${minPotential.toFixed(4)}, ${maxPotential.toFixed(4)}]`;

    for (const [column, items] of [
      [this.b10, b30.slice(0, 10)],
      [this.b20, b30.slice(10, 20)],
      [this.b30, b30.slice(20, 30)],
      [this.b33, b31_39.slice(0, 3)],
      [this.b36, b31_39.slice(3, 6)],
      [this.b39, b31_39.slice(6, 9)],
    ] as const) {
      for (const item of items) {
        this.renderBest(item, column);
      }
    }
    const now = new Date();
    this.time.dateTime = now.toISOString();
    this.time.textContent = now.toLocaleString();
    this.ondblclick = () => {
      this.requestFullscreen({
        navigationUI: "hide",
      });
    };
  }

  private renderBest(best: BestResultItem, col: HTMLDivElement) {
    const card = new ResultCard();
    col!.appendChild(card);
    card.setChart(best.song, best.chart);
    card.setBest(best.no);
    card.setResult(best.note, best.score, best.clear);
  }
}
