import { db, doc, setDoc, storage, ref, uploadBytes, getDownloadURL, auth, onAuthStateChanged, signOut, getDoc, collection, query, where, getDocs } from './firebase-config.js';

let currentUser = null;
window.localCatalog = [];
window.localTvAds = [];
window.xtreamM3uUrl = null;

// Proteção da Rota
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        currentUser = user;
        // Se o usuário logou, puxa os dados dele do banco de dados e preenche o painel
        await carregarDadosDoUsuario(user.uid);
    }
});

// Busca se a pessoa já tem barbearia cadastrada
async function carregarDadosDoUsuario(uid) {
    try {
        const q = query(collection(db, "barbearias"), where("ownerUid", "==", uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            const data = docData.data();
            const barberId = docData.id;
            
            // Preenche os campos de texto
            document.getElementById('barberId').value = barberId;
            document.getElementById('barberId').readOnly = true; // Impede que ele mude o ID depois que criar
            document.getElementById('barberId').style.opacity = '0.7';

            // Preenche as Métricas
            document.getElementById('met-views').innerText = data.metrics_views || 0;
            document.getElementById('met-google').innerText = data.metrics_google || 0;
            document.getElementById('met-social').innerText = data.metrics_social || 0;
            
            // Logo Preview
            if (data.logoUrl) {
                const previewLogo = document.getElementById('preview-logo');
                const prevLogoPhone = document.getElementById('prev-logo');
                if (previewLogo) {
                    previewLogo.src = data.logoUrl;
                    previewLogo.style.display = 'block';
                }
                if (prevLogoPhone) {
                    prevLogoPhone.src = data.logoUrl;
                }
            }

            // Background Preview
            if (data.backgroundUrl) {
                const isVideo = data.backgroundType === 'video';
                document.getElementById('preview-bg-video').style.display = isVideo ? 'block' : 'none';
                document.getElementById('preview-bg-img').style.display = isVideo ? 'none' : 'block';
                if (isVideo) {
                    document.getElementById('preview-bg-video').src = data.backgroundUrl;
                } else {
                    document.getElementById('preview-bg-img').src = data.backgroundUrl;
                }
            }

            if(data.nome) document.getElementById('nome').value = data.nome;
            if(data.slogan) document.getElementById('slogan').value = data.slogan;
            if(data.tituloCatalogo) document.getElementById('tituloCatalogo').value = data.tituloCatalogo;
            if(data.corPrincipal) document.getElementById('cor').value = data.corPrincipal;
            if(data.instagramUrl) document.getElementById('instagram').value = data.instagramUrl;
            if(data.whatsappUrl) document.getElementById('whatsapp').value = data.whatsappUrl;
            if(data.pixKey) document.getElementById('pix').value = data.pixKey;
            if(data.wifiPassword) document.getElementById('wifi').value = data.wifiPassword;
            if(data.googleReviewUrl) document.getElementById('googleReviewUrl').value = data.googleReviewUrl;
            if(data.tvVideo) document.getElementById('tvVideo').value = data.tvVideo;
            if(data.tvTempoAnuncio) document.getElementById('tvTempoAnuncio').value = data.tvTempoAnuncio;
            if(data.tvLayout) document.getElementById('tvLayout').value = data.tvLayout;
            
            if(data.tipoConexao) {
                document.getElementById('tipoConexao').value = data.tipoConexao;
                if(typeof toggleConexaoFields === 'function') toggleConexaoFields();
            }
            if(data.xtreamDns) document.getElementById('xtreamDns').value = data.xtreamDns;
            if(data.xtreamUser) document.getElementById('xtreamUser').value = data.xtreamUser;
            if(data.xtreamPass) document.getElementById('xtreamPass').value = data.xtreamPass;
            if(data.xtreamM3uUrl) {
                window.xtreamM3uUrl = data.xtreamM3uUrl;
                const status = document.getElementById('m3u-upload-status');
                if(status) status.innerText = "✅ Um arquivo M3U já está salvo na nuvem e será usado.";
            }
            
            // Dispara evento manual para atualizar o Preview inicial
            document.getElementById('nome').dispatchEvent(new Event('input'));
            document.getElementById('slogan').dispatchEvent(new Event('input'));
            document.getElementById('tituloCatalogo').dispatchEvent(new Event('input'));
            document.getElementById('cor').dispatchEvent(new Event('input'));
            document.getElementById('googleReviewUrl').dispatchEvent(new Event('input'));
            
            // Mostra texto de que tem foto salva
            if(data.logoUrl) document.querySelector('#drop-logo p').innerText = "✅ Logo atual salva no sistema. Envie outra para substituir.";
            
            // TV Ads
            if(data.tvAds && data.tvAds.length > 0) {
                window.localTvAds = data.tvAds.map(item => {
                    return { file: null, url: item };
                });
                renderTvAdmin();
            }
            
            // Catálogo (Tratando dados antigos vs novos)
            if(data.catalogo && data.catalogo.length > 0) {
                window.localCatalog = data.catalogo.map(item => {
                    if (typeof item === 'string') return { nome: "Sem Nome", preco: "", url: item };
                    return item;
                });
                renderCatalogAdmin();
            }
            
            // Já mostra o QR code e link sem precisar apertar salvar de novo
            gerarQRCode(barberId);

            // 🔴 VERIFICAÇÃO DE SUSPENSÃO
            if (data.plan === 'SUSPENDED') {
                document.getElementById('suspended-overlay').style.display = 'flex';
                // Impede clique em qualquer outra coisa
                return;
            }

            // 🟡 Libera as funções PRO se for assinante PRO
            const isPro = data.plan === 'PRO' || barberId === 'guimaraes' || barberId === 'marcelo' || barberId === 'negocio';
            const badge = document.getElementById('badge-plan');

            if (isPro) {
                document.querySelectorAll('.paywall-overlay').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.paywall-container > *').forEach(el => {
                    el.style.filter = 'none';
                    el.style.pointerEvents = 'auto';
                });
                
                if(badge) {
                    badge.innerText = 'Plano: PRO';
                    badge.style.background = 'rgba(202, 255, 0, 0.2)';
                    badge.style.color = '#caff00';
                    badge.style.boxShadow = '0 0 10px rgba(202, 255, 0, 0.2)';
                }
            } else {
                // É Básico (com cadeados)
                if(badge) {
                    badge.innerText = 'Plano: BÁSICO';
                    badge.style.background = 'rgba(255,255,255,0.1)';
                    badge.style.color = '#ccc';
                    badge.style.boxShadow = 'none';
                }
            }
        }
    } catch(e) {
        console.error("Erro ao carregar dados antigos:", e);
    }
}

