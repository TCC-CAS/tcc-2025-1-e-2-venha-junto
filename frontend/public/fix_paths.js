const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "html");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

files.forEach((file) => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Replace ./css/, ./js/, ./img/, etc. with ../css/
  content = content.replace(
    /(href|src)=["']\.\/(css|js|img|assets|images)\//g,
    '$1="../$2/',
  );

  // Replace any top-level files like favicon
  content = content.replace(
    /(href|src)=["']\.\/([\w-]+\.(png|ico|json|jpg))["']/g,
    '$1="../$2"',
  );

  fs.writeFileSync(filePath, content);
});

console.log("Fixed paths in", files.length, "files");
