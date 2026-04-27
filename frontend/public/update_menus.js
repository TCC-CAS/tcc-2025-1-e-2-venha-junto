const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "html");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

const newMenu = `<nav class="menu" aria-label="Menu público">
          <a href="./explorar.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6v16l7-4.06L15 22l8-4.06V2L15 6.06 8 2 1 6z"/><path d="M8 2v16"/><path d="M15 6v16"/></svg>
            Explorar
          </a>
          <a href="./favoritos.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Favoritos
          </a>
          <a href="./parceiro.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Sou Parceiro
          </a>
        </nav>`;

files.forEach((file) => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Replace the old nav menu
  content = content.replace(/<nav class="menu"[\s\S]*?<\/nav>/, newMenu);

  // Set aria-current if applicable
  if (file === "explorar.html") {
    content = content.replace(
      /<a href="\.\/explorar\.html">/,
      '<a href="./explorar.html" aria-current="page">',
    );
  } else if (file === "favoritos.html") {
    content = content.replace(
      /<a href="\.\/favoritos\.html">/,
      '<a href="./favoritos.html" aria-current="page">',
    );
  }

  fs.writeFileSync(filePath, content);
});

console.log("Fixed menus in", files.length, "files");