document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
});

// Botão de Cancelar Assinatura (Auto-Suspensão)
const btnCancelar = document.getElementById('btn-cancelar');
if (btnCancelar) {
    btnCancelar.addEventListener('click', async () => {
        const barberId = document.getElementById('barberId').value.trim();
        if (!barberId) return;

        const confirmacao = confirm("CUIDADO: Tem certeza que deseja cancelar sua assinatura? Você perderá acesso ao painel e a TV da sua loja parará de funcionar imediatamente.");
        
        if (confirmacao) {
            try {
                const docRef = doc(db, "barbearias", barberId);
                await updateDoc(docRef, { plan: 'SUSPENDED' });
                alert("Assinatura cancelada com sucesso.");
                // Força o recarregamento da página para engatilhar a Tela da Morte
                window.location.reload();
            } catch(e) {
                console.error("Erro ao cancelar:", e);
                alert("Erro ao tentar cancelar a assinatura.");
            }
        }
    });
}

// Força minúsculas e remove acentos no ID
document.getElementById('barberId').addEventListener('input', function(e) {
    let val = this.value.toLowerCase();
    val = val.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
    val = val.replace(/[^a-z0-9-]/g, ""); // Remove tudo que não for letra, numero ou hifen
    this.value = val;
});

// Configuração Visual do Drag and Drop
function setupDropZone(zoneId, inputId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const text = zone.querySelector('p');

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            text.innerText = `${input.files.length} arquivo(s) selecionado(s)`;
            text.style.color = "#d4af37";
        }
    });
    input.addEventListener('change', () => {
        if(input.files.length > 0) {
            text.innerText = `${input.files.length} arquivo(s) selecionado(s)`;
            text.style.color = "#d4af37";
        }
    });
}
setupDropZone('drop-logo', 'logoFile');
setupDropZone('drop-bg', 'bgFile');
setupDropZone('drop-novo-item', 'novoItemFile');
setupDropZone('drop-novo-tv-ad', 'novoTvAdFile');

