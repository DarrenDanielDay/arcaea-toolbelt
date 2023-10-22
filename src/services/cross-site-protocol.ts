import { ProfileUpdatePayload } from "../models/profile";

export interface CrossSiteProtocol {
  "sync-profiles": ProfileUpdatePayload[];
  "sync-me": ProfileUpdatePayload;
}

export type CrossSiteMessageData = {
  [K in keyof CrossSiteProtocol]: { type: K; payload: CrossSiteProtocol[K] };
}[keyof CrossSiteProtocol];
