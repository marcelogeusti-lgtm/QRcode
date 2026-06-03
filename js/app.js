import { db, doc, getDoc, updateDoc, increment } from './firebase-config.js';

async function carregarDados() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = urlParams.get('id');

    if (!barberId) {
        window.location.href = "login.html";
        return;
    }

    try {
        const docRef = doc(db, "barbearias", barberId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();

            if (config.plan === 'SUSPENDED') {
                mostrarErro("Sistema temporariamente indisponível. O estabelecimento precisa regularizar o sistema.");
                return;
            }

            aplicarConfiguracoes(config);

            // [MÉTRICA] Registra +1 visualização na página (de forma assíncrona para não travar)
            updateDoc(docRef, { metrics_views: increment(1) }).catch(e => console.error("Erro metricas views:", e));

            // [MÉTRICA] Espiões de cliques (Google e Sociais)
            setupMetricListeners(docRef);

        } else {
            mostrarErro(`A página "${barberId}" não foi encontrada. O dono precisa salvar as configurações no Painel primeiro.`);
        }
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        mostrarErro("Erro ao conectar com o servidor. O dono do negócio precisa liberar o Banco de Dados (Firestore) no painel do Google.");
    }
}

function mostrarErro(mensagem) {
    document.body.innerHTML = `
        <div style='text-align:center; margin-top:20vh; padding: 20px;'>
            <h1 style='color:white; font-size:2rem; font-weight:800; margin-bottom:1rem;'>Ops!</h1>
            <p style='color:#ff4444; font-size:1.2rem;'>${mensagem}</p>
        </div>`;
}

function aplicarConfiguracoes(config) {
    // Cores
    if(config.corPrincipal) {
        document.documentElement.style.setProperty('--accent-gold', config.corPrincipal);
        document.documentElement.style.setProperty('--accent-gold-hover', config.corPrincipal);
    }
    
    // Textos e Logo
    document.getElementById('wl-nome').innerText = config.nome || "Meu Negócio";
    if(config.logoUrl) document.getElementById('wl-logo').src = config.logoUrl;
    document.title = config.nome || "App Digital";

    if (config.tituloCatalogo) {
        document.getElementById('wl-titulo-catalogo').innerText = config.tituloCatalogo;
    }

    // Links Sociais
    document.getElementById('wl-instagram').href = config.instagramUrl || "#";
    document.getElementById('wl-whatsapp').href = config.whatsappUrl || "#";

    // Copiar
    document.getElementById('wl-wifi').innerText = config.wifiPassword || "Sem Senha";
    document.getElementById('wl-pix').innerText = config.pixKey || "Não Cadastrado";

    // Google Reviews
    const reviewBtn = document.getElementById('wl-google-review');
    if(config.googleReviewUrl) {
        reviewBtn.style.display = 'flex';
        reviewBtn.href = config.googleReviewUrl;
    } else {
        reviewBtn.style.display = 'none';
    }

    // Catálogo Dinâmico
    const catalogoContainer = document.getElementById('wl-catalogo');
    const catalogoCard = document.getElementById('wl-catalogo-card');
    catalogoContainer.innerHTML = ''; 
    
    if (config.catalogo && config.catalogo.length > 0) {
        catalogoCard.style.display = 'flex';
        config.catalogo.forEach(itemUrl => {
            // Em caso de compatibilidade com objeto antigo, extrai a url
            if (typeof itemUrl === 'object') itemUrl = itemUrl.url;
            
            const div = document.createElement('div');
            div.className = 'catalog-item';
            
            if (itemUrl.includes('.pdf')) {
                const uniqueId = 'pdf-canvas-' + Math.random().toString(36).substr(2, 9);
                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:rgba(255,255,255,0.05); border-radius:8px; border: 1px solid var(--border); overflow: hidden; position: relative; min-height: 200px;">
                        <canvas id="${uniqueId}" style="width: 100%; height: 100%; object-fit: cover;"></canvas>
                        <div style="position: absolute; bottom: 0; left: 0; width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.8); text-align:center;">
                            <a href="${itemUrl}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center; font-size: 0.9rem; padding: 0.5rem;">Abrir PDF</a>
                        </div>
                    </div>
                `;
                
                // Assincronamente renderiza o PDF (com fallback para icone caso falhe o CORS)
                if (typeof window.pdfjsLib !== 'undefined') {
                    // Usa um proxy CORS gratuito para evitar bloqueios do Firebase Storage no Canvas
                    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(itemUrl);
                    window.pdfjsLib.getDocument(proxyUrl).promise.then(pdf => {
                        return pdf.getPage(1);
                    }).then(page => {
                        const canvas = document.getElementById(uniqueId);
                        if(!canvas) return;
                        const ctx = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1.0 });
                        const scale = 300 / viewport.width;
                        const scaledViewport = page.getViewport({ scale: scale });
                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;
                        page.render({ canvasContext: ctx, viewport: scaledViewport });
                    }).catch(err => {
                        console.error("Erro PDF:", err);
                        const canvas = document.getElementById(uniqueId);
                        if(canvas) canvas.outerHTML = '<i class="fas fa-file-pdf" style="font-size:3rem; color:var(--accent-gold); margin: 3rem auto;"></i>';
                    });
                }
            } else {
                div.innerHTML = `<img src="${itemUrl}" alt="Foto da Galeria">`;
            }
            
            catalogoContainer.appendChild(div);
        });
    } else {
         catalogoCard.style.display = 'none';
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

// ================= LÓGICA DE MÉTRICAS =================
function setupMetricListeners(docRef) {
    const googleBtn = document.getElementById('wl-google-review');
    const instaBtn = document.getElementById('wl-instagram');
    const zapBtn = document.getElementById('wl-whatsapp');

    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            updateDoc(docRef, { metrics_google: increment(1) }).catch(()=>{});
        });
    }

    if (instaBtn) {
        instaBtn.addEventListener('click', () => {
            updateDoc(docRef, { metrics_social: increment(1) }).catch(()=>{});
        });
    }

    if (zapBtn) {
        zapBtn.addEventListener('click', () => {
            updateDoc(docRef, { metrics_social: increment(1) }).catch(()=>{});
        });
    }
}
