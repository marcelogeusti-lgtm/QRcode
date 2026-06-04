const fs = require('fs');
let content = fs.readFileSync('admin.html', 'utf8');

// Replace inputs and labels with form-control
content = content.replace(/style="width:100%; padding:0.8rem;"/g, 'class="form-control"');
content = content.replace(/style="width:100%; height:45px;"/g, 'class="form-control" style="height: 45px; padding: 0.2rem;"');
content = content.replace(/style="padding:0.8rem;"/g, 'class="form-control"');
content = content.replace(/style="width:100%; padding: 0.8rem; border-radius: 4px; background: rgba\(0,0,0,0.5\); border: 1px solid #444; color: white;"/g, 'class="form-control"');
content = content.replace(/style="width:100%;"/g, 'class="form-control"');

// Replace tab-loja structural blocks
let loja_tab_start = content.indexOf('<div id="tab-loja"');
let loja_tab_end = content.indexOf('<!-- ================= ABA CATÁLOGO ================= -->');
if (loja_tab_end === -1) loja_tab_end = content.indexOf('<!-- ================= ABA CATLOGO ================= -->');
if (loja_tab_end === -1) loja_tab_end = content.indexOf('<!-- ================= ABA'); 

if (loja_tab_start !== -1 && loja_tab_end !== -1) {
    let loja_html = content.substring(loja_tab_start, loja_tab_end);
    
    // Wrap ID do Negocio and Google Review in Section 1
    loja_html = loja_html.replace('<div style="margin-bottom: 1.5rem;">\n                      <label style="display:block; margin-bottom:0.5rem;">ID do Negcio',
    '<div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-info-circle"></i> Informações Básicas</h3>\n                      <div class="form-group">\n                          <label>ID do Negócio');
    
    loja_html = loja_html.replace('</div>\n  \n                  <div class="paywall-container" id="pw-google-review">', 
    '</div>\n                  </div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fab fa-google"></i> Avaliação do Google</h3>\n                  <div class="paywall-container" id="pw-google-review">');
    
    // Wrap Main Grid in Section
    loja_html = loja_html.replace('<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">',
    '</div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-paint-brush"></i> Personalização e Contatos</h3>\n                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">');
    
    // Wrap Custom Links in Section
    loja_html = loja_html.replace('<div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border);">\n                      <h3>Botes / Links Extras</h3>',
    '</div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-link"></i> Botões / Links Extras</h3>');
    
    // Wrap Logo in Section
    loja_html = loja_html.replace('<div style="margin-bottom: 1.5rem;">\n                      <label>Logo do Negcio</label>',
    '</div>\n\n                  <div class="admin-section-card">\n                      <h3 class="admin-section-title"><i class="fas fa-image"></i> Mídia e Logo</h3>\n                      <div class="form-group">\n                          <label>Logo do Negócio</label>');
    
    // Replace drag-zone
    loja_html = loja_html.replace(/drag-zone/g, 'upload-area');
    
    // Fix encoding bugs introduced by the naive reading
    // No need, node handles utf8 fine
    
    content = content.substring(0, loja_tab_start) + loja_html + content.substring(loja_tab_end);
}

// Update other drag-zones
content = content.replace(/drag-zone/g, 'upload-area');
content = content.replace(/<div><label>/g, '<div class="form-group"><label>');
content = content.replace(/class="form-control" placeholder="Ex: https:\/\/g.page\/r\/..."/g, 'class="form-control" placeholder="Ex: https://g.page/r/..."'); // fixing a specific input just in case

fs.writeFileSync('admin.html', content, 'utf8');
console.log("admin.html updated successfully via Node!");
