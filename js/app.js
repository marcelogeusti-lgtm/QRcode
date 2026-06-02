import { db, doc, getDoc } from './firebase-config.js';

async function carregarDados() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = urlParams.get('id');

    if (!barberId) {
        document.body.innerHTML = `
            <div style='text-align:center; margin-top:20vh;'>
                <h1 style='color:white; font-size:3rem; font-weight:800;'>SaaS Barbearia</h1>
                <p style='color:gray; margin-top: 1rem; font-size:1.2rem;'>Bem-vindo à plataforma. Acesse a página do estabelecimento usando o QR Code.</p>
                <a href="admin.html" class="btn" style="width:fit-content; margin: 2rem auto;">Acessar Painel do Dono</a>
            </div>`;
        return;
    }

    try {
        const docRef = doc(db, "barbearias", barberId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            aplicarConfiguracoes(config);
        } else {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Barbearia não encontrada no banco de dados!</h1>";
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Erro ao conectar com o banco de dados. Verifique as permissões do Firebase.</h1>";
    }
}

function aplicarConfiguracoes(config) {
    // Aplica as cores no CSS
    document.documentElement.style.setProperty('--accent-gold', config.corPrincipal);
    document.documentElement.style.setProperty('--accent-gold-hover', config.corPrincipal);
    
    // Preenche textos
    document.getElementById('wl-nome').innerText = config.nome;
    document.getElementById('wl-slogan').innerText = config.slogan || "ESTILO & TRADIÇÃO";
    document.getElementById('wl-logo').src = "assets/logo.png"; // Padrão V1
    document.title = config.nome;

    document.getElementById('wl-instagram').href = config.instagramUrl || "#";
    document.getElementById('wl-whatsapp').href = config.whatsappUrl || "#";

    document.getElementById('wl-wifi').innerText = config.wifiPassword || "Sem Senha";
    document.getElementById('wl-pix').innerText = config.pixKey || "Não Cadastrado";

    // Catálogo Fixo
    const catalogoContainer = document.getElementById('wl-catalogo');
    catalogoContainer.innerHTML = ''; 
    const cortes = [
        { nome: "Degradê / Fade", imagem: "assets/fade.png" },
        { nome: "Social", imagem: "assets/fade.png" },
        { nome: "Barba Premium", imagem: "assets/fade.png" }
    ];
    cortes.forEach(item => {
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

// Funções globais atachadas ao window para o HTML conseguir chamar o onclick
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
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        window.showToast(successMessage);
    } catch (err) {}
    document.body.removeChild(textArea);
}

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

document.addEventListener('DOMContentLoaded', carregarDados);
