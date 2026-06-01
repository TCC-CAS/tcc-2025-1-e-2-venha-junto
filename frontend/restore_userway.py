import glob
import os
import re

target_dir = "public/html/*.html"
userway_script = '<script src="https://cdn.userway.org/widget.js" data-account="iP5lv4PlSk"></script>'

for filepath in glob.glob(target_dir):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Regex to find the accessibility script block we inserted and replace it with UserWay
        content = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/accessibility/dist/accessibility\.min\.js"></script>.*?</script>', userway_script, content, flags=re.DOTALL)
        
        with open(filepath, 'w', encoding='utf-8', errors='ignore') as f:
            f.write(content)
        print(f"Restored UserWay in {filepath}")
    except Exception as e:
        print(f"Error on {filepath}: {e}")
