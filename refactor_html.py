import re

with open('admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace inputs and labels with form-control
content = re.sub(r'style="width:100%; padding:0.8rem;"', 'class="form-control"', content)
content = re.sub(r'style="width:100%; height:45px;"', 'class="form-control" style="height: 45px; padding: 0.2rem;"', content)
content = re.sub(r'style="padding:0.8rem;"', 'class="form-control"', content)
content = re.sub(r'style="width:100%; padding: 0.8rem; border-radius: 4px; background: rgba\(0,0,0,0.5\); border: 1px solid #444; color: white;"', 'class="form-control"', content)
content = re.sub(r'style="width:100%;"', 'class="form-control"', content)

# Replace tab-loja structural blocks
loja_tab_start = content.find('<div id="tab-loja"')
loja_tab_end = content.find('<!-- ================= ABA CATÁLOGO ================= -->')
if loja_tab_end == -1: loja_tab_end = content.find('<!-- ================= ABA') # Fallback

if loja_tab_start != -1 and loja_tab_end != -1:
    loja_html = content[loja_tab_start:loja_tab_end]
    
    # Wrap ID do Negocio and Google Review in Section 1
    loja_html = loja_html.replace('<div style="margin-bottom: 1.5rem;">\n                      <label style="display:block; margin-bottom:0.5rem;">ID do Negócio',
    '<div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-info-circle"></i> Informações Básicas</h3>\n                      <div class="form-group">\n                          <label>ID do Negócio (Apenas minúsculas e sem acentos)</label>')
    
    loja_html = loja_html.replace('</div>\n  \n                  <div class="paywall-container" id="pw-google-review">', 
    '</div>\n                  </div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fab fa-google"></i> Avaliação do Google</h3>\n                  <div class="paywall-container" id="pw-google-review">')
    
    # Wrap Main Grid in Section
    loja_html = loja_html.replace('<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">',
    '</div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-paint-brush"></i> Personalização e Contatos</h3>\n                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">')
    
    # Wrap Custom Links in Section
    loja_html = loja_html.replace('<div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border);">\n                      <h3>Botões / Links Extras</h3>',
    '</div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-link"></i> Botões / Links Extras</h3>')
    
    # Wrap Logo in Section
    loja_html = loja_html.replace('<div style="margin-bottom: 1.5rem;">\n                      <label>Logo do Negócio</label>',
    '</div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-image"></i> Mídia e Logo</h3>\n                      <div class="form-group">\n                          <label>Logo do Negócio</label>')
    
    loja_html = loja_html.replace('drag-zone', 'upload-area')
    
    content = content[:loja_tab_start] + loja_html + content[loja_tab_end:]

# Update other drag-zones
content = content.replace('drag-zone', 'upload-area')
content = content.replace('<div><label>', '<div class="form-group"><label>')

# Write back
with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("admin.html updated successfully!")
