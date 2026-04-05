const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "html");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

const newUserActions = `<!-- ✅ Ações de Usuário (Dinâmico) -->
      <div id="userActions" class="user-actions">
        <a href="./usuario-login.html" class="btn-top-login">Entrar</a>
        <a href="./usuario-criar-conta.html" class="btn-top-signup">Cadastrar</a>
      </div>`;

files.forEach((file) => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Regex to remove the old #userBox entirely
  const oldBoxPattern = /<!-- ✅ USERBOX[\s\S]*?(?=<\/aside>)/;

  // also handle other possible comments for userbox
  const oldBoxPattern2 = /<!-- ✅ USERBOX CORRETO[\s\S]*?(?=<\/aside>)/;
  const oldBoxPattern3 = /<!-- ✅ USERBOX PADRÃO[\s\S]*?(?=<\/aside>)/;

  if (content.match(oldBoxPattern)) {
    content = content.replace(oldBoxPattern, newUserActions + "\n    ");
  } else if (content.match(oldBoxPattern2)) {
    content = content.replace(oldBoxPattern2, newUserActions + "\n    ");
  } else if (content.match(oldBoxPattern3)) {
    content = content.replace(oldBoxPattern3, newUserActions + "\n    ");
  } else {
    // maybe it does not have the comment, find by id="userBox"
    const fallbackBox = /<div id="userBox"[\s\S]*?(?=<\/aside>)/;
    if (content.match(fallbackBox)) {
      content = content.replace(fallbackBox, newUserActions + "\n    ");
    }
  }

  fs.writeFileSync(filePath, content);
});

console.log("Fixed userActions in HTML files");
