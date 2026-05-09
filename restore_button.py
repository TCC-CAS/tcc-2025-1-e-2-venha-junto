import os

path = r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\html\parceiro-cadastro-estabelecimento.html'

with open(path, 'rb') as f:
    content = f.read()

# Procura o pedaço quebrado do botão (sem a tag <button) e coloca ela de volta
broken_button = b'''Pr\xc3\xb3ximo 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>'''

fixed_button = b'''<button type="button" class="btn-next" data-next="2">
                Pr\xc3\xb3ximo <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>'''

if broken_button in content:
    content = content.replace(broken_button, fixed_button)
    with open(path, 'wb') as f:
        f.write(content)
    print("Botão restaurado com sucesso!")
else:
    print("Trecho quebrado não encontrado. Verificando outras variações...")
    # Tenta sem o \xc3\xb3 se por acaso o encoding mudou
    broken_button_alt = b'''Pr\xf3ximo 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>'''
    if broken_button_alt in content:
        content = content.replace(broken_button_alt, fixed_button)
        with open(path, 'wb') as f:
            f.write(content)
        print("Botão (alt) restaurado com sucesso!")
