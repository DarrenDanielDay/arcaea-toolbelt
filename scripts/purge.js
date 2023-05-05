const { PurgeCSS } = require("purgecss");
const fs = require("fs");
const path = require("path");
(async function () {
  const pathToCwd = "./src/view/styles/bootstrap.part.css";
  const bootstrap = path.resolve(process.cwd(), pathToCwd);
  const purgeCSSResult = await new PurgeCSS().purge({
    content: ["**/*.html", "**/*.ts"],
    css: [pathToCwd],
  });
  fs.writeFile(bootstrap, purgeCSSResult[0].css, () => {
    console.log(`✨Purged.`);
  });
})();
