import re

with open("admin.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. We need to wrap the `.container` in a layout container, and add the sidebar before it.
# The `body` starts around line 21. Let's find `<div class="container">`
container_start = content.find('<div class="container">')

sidebar_html = """
    <!-- Layout Wrapper -->
    <div class="app-layout">
        <!-- Sidebar -->
        <aside class="app-sidebar" id="app-sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <span class="logo-icon">?</span>
                    <span class="logo-text">Painel PRO</span>
                </div>
                <button class="btn-toggle-sidebar" id="btn-toggle-sidebar"><i class="fas fa-bars"></i></button>
            </div>
            
            <nav class="sidebar-nav">
                <button type="button" class="sidebar-btn active" onclick="openTab('tab-loja', this)"><i class="fas fa-store"></i> <span class="nav-text">Loja & Links</span></button>
                <button type="button" class="sidebar-btn" onclick="openTab('tab-catalogo', this)"><i class="fas fa-images"></i> <span class="nav-text">Galeria de Fotos</span></button>
                <button type="button" class="sidebar-btn" onclick="openTab('tab-tv', this)"><i class="fas fa-tv"></i> <span class="nav-text">TV Corporativa</span></button>
                <button type="button" class="sidebar-btn" onclick="openTab('tab-qr', this)"><i class="fas fa-qrcode"></i> <span class="nav-text">QR Code & Display</span></button>
            </nav>
            
            <div class="sidebar-footer">
                <button class="sidebar-btn text-danger" id="btn-cancelar-side"><i class="fas fa-ban"></i> <span class="nav-text">Cancelar Assinatura</span></button>
                <button class="sidebar-btn" id="btn-logout-side"><i class="fas fa-sign-out-alt"></i> <span class="nav-text">Sair da Conta</span></button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="app-main">
"""

# Replace `<div class="container">` with the sidebar and `app-main` wrapper + container
content = content[:container_start] + sidebar_html + '<div class="container">' + content[container_start + len('<div class="container">'):]

# Close the `app-layout` and `app-main` right before the `Upsell Modal` or the end of the body.
# Let's find `<!-- Upsell Modal Shadcn -->`
upsell_start = content.find('<!-- Upsell Modal Shadcn -->')
content = content[:upsell_start] + '        </main>\n    </div>\n\n    ' + content[upsell_start:]

# 2. Remove the old tabs
tabs_pattern = r'<div class="tabs">.*?</div>'
content = re.sub(tabs_pattern, '', content, flags=re.DOTALL)

# 3. Add the new `tab-qr` tab right after `tab-tv` closing div.
# We'll just look for `<button type="submit" class="btn" style="width:100%;` and insert the `tab-qr` before it.
submit_btn_idx = content.find('<button type="submit" class="btn" style="width:100%;')

qr_tab_html = """
            <!-- ================= ABA QR CODE ================= -->
            <div id="tab-qr" class="tab-content">
                <h2 style="margin-bottom: 1rem;">Gerador de Display de Mesa / Balcão</h2>
                <p style="color: var(--muted-foreground); margin-bottom: 1.5rem;">Crie plaquinhas personalizadas com o seu QR Code para atrair avaliações ou facilitar o acesso ao seu catálogo.</p>
                
                <div class="glass-card" style="margin-bottom: 1.5rem; padding: 1.5rem; border: 1px solid var(--border);">
                    <div style="margin-bottom: 1rem;">
                        <label>Formato de Impressão</label>
                        <select id="qrTamanho" style="width:100%; padding:0.8rem; background:rgba(0,0,0,0.5); border:1px solid var(--border); color:white; border-radius:4px;">
                            <option value="5">Plaquinha Pequena (5x5cm no A4)</option>
                            <option value="10">Placa Média (10x10cm no A4)</option>
                            <option value="15">Folha Inteira (15x15cm no A4)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label>Título (Ex: AVALIE-NOS!)</label>
                        <input type="text" id="qrTitulo" value="AVALIE-NOS!" style="width:100%;">
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label>Subtítulo (Ex: Aponte a câmera para acessar)</label>
                        <input type="text" id="qrSubtitulo" value="Aponte a câmera para acessar" style="width:100%;">
                    </div>
                    
                    <button type="button" id="btn-download-qr-new" class="btn" style="width: 100%; padding: 1rem;">
                        <i class="fas fa-print"></i> Baixar Arquivo para Impressão (PDF/PNG)
                    </button>
                </div>
                
                <div class="glass-card" style="padding: 1.5rem; border: 1px solid var(--border);">
                    <h3 style="margin-bottom: 1rem; color: var(--accent-gold);"><i class="fas fa-wifi"></i> Tecnologia NFC</h3>
                    <p style="color: var(--muted-foreground); margin-bottom: 1rem;">Aproxime uma Tag NFC em branco do seu celular para gravar o link do seu negócio nela.</p>
                    <button type="button" id="btn-nfc-new" class="btn btn-outline" style="width: 100%; padding: 1rem;">
                        ?? Gravar Tag NFC
                    </button>
                    <p id="nfc-status-new" style="display:none; font-weight:bold; margin-top: 1rem; color: var(--accent-gold);"></p>
                </div>
            </div>
"""

content = content[:submit_btn_idx] + qr_tab_html + '\n            ' + content[submit_btn_idx:]

# 4. Remove the old `qrcode-container` that was floating
old_qr_container = re.compile(r'<div id="qrcode-container".*?</div>\s*</div>\s*<!-- /admin-main -->', re.DOTALL)
content = old_qr_container.sub('</div>\n        <!-- /admin-main -->', content)

# But wait, `qrcode-container` has a nested `<div id="qrcode"></div>` which we might still need for generation (the invisible one).
# We can just put `<div id="qrcode" style="display:none;"></div>` somewhere.
content = content.replace('<!-- /admin-main -->', '<div id="qrcode" style="display:none;"></div>\n        <!-- /admin-main -->')

# 5. Remove the old `Cancelar` and `Logout` from Top Bar since they are in Sidebar now.
content = re.sub(r'<div>\s*<button class="btn btn-outline" id="btn-cancelar".*?</button>\s*<button class="btn btn-outline" id="btn-logout".*?</button>\s*</div>', '', content, flags=re.DOTALL)

with open("admin.html", "w", encoding="utf-8") as f:
    f.write(content)

