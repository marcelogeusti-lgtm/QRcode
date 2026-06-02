import { db, doc, setDoc } from './firebase-config.js';

document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-salvar');
    btn.innerText = "Salvando no Banco...";
    btn.disabled = true;

    // Pega os dados do formulário
    const barberId = document.getElementById('barberId').value.trim().toLowerCase();
    const nome = document.getElementById('nome').value;
    const pixKey = document.getElementById('pixKey').value;
    const wifiPassword = document.getElementById('wifiPassword').value;
    const corPrincipal = document.getElementById('corPrincipal').value;
    const instagramUrl = document.getElementById('instagramUrl').value;
    const whatsappUrl = document.getElementById('whatsappUrl').value;

    const barbeariaData = {
        nome: nome,
        pixKey: pixKey,
        wifiPassword: wifiPassword,
        corPrincipal: corPrincipal,
        instagramUrl: instagramUrl,
        whatsappUrl: whatsappUrl,
        slogan: "ESTILO & TRADIÇÃO",
        dataCriacao: new Date().toISOString()
    };

    try {
        // Salva os dados no Firestore (no documento com o nome do ID escolhido)
        await setDoc(doc(db, "barbearias", barberId), barbeariaData);
        
        btn.innerText = "Salvo com sucesso!";
        btn.style.background = "#28a745"; // Verde sucesso

        gerarQRCode(barberId);

        setTimeout(() => {
            btn.innerText = "Salvar e Gerar QR Code";
            btn.style.background = "var(--accent-gold)";
            btn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao conectar no banco de dados. Verifique as configurações do Firebase no console.");
        btn.innerText = "Salvar e Gerar QR Code";
        btn.disabled = false;
    }
});

function gerarQRCode(barberId) {
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeDiv = document.getElementById('qrcode');
    const linkPreview = document.getElementById('link-preview');
    
    // Limpa qrcode antigo
    qrcodeDiv.innerHTML = '';
    
    // Constrói a URL da página do cliente (dinâmica)
    // Pega a URL base atual (ex: localhost ou vercel) e remove o admin.html se tiver
    let baseUrl = window.location.href.split('admin.html')[0];
    if(!baseUrl.endsWith('/')) baseUrl += '/';
    
    const clientUrl = baseUrl + "?id=" + barberId;

    // Gera a imagem
    new QRCode(qrcodeDiv, {
        text: clientUrl,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    linkPreview.href = clientUrl;
    qrcodeContainer.style.display = "block";
}
