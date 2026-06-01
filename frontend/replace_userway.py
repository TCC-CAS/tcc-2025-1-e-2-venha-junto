import glob
import os

target_dir = "public/html/*.html"
old_script = '<script src="https://cdn.jsdelivr.net/npm/accessibility/dist/accessibility.min.js"></script><script>window.addEventListener(\'load\', function() { new Accessibility({labels: {menuTitle: "Acessibilidade", increaseText: "Aumentar texto", decreaseText: "Diminuir texto", increaseTextSpacing: "Aumentar espaçamento", decreaseTextSpacing: "Diminuir espaçamento", invertColors: "Inverter Cores", grayHues: "Tons de Cinza", underlineLinks: "Sublinhar Links", bigCursor: "Cursor Grande", readingGuide: "Guia de Leitura", textToSpeech: "Texto para Voz", speechToText: "Voz para Texto"}}); }, false);</script>'

# We will search and replace the exact string from the previous insertion.
# But it has some indentation. Let's just use regex.
import re

new_script = '''<script src="https://cdn.jsdelivr.net/npm/accessibility/dist/accessibility.min.js"></script>
    <script>window.addEventListener('load', function() { 
        new Accessibility({
            icon: {
                position: {
                    bottom: { size: 20, units: 'px' },
                    right: { size: 20, units: 'px' },
                    type: 'fixed'
                },
                dimensions: {
                    width: { size: 55, units: 'px' },
                    height: { size: 55, units: 'px' }
                },
                zIndex: '99999',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                circular: true
            },
            labels: {
                menuTitle: "Acessibilidade",
                increaseText: "Aumentar texto",
                decreaseText: "Diminuir texto",
                increaseTextSpacing: "Aumentar espaçamento",
                decreaseTextSpacing: "Diminuir espaçamento",
                invertColors: "Inverter Cores",
                grayHues: "Tons de Cinza",
                underlineLinks: "Sublinhar Links",
                bigCursor: "Cursor Grande",
                readingGuide: "Guia de Leitura",
                textToSpeech: "Texto para Voz",
                speechToText: "Voz para Texto"
            }
        }); 
    }, false);</script>'''

for filepath in glob.glob(target_dir):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Regex to find the old accessibility script block and replace it
        content = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/accessibility/dist/accessibility\.min\.js"></script>.*?false\);\s*</script>', new_script, content, flags=re.DOTALL)
        
        with open(filepath, 'w', encoding='utf-8', errors='ignore') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error on {filepath}: {e}")
