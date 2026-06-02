import { db, doc, getDoc } from './firebase-config.js';

async function carregarDados() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = urlParams.get('id');

    if (!barberId) {
        mostrarErro("Nenhuma barbearia selecionada. O link precisa ter ?id=nome-da-barbearia");
        return;
    }

    try {
        const docRef = doc(db, "barbearias", barberId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            aplicarConfiguracoes(config);
        } else {
            mostrarErro(`A barbearia "${barberId}" não foi encontrada. O dono precisa salvar as configurações no Painel primeiro.`);
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        mostrarErro("Erro ao conectar com o servidor. O dono da barbearia precisa liberar o Banco de Dados (Firestore) no painel do Google.");
    }
}

function mostrarErro(mensagem) {
    document.body.innerHTML = `
        <div style='text-align:center; margin-top:20vh; padding: 20px;'>
            <h1 style='color:white; font-size:2rem; font-weight:800; margin-bottom:1rem;'>Ops!</h1>
            <p style='color:#ff4444; font-size:1.2rem;'>${mensagem}</p>
            <a href="admin.html" class="btn" style="width:fit-content; margin: 2rem auto; display:block;">Ir para Painel Administrativo</a>
        </div>`;
}

function aplicarConfiguracoes(config) {
    // Cores
    if(config.corPrincipal) {
        document.documentElement.style.setProperty('--accent-gold', config.corPrincipal);
        document.documentElement.style.setProperty('--accent-gold-hover', config.corPrincipal);
    }
    
    // Textos e Logo
    document.getElementById('wl-nome').innerText = config.nome || "Barbearia";
    if(config.logoUrl) document.getElementById('wl-logo').src = config.logoUrl;
    document.title = config.nome || "App Barbearia";

    // Links Sociais
    document.getElementById('wl-instagram').href = config.instagramUrl || "#";
    document.getElementById('wl-whatsapp').href = config.whatsappUrl || "#";

    // Copiar
    document.getElementById('wl-wifi').innerText = config.wifiPassword || "Sem Senha";
    document.getElementById('wl-pix').innerText = config.pixKey || "Não Cadastrado";

    // Catálogo Dinâmico
    const catalogoContainer = document.getElementById('wl-catalogo');
    catalogoContainer.innerHTML = ''; 
    
    if (config.catalogo && config.catalogo.length > 0) {
        config.catalogo.forEach(item => {
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
    } else {
         catalogoContainer.innerHTML = '<p style="color:gray; text-align:center; width:100%;">Nenhum corte cadastrado.</p>';
    }
}

// Funções de copiar
window.copyToClipboard = function(elementId, successMessage) {
    const textToCopy = document.getElementById(elementId).innerText;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            window.showToast(successMessage);
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
    textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus(); textArea.select();
    try { document.execCommand('copy'); window.showToast(successMessage); } catch (err) {}
    document.body.removeChild(textArea);
}

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

document.addEventListener('DOMContentLoaded', carregarDados);
