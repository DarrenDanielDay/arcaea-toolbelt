import { PurgeCSS } from "purgecss";
import { writeFile } from "fs";
import { resolve } from "path";
(async function () {
  const pathToCwd = "./src/view/styles/bootstrap.part.css";
  const bootstrap = resolve(process.cwd(), pathToCwd);
  const purgeCSSResult = await new PurgeCSS().purge({
    content: ["**/*.html", "**/*.ts", "**/*.tsx"],
    css: [pathToCwd],
  });
  writeFile(bootstrap, purgeCSSResult[0].css, () => {
    console.log(`✨Purged.`);
  });
})();
