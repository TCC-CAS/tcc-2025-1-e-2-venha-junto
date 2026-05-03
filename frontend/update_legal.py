import re
import os

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Read the shell template from perfil.html
perfil = read_file('public/html/perfil.html')

# Extract everything before <main and everything after </main>
pre_main = perfil[:perfil.find('<main ')]
post_main = perfil[perfil.find('</main>') + 7:]

# Clean up the shell template title
pre_main = re.sub(r'<title>.*?</title>', '<title>Venha Junto • {title}</title>', pre_main)

# Add legal.css to the head
pre_main = pre_main.replace('</head>', '    <link rel="stylesheet" href="../css/legal.css" />\n</head>')

# Ensure active state in sidebar is cleared
pre_main = pre_main.replace('class="active"', '')

termos = read_file('public/html/termos.html')
termos_main = re.search(r'<main.*?>(.*?)</main>', termos, re.DOTALL).group(1)

privacidade = read_file('public/html/privacidade.html')
priv_main = re.search(r'<section class="card".*?>(.*?)</section>', privacidade, re.DOTALL).group(1)

new_termos = pre_main.replace('{title}', 'Termos de Uso') + '\n<main id="conteudo" class="main-content legal-content" role="main">\n  <div class="legal-card">\n' + termos_main + '\n  </div>\n</main>\n' + post_main

new_privacidade = pre_main.replace('{title}', 'Política de Privacidade') + '\n<main id="conteudo" class="main-content legal-content" role="main">\n  <div class="legal-card">\n' + priv_main + '\n  </div>\n</main>\n' + post_main

# Remove userbox.js and perfil.js from post_main if present, add standard ones
for new_file, name in [(new_termos, 'termos.html'), (new_privacidade, 'privacidade.html')]:
    new_file = new_file.replace('<script src="../js/perfil.js" defer></script>', '')
    write_file('public/html/' + name, new_file)

css = '''
.legal-content {
  padding: 24px;
}
.legal-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 32px 40px;
  max-width: 900px;
  margin: 0 auto;
}
.legal-card h1 {
  font-size: 32px;
  font-weight: 900;
  margin-bottom: 8px;
  color: var(--text);
  margin-top: 0;
}
.legal-card h2 {
  font-size: 20px;
  font-weight: 800;
  margin: 32px 0 16px;
  color: var(--text);
}
.legal-card p, .legal-card li {
  color: var(--muted);
  font-weight: 600;
  line-height: 1.7;
  margin-bottom: 16px;
  font-size: 15px;
}
.legal-card .meta, .legal-card .updated {
  color: var(--primary);
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 32px;
}
.legal-card .notice, .legal-card .callout {
  border: 1px solid rgba(37, 99, 235, 0.2);
  background: rgba(37, 99, 235, 0.05);
  border-radius: 12px;
  padding: 16px 20px;
  margin: 24px 0;
  color: #1e3a8a;
  font-weight: 700;
  line-height: 1.6;
}
.legal-card ul {
  padding-left: 20px;
  margin-bottom: 24px;
}
.legal-card .table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}
.legal-card .table th, .legal-card .table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  font-weight: 600;
  font-size: 14px;
}
.legal-card .table th {
  background: #f8fafc;
  color: var(--text);
  font-weight: 800;
}
.legal-card .divider {
  height: 1px;
  background: var(--line);
  margin: 32px 0;
}
.legal-card strong {
  color: var(--text);
  font-weight: 800;
}
@media (max-width: 768px) {
  .legal-content {
    padding: 16px;
  }
  .legal-card {
    padding: 24px 20px;
  }
  .legal-card h1 {
    font-size: 26px;
  }
}
'''
write_file('public/css/legal.css', css)
print('Success!')