// Lógica de Upload Imediato do M3U (Plano B)
document.getElementById('m3uUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('m3u-upload-status');
    statusEl.style.color = "var(--accent-gold)";
    statusEl.innerText = "⏳ Fazendo upload do arquivo M3U para a nuvem. Aguarde...";

    try {
        const barberId = document.getElementById('barberId').value.trim();
        if (!barberId) throw new Error("ID da barbearia não encontrado. Salve a barbearia antes de enviar a lista.");

        // Upload do M3U
        const fileRef = ref(storage, `barbearias/${barberId}/playlist.m3u`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        window.xtreamM3uUrl = url;
        statusEl.style.color = "#4caf50";
        statusEl.innerText = "✅ Lista M3U salva com sucesso! Agora clique em 'Salvar Configurações' lá embaixo.";
    } catch (error) {
        statusEl.style.color = "#f44336";
        statusEl.innerText = "❌ Erro ao enviar a lista: " + error.message;
    }
});

// Lógica de Renderização do Catálogo Local
window.renderCatalogAdmin = function() {
    const grid = document.getElementById('admin-catalog-grid');
    grid.innerHTML = "";
    
    if (window.localCatalog.length === 0) {
        grid.innerHTML = "<p style='color:gray; grid-column: 1 / -1;'>Nenhum item no catálogo ainda.</p>";
        return;
    }
    
    window.localCatalog.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'catalog-item-admin';
        
        let src = item.url;
        let isPdf = false;
        
        if (item.file) {
            src = URL.createObjectURL(item.file);
            isPdf = item.file.type === 'application/pdf';
        } else if (item.url) {
            isPdf = item.url.includes('.pdf');
        }
        
        const uniqueId = 'admin-pdf-' + Math.random().toString(36).substr(2, 9);
        let contentHtml = '';
        if (isPdf) {
            contentHtml = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:rgba(255,255,255,0.05); border-radius:8px; overflow:hidden; position:relative;">
                    <canvas id="${uniqueId}" style="width: 100%; height: 100%; object-fit: cover;"></canvas>
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; padding: 0.25rem; background: rgba(0,0,0,0.8); text-align:center;">
                        <span style="color:#ccc; font-size:0.8rem;">PDF</span>
                    </div>
                </div>
            `;
        } else {
            contentHtml = `<img src="${src}" alt="Item">`;
        }
        
        div.innerHTML = `
            ${contentHtml}
            <button type="button" class="btn-remove-item" onclick="window.removerItemCatalogo(${index})"><i class="fas fa-trash"></i></button>
        `;
        grid.appendChild(div);

        if (isPdf && typeof window.pdfjsLib !== 'undefined') {
            const fetchPdf = async () => {
                let pdfData = src;
                try {
                    if (src.startsWith('http') && !src.startsWith('blob:')) {
                        let res = await fetch("https://api.codetabs.com/v1/proxy?quest=" + src).catch(()=>null);
                        if (!res || !res.ok) {
                            res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(src)).catch(()=>null);
                        }
                        if (res && res.ok) {
                            const buffer = await res.arrayBuffer();
                            pdfData = new Uint8Array(buffer);
                        }
                    }
                    const pdf = await window.pdfjsLib.getDocument(pdfData).promise;
                    const page = await pdf.getPage(1);
                    const canvas = document.getElementById(uniqueId);
                    if(!canvas) return;
                    const ctx = canvas.getContext('2d');
                    const viewport = page.getViewport({ scale: 1.0 });
                    const scale = 200 / viewport.width;
                    const scaledViewport = page.getViewport({ scale: scale });
                    canvas.width = scaledViewport.width;
                    canvas.height = scaledViewport.height;
                    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
                } catch (err) {
                    const canvas = document.getElementById(uniqueId);
                    if(canvas) canvas.outerHTML = '<div style="font-size:2rem; margin-top:2rem;">📄</div>';
                }
            };
            fetchPdf();
        }
    });
};

window.removerItemCatalogo = function(index) {
    if(confirm("Tem certeza que deseja remover este item?")) {
        window.localCatalog.splice(index, 1);
        renderCatalogAdmin();
    }
};

document.getElementById('btn-add-item').addEventListener('click', () => {
    const fileInput = document.getElementById('novoItemFile');
    
    if (!fileInput.files[0]) {
        alert("Por favor, selecione um arquivo.");
        return;
    }
    
    window.localCatalog.push({
        file: fileInput.files[0],
        url: "" // será preenchido no upload
    });
    
    // Limpa form
    fileInput.value = "";
    document.getElementById('txt-novo-item').innerText = "Clique para selecionar uma foto ou PDF";
    document.getElementById('txt-novo-item').style.color = "#aaa";
    
    renderCatalogAdmin();
});

// Lógica de Renderização de TV Local
window.renderTvAdmin = function() {
    const grid = document.getElementById('admin-tv-grid');
    grid.innerHTML = "";
    
    if (window.localTvAds.length === 0) {
        grid.innerHTML = "<p style='color:gray; grid-column: 1 / -1;'>Nenhum anúncio de TV cadastrado ainda.</p>";
        return;
    }
    
    window.localTvAds.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'catalog-item-admin';
        
        let isVideo = false;
        let src = '';
        if (item.file) {
            src = URL.createObjectURL(item.file);
            isVideo = item.file.type.includes('video');
        } else {
            src = item.url;
            isVideo = item.url && item.url.includes('.mp4');
        }
        
        let mediaHtml = isVideo 
            ? `<video src="${src}" style="width:100%; height:100%; object-fit:cover;" muted autoplay loop></video>`
            : `<img src="${src}" alt="Anúncio TV">`;

        div.innerHTML = `
            ${mediaHtml}
            <button type="button" class="btn-remove-item" onclick="removerItemTv(${index})"><i class="fas fa-trash"></i></button>
        `;
        grid.appendChild(div);
    });
};

window.removerItemTv = function(index) {
    if(confirm("Tem certeza que deseja remover este anúncio da TV?")) {
        window.localTvAds.splice(index, 1);
        renderTvAdmin();
    }
};

document.getElementById('btn-add-tv-ad').addEventListener('click', () => {
    const fileInput = document.getElementById('novoTvAdFile');
    
    if (!fileInput.files[0]) {
        alert("Por favor, selecione uma arte para o anúncio.");
        return;
    }
    
    window.localTvAds.push({
        file: fileInput.files[0],
        url: ""
    });
    
    // Limpa form
    fileInput.value = "";
    document.getElementById('txt-novo-tv-ad').innerText = "Clique para selecionar uma foto de anúncio";
    document.getElementById('txt-novo-tv-ad').style.color = "#aaa";
    
    renderTvAdmin();
});

// MÁGICA: Compressor de Imagem com Canvas (Reduz 5MB para ~100KB)
function compressImage(file, maxWidth = 1080) {
    return new Promise((resolve) => {
        if (!file || !file.type.match(/image.*/)) {
            resolve(file); // Retorna original se não for imagem
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Exporta como JPEG qualidade 0.7
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.7);
            };
        };
    });
}

// Upload Híbrido (Vídeo Passa Direto, Imagem Comprime)
async function uploadMedia(file, path) {
    if (!file) return null;
    let finalFile = file;

    // Se for vídeo, ignora compressão
    if (!file.type.includes('video')) {
        finalFile = await compressImage(file);
    }

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, finalFile);
    return await getDownloadURL(storageRef);
}

document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!currentUser) return;
    
    const btn = document.getElementById('btn-salvar');
    const loadingMsg = document.getElementById('loading-msg');
    btn.disabled = true;
    loadingMsg.style.display = 'block';
    loadingMsg.style.color = 'var(--accent-gold)';

    const barberId = document.getElementById('barberId').value.trim();

    try {
        // Validação de Segurança Básica: Tenta ler para ver se já existe e é de outro dono
        const docRef = doc(db, "barbearias", barberId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            if (docSnap.data().ownerUid !== currentUser.uid) {
                throw new Error("Este ID de barbearia já pertence a outro usuário. Escolha um ID diferente.");
            }
        }

        // 1. Upload Logo e Fundo Animado
        const logoFile = document.getElementById('logoFile').files[0];
        const logoUrl = logoFile ? await uploadMedia(logoFile, `barbearias/${barberId}/logo.jpg`) : null;

        const bgFile = document.getElementById('bgFile').files[0];
        let backgroundUrl = null;
        let backgroundType = null;
        if (bgFile) {
            const ext = bgFile.type.startsWith('video/') ? 'mp4' : 'jpg';
            backgroundUrl = await uploadMedia(bgFile, `barbearias/${barberId}/background.${ext}`);
            backgroundType = bgFile.type.startsWith('video/') ? 'video' : 'image';
        }

        // 2. Upload Catálogo Visual (Sempre imagens ou PDF)
        const catalogToSave = [];
        for (let i = 0; i < window.localCatalog.length; i++) {
            const item = window.localCatalog[i];
            let finalUrl = item.url;
            if (item.file) {
                const isPdf = item.file.type === 'application/pdf';
                const ext = isPdf ? 'pdf' : 'jpg';
                finalUrl = await uploadMedia(item.file, `barbearias/${barberId}/cat_${Date.now()}_${i}.${ext}`);
            }
            catalogToSave.push(finalUrl);
        }

        // 3. Upload Anúncios TV Visual (Pode ser Vídeo ou Imagem)
        const tvAdsToSave = [];
        for (let i = 0; i < window.localTvAds.length; i++) {
            const ad = window.localTvAds[i];
            let finalUrl = ad.url;
            if (ad.file) {
                const ext = ad.file.type.includes('video') ? 'mp4' : 'jpg';
                finalUrl = await uploadMedia(ad.file, `barbearias/${barberId}/tvAds/ad_${Date.now()}_${i}.${ext}`);
            }
            tvAdsToSave.push(finalUrl);
        }

        // 4. Salvar Banco de Dados
        const barbeariaData = {
            ownerUid: currentUser.uid,
            nome: document.getElementById('nome').value.trim(),
            slogan: document.getElementById('slogan').value.trim(),
            corPrincipal: document.getElementById('cor').value.trim(),
            instagramUrl: document.getElementById('instagram').value.trim(),
            whatsappUrl: document.getElementById('whatsapp').value.trim(),
            pixKey: document.getElementById('pix').value.trim(),
            wifiPassword: document.getElementById('wifi').value.trim(),
            googleReviewUrl: document.getElementById('googleReviewUrl').value.trim(),
            tituloCatalogo: document.getElementById('tituloCatalogo').value.trim() || 'Galeria',
            tvLayout: document.getElementById('tvLayout').value || 'l-shape',
            tipoConexao: document.getElementById('tipoConexao').value || 'youtube',
            xtreamDns: document.getElementById('xtreamDns').value.trim(),
            xtreamUser: document.getElementById('xtreamUser').value.trim(),
            xtreamPass: document.getElementById('xtreamPass').value.trim(),
            tvVideo: document.getElementById('tvVideo').value.trim(),
            tvTempoAnuncio: parseInt(document.getElementById('tvTempoAnuncio').value) || 30,
            dataCriacao: new Date().toISOString()
        };

        if (window.xtreamM3uUrl) barbeariaData.xtreamM3uUrl = window.xtreamM3uUrl;

        if (logoUrl) barbeariaData.logoUrl = logoUrl;
        if (backgroundUrl) {
            barbeariaData.backgroundUrl = backgroundUrl;
            barbeariaData.backgroundType = backgroundType;
        }
        
        // SEMPRE SALVA AS ARRAYS (mesmo se vazias) PARA PERMITIR EXCLUSÃO
        barbeariaData.catalogo = catalogToSave;
        barbeariaData.tvAds = tvAdsToSave;

        await setDoc(docRef, barbeariaData, { merge: true });
        
        alert('Dados salvos com sucesso!');
        loadingMsg.style.display = 'none';
        btn.disabled = false;
        
        // Atualiza a logo preview se fez upload
        if (logoUrl) {
            const previewLogo = document.getElementById('preview-logo');
            if (previewLogo) {
                previewLogo.src = logoUrl;
                previewLogo.style.display = 'block';
            }
        }

        // Recarrega a página para destravar recursos (ex: Modo PRO)
        window.location.reload();

        gerarQRCode(barberId);

    } catch (error) {
        console.error("Erro ao salvar negócio: ", error);
        alert('Erro ao salvar os dados.');
        loadingMsg.innerText = error.message.includes("pertence a outro") ? error.message : "Erro ao salvar. Verifique se o Firebase Storage está ativo.";
        loadingMsg.style.color = "red";
    } finally {
        btn.disabled = false;
    }
});

function gerarQRCode(id) {
    const container = document.getElementById('qrcode-container');
    const qrDiv = document.getElementById('qrcode');
    const urlFinal = `${window.location.origin}/index.html?id=${id}`;
    const urlTv = `${window.location.origin}/tv.html?id=${id}`;
    
    qrDiv.innerHTML = "";
    new QRCode(qrDiv, {
        text: urlFinal,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    
    document.getElementById('link-cliente').href = urlFinal;
    document.getElementById('link-tv').href = urlTv;
    
    const linkClienteQr = document.getElementById('link-cliente-qr');
    const linkTvQr = document.getElementById('link-tv-qr');
    if(linkClienteQr) linkClienteQr.href = urlFinal;
    if(linkTvQr) linkTvQr.href = urlTv;

    container.style.display = "block";
}

// ================= LÓGICA DO LIVE PREVIEW =================
const rootStyles = document.documentElement.style;

document.getElementById('nome').addEventListener('input', (e) => {
    document.getElementById('prev-nome').innerText = e.target.value || "Seu Negócio";
});

document.getElementById('slogan').addEventListener('input', (e) => {
    document.getElementById('prev-slogan').innerText = e.target.value || "Slogan do negócio";
});

document.getElementById('tituloCatalogo').addEventListener('input', (e) => {
    document.getElementById('prev-galeria-titulo').innerText = e.target.value || "Galeria";
});

document.getElementById('cor').addEventListener('input', (e) => {
    const color = e.target.value || "#d4af37";
    // Atualiza variaveis do CSS pro preview
    rootStyles.setProperty('--accent-gold', color);
    
    // Atualiza bordas dos cards no preview
    document.getElementById('prev-logo').style.borderColor = color;
    document.getElementById('prev-galeria-titulo').style.color = color;
    document.getElementById('prev-wifi-title').style.color = color;
    document.getElementById('prev-pix-title').style.color = color;
});

document.getElementById('logoFile').addEventListener('change', (e) => {
    if(e.target.files && e.target.files[0]) {
        const url = URL.createObjectURL(e.target.files[0]);
        document.getElementById('prev-logo').src = url;
    }
});

document.getElementById('bgFile').addEventListener('change', (e) => {
    if(e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');
        document.getElementById('preview-bg-video').style.display = isVideo ? 'block' : 'none';
        document.getElementById('preview-bg-img').style.display = isVideo ? 'none' : 'block';
        if (isVideo) {
            document.getElementById('preview-bg-video').src = url;
        } else {
            document.getElementById('preview-bg-img').src = url;
        }
    }
});

document.getElementById('googleReviewUrl').addEventListener('input', (e) => {
    const btn = document.getElementById('prev-google-btn');
    if (e.target.value) {
        btn.style.display = 'flex';
        btn.href = e.target.value;
    } else {
        btn.style.display = 'none';
    }
});

// Funcionalidade de Gravação NFC (Web NFC API)
document.getElementById('btn-nfc').addEventListener('click', async () => {
    const statusText = document.getElementById('nfc-status');
    const urlFinal = document.getElementById('link-cliente').href;

    if (!("NDEFReader" in window)) {
        statusText.style.display = 'block';
        statusText.style.color = '#ff4444'; // Red
        statusText.innerText = '❌ Erro: O seu navegador não suporta gravação NFC. Por favor, use o Google Chrome em um celular Android.';
        return;
    }

    try {
        statusText.style.display = 'block';
        statusText.style.color = 'var(--accent-gold)';
        statusText.innerText = '⏳ Aproxime a Tag NFC da parte de trás do seu celular...';
        
        const ndef = new NDEFReader();
        await ndef.write(urlFinal);
        
        statusText.style.color = '#28a745'; // Green
        statusText.innerText = '✅ Tag NFC Gravada com Sucesso!';
        
        // Vibração de sucesso se suportado
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
    } catch (error) {
        console.error("Erro ao gravar NFC:", error);
        statusText.style.color = '#ff4444';
        statusText.innerText = '❌ Erro ao gravar: ' + (error.message || 'Verifique se a tag é regravável e tente novamente.');
    }
});

// Funcionalidade de Download de QR Code em Alta Resolução (Para Placas - Centralizado em A4)
// Funcionalidade de Download de QR Code Customizável
document.getElementById('btn-download-qr-new').addEventListener('click', () => {
    const urlFinal = document.getElementById('link-cliente').href;
    const barberId = document.getElementById('barberId').value.trim() || 'negocio';
    
    // Ler inputs do usuário
    const cmValue = parseInt(document.getElementById('qrTamanho').value) || 5;
    const customTitle = document.getElementById('qrTitulo').value || '';
    const customSubtitle = document.getElementById('qrSubtitulo').value || '';

    // Converter cm para pixels em 300 DPI (1cm ≈ 118px)
    const qrSize = Math.round(cmValue * 118); 

    // Criar um container temporário invisível
    const tempDiv = document.createElement('div');
    new QRCode(tempDiv, {
        text: urlFinal,
        width: qrSize,
        height: qrSize,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    
    // Aguardar a renderização do QRCode.js
    setTimeout(() => {
        let sourceElement = tempDiv.querySelector('canvas') || tempDiv.querySelector('img');
        
        if (sourceElement) {
            // Criar o canvas A4 (2480 x 3508 para 300 DPI)
            const a4Canvas = document.createElement('canvas');
            const a4Width = 2480;
            const a4Height = 3508;
            a4Canvas.width = a4Width;
            a4Canvas.height = a4Height;
            const ctx = a4Canvas.getContext('2d');
            
            // Fundo Branco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, a4Width, a4Height);
            
            // Centralizando
            const x = (a4Width - qrSize) / 2;
            const y = (a4Height - qrSize) / 2;
            
            // Linha guia de recorte ao redor do conteúdo
            // Se for folha inteira (15cm), deixamos a guia maior ou menor
            ctx.strokeStyle = '#e0e0e0';
            ctx.setLineDash([15, 15]);
            ctx.lineWidth = 2;
            
            const guidePaddingTop = customTitle ? 120 : 40;
            const guidePaddingBottom = customSubtitle ? 120 : 40;
            const guidePaddingX = 80;
            
            ctx.strokeRect(
                x - guidePaddingX, 
                y - guidePaddingTop, 
                qrSize + (guidePaddingX * 2), 
                qrSize + guidePaddingTop + guidePaddingBottom
            );
            ctx.setLineDash([]);
            
            // Textos
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';

            if (customTitle) {
                // Título em negrito e grande
                const titleFontSize = Math.min(Math.max(qrSize * 0.12, 50), 120); 
                ctx.font = `bold ${titleFontSize}px sans-serif`;
                ctx.fillText(customTitle, a4Width / 2, y - 40);
            }

            if (customSubtitle) {
                // Subtítulo um pouco menor
                const subFontSize = Math.min(Math.max(qrSize * 0.07, 30), 80); 
                ctx.font = `${subFontSize}px sans-serif`;
                ctx.fillStyle = '#555555';
                ctx.fillText(customSubtitle, a4Width / 2, y + qrSize + (subFontSize * 1.5));
            }

            // Desenhar QR Code
            const finalizar = () => {
                const a = document.createElement('a');
                a.href = a4Canvas.toDataURL("image/png");
                a.download = `qrcode_${barberId}_Impressao.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };

            if (sourceElement.tagName === 'IMG') {
                if (sourceElement.complete) {
                    ctx.drawImage(sourceElement, x, y, qrSize, qrSize);
                    finalizar();
                } else {
                    sourceElement.onload = () => {
                        ctx.drawImage(sourceElement, x, y, qrSize, qrSize);
                        finalizar();
                    };
                }
            } else {
                ctx.drawImage(sourceElement, x, y, qrSize, qrSize);
                finalizar();
            }
        }
    }, 500);
});
