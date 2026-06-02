import { db, doc, setDoc, storage, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

// Função auxiliar para fazer upload de um arquivo para o Storage e retornar a URL
async function uploadImage(file, path) {
    if (!file) return null;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
}

document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-salvar');
    const loadingMsg = document.getElementById('loading-msg');
    btn.disabled = true;
    loadingMsg.style.display = 'block';

    const barberId = document.getElementById('barberId').value.trim().toLowerCase();

    try {
        // 1. Fazer upload de todas as imagens que o usuário enviou
        const logoFile = document.getElementById('logoFile').files[0];
        const logoUrl = await uploadImage(logoFile, `barbearias/${barberId}/logo.jpg`);

        const corte1File = document.getElementById('corte1File').files[0];
        const corte1Url = await uploadImage(corte1File, `barbearias/${barberId}/corte1.jpg`);
        
        const corte2File = document.getElementById('corte2File').files[0];
        const corte2Url = await uploadImage(corte2File, `barbearias/${barberId}/corte2.jpg`);
        
        const corte3File = document.getElementById('corte3File').files[0];
        const corte3Url = await uploadImage(corte3File, `barbearias/${barberId}/corte3.jpg`);

        const tvAd1File = document.getElementById('tvAd1File').files[0];
        const tvAd1Url = await uploadImage(tvAd1File, `barbearias/${barberId}/tvAd1.jpg`);

        const tvAd2File = document.getElementById('tvAd2File').files[0];
        const tvAd2Url = await uploadImage(tvAd2File, `barbearias/${barberId}/tvAd2.jpg`);

        // 2. Montar objeto com os dados (apenas adiciona URL se a imagem foi enviada)
        const barbeariaData = {
            nome: document.getElementById('nome').value,
            pixKey: document.getElementById('pixKey').value,
            wifiPassword: document.getElementById('wifiPassword').value,
            corPrincipal: document.getElementById('corPrincipal').value,
            instagramUrl: document.getElementById('instagramUrl').value,
            whatsappUrl: document.getElementById('whatsappUrl').value,
            tvVideo: document.getElementById('tvVideo').value,
            catalogo: [
                { nome: document.getElementById('corte1Nome').value, imagem: corte1Url || "assets/fade.png" },
                { nome: document.getElementById('corte2Nome').value, imagem: corte2Url || "assets/fade.png" },
                { nome: document.getElementById('corte3Nome').value, imagem: corte3Url || "assets/fade.png" }
            ].filter(c => c.nome !== ""), // Salva apenas os que tem nome preenchido
            tvAds: [
                tvAd1Url, tvAd2Url
            ].filter(url => url !== null) // Remove os nulos
        };

        if(logoUrl) barbeariaData.logoUrl = logoUrl;

        // 3. Salvar no Banco de Dados
        await setDoc(doc(db, "barbearias", barberId), barbeariaData);
        
        loadingMsg.innerText = "Salvo com sucesso!";
        loadingMsg.style.color = "#28a745";
        gerarQRCode(barberId);

    } catch (error) {
        console.error("Erro no processo:", error);
        loadingMsg.innerText = "Erro ao salvar. Verifique se o Firebase Storage está ativado no painel.";
        loadingMsg.style.color = "red";
    } finally {
        btn.disabled = false;
    }
});

function gerarQRCode(barberId) {
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    
    let baseUrl = window.location.href.split('admin.html')[0];
    if(!baseUrl.endsWith('/')) baseUrl += '/';
    
    const clientUrl = baseUrl + "?id=" + barberId;
    const tvUrl = baseUrl + "tv.html?id=" + barberId;

    new QRCode(qrcodeDiv, {
        text: clientUrl,
        width: 250, height: 250,
        colorDark : "#000000", colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    document.getElementById('link-preview-app').href = clientUrl;
    document.getElementById('link-preview-tv').href = tvUrl;
    qrcodeContainer.style.display = "block";
}
