const fs = require("fs");
const src = fs.readFileSync("lib/catalog.js", "utf8").replace(
  'const { usdToPi } = require("./pricing");',
  `function usdToPi(usd) {
  const PI_USD_VALUE = 314159;
  const cents = Math.round(Number(usd) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.round((cents * 1e7) / (PI_USD_VALUE * 100)) / 1e7;
}`
);
const body = src.replace(/module\.exports = \{[\s\S]*$/, "");
fs.writeFileSync(
  "public/js/catalog-browser.js",
  `(function () {\n${body}\nwindow.ShCatalog = { searchFlights, searchHotels };\n})();\n`
);
