import { ProfilePage } from "../../components/profile";
import { Route } from "../router";

export const ProfileRoute: Route = {
  path: "/profile",
  title: "存档",
  setup() {
    return new ProfilePage();
  },
};
