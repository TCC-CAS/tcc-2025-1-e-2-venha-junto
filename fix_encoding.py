import os

def fix_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'rb') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old.encode('utf-8', errors='ignore'), new.encode('utf-8'))
        # Também tenta variações comuns de encoding quebrado
        content = content.replace(old.encode('latin-1', errors='ignore'), new.encode('utf-8'))

    with open(path, 'wb') as f:
        f.write(content)

repls = [
    ('Ã rea', 'Área'),
    ('â¬…', '←'),
    ('âž”', '➜'),
    ('ðŸ’¡', '💡'),
    ('âœ…', '✅'),
    ('âœ“', '✔'),
    ('ðŸ†”', '🪪'),
    ('ðŸ‘¤', '👤'),
    ('RESPONSÃ VEL', 'RESPONSÁVEL'),
    ('Próximo âž”', 'Próximo ➜'),
    ('â¬… Voltar', '← Voltar'),
    ('Ã REA PRINCIPAL', 'ÁREA PRINCIPAL'),
    ('âœ… Recursos', '✅ Recursos'),
]

files = [
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\html\parceiro-cadastro-estabelecimento.html',
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\js\parceiro-cadastro-estabelecimento.js',
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\html\index.html',
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\html\explorar.html'
]

for f in files:
    fix_file(f, repls)
    print(f"File {f} fixed.")
