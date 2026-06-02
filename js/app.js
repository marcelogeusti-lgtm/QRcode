// Função para carregar as configurações do White Label
function initWhiteLabel() {
    if (typeof siteConfig === 'undefined') {
        console.error("Configuração (siteConfig) não encontrada!");
        return;
    }

    // Aplica as cores no CSS
    document.documentElement.style.setProperty('--accent-gold', siteConfig.colors.primary);
    document.documentElement.style.setProperty('--accent-gold-hover', siteConfig.colors.primaryHover);
    document.documentElement.style.setProperty('--bg-dark', siteConfig.colors.background);

    // Preenche os textos e links
    document.getElementById('wl-nome').innerText = siteConfig.nome;
    document.getElementById('wl-slogan').innerText = siteConfig.slogan;
    document.getElementById('wl-logo').src = siteConfig.logoPath;
    document.title = siteConfig.nome;

    document.getElementById('wl-instagram').href = siteConfig.instagramUrl;
    document.getElementById('wl-whatsapp').href = siteConfig.whatsappUrl;

    document.getElementById('wl-wifi').innerText = siteConfig.wifiPassword;
    document.getElementById('wl-pix').innerText = siteConfig.pixKey;

    // Constrói o catálogo dinamicamente
    const catalogoContainer = document.getElementById('wl-catalogo');
    catalogoContainer.innerHTML = ''; // Limpa antes de preencher

    siteConfig.catalogo.forEach(item => {
        const div = document.createElement('div');
        div.className = 'catalog-item';
        div.innerHTML = `
            <img src="${item.imagem}" alt="${item.nome}">
            <div class="catalog-info">
                <p>${item.nome}</p>
            </div>
        `;
        catalogoContainer.appendChild(div);
    });
}

// Inicializa quando a página carregar
document.addEventListener('DOMContentLoaded', initWhiteLabel);

// ============================================
// Funções de Cópia
// ============================================

function copyToClipboard(elementId, successMessage) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast(successMessage);
        }).catch(err => {
            fallbackCopy(textToCopy, successMessage);
        });
    } else {
        fallbackCopy(textToCopy, successMessage);
    }
}

function fallbackCopy(text, successMessage) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showToast(successMessage);
    } catch (err) {}
    document.body.removeChild(textArea);
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
