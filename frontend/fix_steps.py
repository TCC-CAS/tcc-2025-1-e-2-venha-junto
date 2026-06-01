import re

html_path = "public/html/parceiro-cadastro-estabelecimento.html"
js_path = "public/js/parceiro-cadastro-estabelecimento.js"

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update Sidebar Nav
html = re.sub(r'<button class="step-link active" data-target="1" type="button">[\s\S]*?<div class="step-icon">1</div>[\s\S]*?<div class="step-text">[\s\S]*?<strong>Responsável</strong>[\s\S]*?<span>Seus dados</span>[\s\S]*?</div>[\s\S]*?</button>\s*<button class="step-link" data-target="2" type="button" disabled>\s*<div class="step-icon">2</div>\s*<div class="step-text">\s*<strong>Estabelecimento</strong>',
'<button class="step-link active" data-target="1" type="button">\n            <div class="step-icon">1</div>\n            <div class="step-text">\n              <strong>Estabelecimento</strong>', html)
html = html.replace('data-target="3"', 'data-target="2"')
html = html.replace('data-target="4"', 'data-target="3"')
html = html.replace('<div class="step-icon">3</div>', '<div class="step-icon">2</div>')
html = html.replace('<div class="step-icon">4</div>', '<div class="step-icon">3</div>')

# 2. Update Step Header
html = html.replace('<h1 id="currentStepTitle">Responsável</h1>', '<h1 id="currentStepTitle">Estabelecimento</h1>')
html = html.replace('Conte-nos sobre o responsável pelo estabelecimento', 'Informações detalhadas do local')
html = html.replace('style="width: 25%"', 'style="width: 33.33%"')

# 3. Remove Passo 1
html = re.sub(r'<!-- =======================\s*PASSO 1: RESPONSÁVEL\s*======================= -->\s*<section class="form-panel active" data-step="1">[\s\S]*?<!-- =======================\s*PASSO 2: ESTABELECIMENTO\s*======================= -->\s*<section class="form-panel" data-step="2">',
'<!-- =======================\n             PASSO 1: ESTABELECIMENTO\n             ======================= -->\n          <section class="form-panel active" data-step="1">', html)

# 4. Update data-steps
html = html.replace('data-step="3"', 'data-step="2"')
html = html.replace('data-step="4"', 'data-step="3"')
html = html.replace('data-step="5"', 'data-step="4"')
html = html.replace('PASSO 3:', 'PASSO 2:')
html = html.replace('PASSO 4:', 'PASSO 3:')
html = html.replace('PASSO 5:', 'PASSO 4:')

# 5. Update data-prev and data-next
# Panel 1 (was 2)
html = html.replace('<button type="button" class="btn-prev" data-prev="1">\n                ⬅ Voltar\n              </button>', '<div></div>')
html = html.replace('data-next="3"', 'data-next="2"')

# Panel 2 (was 3)
html = html.replace('data-prev="2"', 'data-prev="1"')
html = html.replace('data-next="4"', 'data-next="3"')

# Panel 3 (was 4)
html = html.replace('data-prev="3"', 'data-prev="2"')
html = html.replace('data-next="5"', 'data-next="4"')


with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)


with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Update stepInfo
js = re.sub(r'1: {[\s\S]*?},', '', js, count=1)
js = js.replace('2: { title: "Estabelecimento", desc: "Informações detalhadas do local" }', '1: { title: "Estabelecimento", desc: "Informações detalhadas do local" }')
js = js.replace('3: {', '2: {')
js = js.replace('4: { title: "Plano"', '3: { title: "Plano"')
js = js.replace('5: { title: "Concluído"', '4: { title: "Concluído"')

# 2. Update limits and calculations
js = js.replace('stepNumber > 5', 'stepNumber > 4')
js = js.replace('stepNumber / 4', 'stepNumber / 3')
js = js.replace('Math.min(stepNumber, 4)', 'Math.min(stepNumber, 3)')
js = js.replace('stepNumber === 5', 'stepNumber === 4')
js = js.replace('goToStep(5)', 'goToStep(4)')

# 3. Update map triggers and custom selects
js = re.sub(r'stepNumber === 2', 'stepNumber === 1', js)
js = re.sub(r'stepNumber === 4', 'stepNumber === 3', js)
js = re.sub(r'step === 2', 'step === 1', js)

# 4. Remove inputs from payload in apiPartnerCreatePlace
js = re.sub(r'\s*nome_responsavel: document.getElementById\("nomeResponsavel"\).value,', '', js)
js = re.sub(r'\s*email_responsavel: document.getElementById\("emailResponsavel"\).value,', '', js)
js = re.sub(r'\s*telefone_responsavel: document.getElementById\("telefoneResponsavel"\).value,', '', js)

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js)
