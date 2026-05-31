import os

paths = [
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\html',
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\frontend\public\js',
    r'c:\Users\bruna\OneDrive\Desktop\VenhaJunto\backend\main.py'
]

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    # Case-sensitive exact replacements first
    new_content = new_content.replace('Pro Plus', 'Premium')
    new_content = new_content.replace('PRO PLUS', 'PREMIUM')
    new_content = new_content.replace('pro_plus', 'premium')
    new_content = new_content.replace('pro-plus', 'premium')
    new_content = new_content.replace('pro plus', 'premium')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')

for p in paths:
    if os.path.isfile(p):
        replace_in_file(p)
    else:
        for root, dirs, files in os.walk(p):
            for file in files:
                if file.endswith('.html') or file.endswith('.js'):
                    replace_in_file(os.path.join(root, file))
