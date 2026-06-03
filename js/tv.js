import { db, doc, getDoc } from './firebase-config.js';

let tvAdsArray = [];

async function initTV() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = urlParams.get('id');

    if (!barberId) {
        document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>URL Inválida!</h1>";
        return;
    }

    try {
        const docRef = doc(db, "barbearias", barberId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            montarTV(docSnap.data());
        } else {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Barbearia não encontrada!</h1>";
        }
    } catch (error) {
        document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Erro de conexão com o Banco.</h1>";
    }
}

function montarTV(config) {
    document.title = config.nome + " - TV";
    
    // 1. Configura a Barra Lateral (Sidebar)
    document.documentElement.style.setProperty('--accent-gold', config.corPrincipal || '#d4af37');
    document.getElementById('tv-nome').innerText = config.nome || "Bem-vindo";
    if (config.logoUrl) {
        document.getElementById('tv-logo').src = config.logoUrl;
    }
    
    // Gerar QR Code na Sidebar
    const urlFinal = `${window.location.origin}/index.html?id=${new URLSearchParams(window.location.search).get('id')}`;
    new QRCode(document.getElementById('qrcode-tv'), {
        text: urlFinal,
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Mostra a Sidebar
    document.getElementById('tv-sidebar').style.display = 'flex';

    // Puxa o link do vídeo (garantindo que tem autoplay e mute se for youtube)
    let videoUrl = config.tvVideo || "https://www.youtube.com/embed/jfKfPfyJRdk";
    
    // Lógica do Player: Decide se é IPTV ou YouTube
    const isIPTV = videoUrl.includes('.m3u8') || videoUrl.includes('output=hls') || videoUrl.includes('type=m3u');
    
    if (isIPTV) {
        const videoElement = document.getElementById('tv-iptv-player');
        videoElement.style.display = 'block';
        
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                videoElement.play();
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = videoUrl;
            videoElement.addEventListener('loadedmetadata', function() {
                videoElement.play();
            });
        }
    } else {
        const iframeElement = document.getElementById('tv-youtube-frame');
        iframeElement.style.display = 'block';
        
        // Conversor automático de links normais para Embed
        if (videoUrl.includes('youtu.be/')) {
            const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes('youtube.com/watch?v=')) {
            const videoId = videoUrl.split('v=')[1].split('&')[0];
            videoUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        // Adiciona os parâmetros obrigatórios para a TV tocar sozinha sem erro
        if (videoUrl.includes('youtube.com/embed') && !videoUrl.includes('autoplay')) {
            videoUrl += videoUrl.includes('?') ? '&autoplay=1&mute=1&loop=1' : '?autoplay=1&mute=1&loop=1';
        }
        
        iframeElement.src = videoUrl;
    }
    
    // Configura os slides de anúncio
    const slider = document.getElementById('tv-slider');
    slider.innerHTML = '';
    tvAdsArray = config.tvAds || [];
    
    if (tvAdsArray.length > 0) {
        tvAdsArray.forEach((imgUrl, index) => {
            const slide = document.createElement('div');
            slide.className = 'tv-slide' + (index === 0 ? ' active' : '');
            slide.style.backgroundImage = `url('${imgUrl}')`;
            slider.appendChild(slide);
        });

        // 3. Inicia o Carrossel da Barra Inferior
        const tempoAnuncioSecs = config.tvTempoAnuncio || 30;
        const tempoAnuncio = tempoAnuncioSecs * 1000;
        
        document.getElementById('tv-bottom-banner').style.display = 'block';

        if (tvAdsArray.length > 1) {
            let currentSlide = 0;
            const slides = document.querySelectorAll('.tv-slide');
            setInterval(() => {
                slides[currentSlide].classList.remove('active');
                currentSlide = (currentSlide + 1) % slides.length;
                slides[currentSlide].classList.add('active');
            }, tempoAnuncio);
        }
    }
}

function updateClock() {
    const clockElement = document.getElementById('clock');
    const now = new Date();
    clockElement.innerText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    initTV();
    updateClock();
    setInterval(updateClock, 60000);
});
