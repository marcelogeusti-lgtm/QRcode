import { db, doc, setDoc, storage, ref, uploadBytes, getDownloadURL, auth, onAuthStateChanged, signOut, getDoc, collection, query, where, getDocs } from './firebase-config.js';

let currentUser = null;
window.localCatalog = [];

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
            
            // Preenche os campos de texto
            document.getElementById('barberId').value = docData.id;
            document.getElementById('barberId').readOnly = true; // Impede que ele mude o ID depois que criar
            document.getElementById('barberId').style.opacity = '0.7';
            
            if(data.nome) document.getElementById('nome').value = data.nome;
            if(data.slogan) document.getElementById('slogan').value = data.slogan;
            if(data.tituloCatalogo) document.getElementById('tituloCatalogo').value = data.tituloCatalogo;
            if(data.corPrincipal) document.getElementById('cor').value = data.corPrincipal;
            if(data.instagramUrl) document.getElementById('instagram').value = data.instagramUrl;
            if(data.whatsappUrl) document.getElementById('whatsapp').value = data.whatsappUrl;
            if(data.pixKey) document.getElementById('pix').value = data.pixKey;
            if(data.wifiPassword) document.getElementById('wifi').value = data.wifiPassword;
            if(data.tvVideo) document.getElementById('tvVideo').value = data.tvVideo;
            if(data.tvTempoVideo) document.getElementById('tvTempoVideo').value = data.tvTempoVideo;
            if(data.tvTempoAnuncio) document.getElementById('tvTempoAnuncio').value = data.tvTempoAnuncio;
            
            // Mostra texto de que tem foto salva
            if(data.logoUrl) document.querySelector('#drop-logo p').innerText = "✅ Logo atual salva no sistema. Envie outra para substituir.";
            if(data.tvAds && data.tvAds.length > 0) document.querySelector('#drop-tv p').innerText = `✅ ${data.tvAds.length} anúncios de TV salvos. Envie novas para substituir.`;
            
            // Catálogo (Tratando dados antigos vs novos)
            if(data.catalogo && data.catalogo.length > 0) {
                window.localCatalog = data.catalogo.map(item => {
                    if (typeof item === 'string') return { nome: "Sem Nome", preco: "", url: item };
                    return item;
                });
                renderCatalogAdmin();
            }
            
            // Já mostra o QR code e link sem precisar apertar salvar de novo
            gerarQRCode(docData.id);
        }
    } catch(e) {
        console.error("Erro ao carregar dados antigos:", e);
    }
}

document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
});

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
setupDropZone('drop-tv', 'tvAdsFiles');
setupDropZone('drop-novo-item', 'novoItemFile');

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
        if (item.file) {
            src = URL.createObjectURL(item.file);
        }
        
        div.innerHTML = `
            <button type="button" class="btn-remove-item" onclick="removerItemCatalogo(${index})">X</button>
            <img src="${src}" alt="Item">
            <div class="info">
                <p title="${item.nome}">${item.nome || 'Sem Nome'}</p>
                <small>${item.preco || ''}</small>
            </div>
        `;
        grid.appendChild(div);
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
    const nomeInput = document.getElementById('novoItemNome');
    const precoInput = document.getElementById('novoItemPreco');
    
    if (!fileInput.files[0]) {
        alert("Por favor, selecione uma foto para o item.");
        return;
    }
    if (!nomeInput.value.trim()) {
        alert("Por favor, dê um nome ao item.");
        return;
    }
    
    window.localCatalog.push({
        nome: nomeInput.value.trim(),
        preco: precoInput.value.trim(),
        file: fileInput.files[0],
        url: "" // será preenchido no upload
    });
    
    // Limpa form
    fileInput.value = "";
    nomeInput.value = "";
    precoInput.value = "";
    document.getElementById('txt-novo-item').innerText = "Clique para selecionar a foto";
    document.getElementById('txt-novo-item').style.color = "#aaa";
    
    renderCatalogAdmin();
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

// Upload com Compressão
async function uploadImage(file, path) {
    if (!file) return null;
    const compressed = await compressImage(file);
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, compressed);
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
        const docSnap = await docRef.getDoc ? await getDoc(docRef) : null;
        if (docSnap && docSnap.exists()) {
            if (docSnap.data().ownerUid !== currentUser.uid) {
                throw new Error("Este ID de barbearia já pertence a outro usuário. Escolha um ID diferente.");
            }
        }

        // 1. Upload Logo
        const logoFile = document.getElementById('logoFile').files[0];
        const logoUrl = logoFile ? await uploadImage(logoFile, `barbearias/${barberId}/logo.jpg`) : null;

        // 2. Upload Catálogo Visual (Processando array misto de arquivos novos e urls antigas)
        const catalogToSave = [];
        for (let i = 0; i < window.localCatalog.length; i++) {
            const item = window.localCatalog[i];
            let finalUrl = item.url;
            if (item.file) {
                // Se tem '.file', é um upload novo
                finalUrl = await uploadImage(item.file, `barbearias/${barberId}/cat_${Date.now()}_${i}.jpg`);
            }
            catalogToSave.push({
                nome: item.nome || "",
                preco: item.preco || "",
                url: finalUrl
            });
        }

        // 3. Upload Anúncios TV
        const tvAdsFiles = document.getElementById('tvAdsFiles').files;
        const tvAdsUrls = [];
        for (let i = 0; i < tvAdsFiles.length; i++) {
            const url = await uploadImage(tvAdsFiles[i], `barbearias/${barberId}/tvAds/ad_${i}.jpg`);
            tvAdsUrls.push(url);
        }

        // 4. Salvar Banco de Dados
        const barbeariaData = {
            ownerUid: currentUser.uid,
            nome: document.getElementById('nome').value,
            slogan: document.getElementById('slogan').value,
            tituloCatalogo: document.getElementById('tituloCatalogo').value,
            corPrincipal: document.getElementById('cor').value,
            instagramUrl: document.getElementById('instagram').value,
            whatsappUrl: document.getElementById('whatsapp').value,
            pixKey: document.getElementById('pix').value,
            wifiPassword: document.getElementById('wifi').value,
            tvVideo: document.getElementById('tvVideo').value,
            tvTempoVideo: parseInt(document.getElementById('tvTempoVideo').value) || 5,
            tvTempoAnuncio: parseInt(document.getElementById('tvTempoAnuncio').value) || 30,
            dataCriacao: new Date().toISOString()
        };

        if (logoUrl) barbeariaData.logoUrl = logoUrl;
        if (catalogToSave.length > 0) barbeariaData.catalogo = catalogToSave;
        if (tvAdsUrls.length > 0) barbeariaData.tvAds = tvAdsUrls;

        await setDoc(docRef, barbeariaData, { merge: true });
        
        alert('Dados salvos com sucesso!');
        loadingMsg.style.display = 'none';
        btn.disabled = false;
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
    const urlFinal = window.location.origin + "/?id=" + id;
    const urlTv = window.location.origin + "/tv.html?id=" + id;
    
    qrDiv.innerHTML = "";
    new QRCode(qrDiv, {
        text: urlFinal,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    
    document.getElementById('link-cliente').href = urlFinal;
    document.getElementById('link-tv').href = urlTv;
    container.style.display = "block";
}

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
