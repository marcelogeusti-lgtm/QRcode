import { db, doc, getDoc } from './firebase-config.js';

let currentAdIndex = 0;
let tvAdsArray = [];
let ytPlayer = null;
let hlsPlayer = null; // Armazena a instância do hls.js

// Variáveis para Playlist IPTV
let m3uChannels = [];
let currentChannelIndex = 0;
let tvConfig = null;

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
            tvConfig = docSnap.data();
            
            if (tvConfig.plan === 'SUSPENDED') {
                document.body.innerHTML = "<div style='display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:black;'><h1 style='color:#ff4444; font-size:4rem; margin-bottom:1rem;'>SISTEMA INATIVO</h1><p style='color:#888; font-size:1.5rem;'>O serviço de Mídia Indoor foi temporariamente suspenso.</p></div>";
                return;
            }

            montarTV(tvConfig);
        } else {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Barbearia não encontrada!</h1>";
        }
    } catch (error) {
        document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Erro de conexão com o Banco.</h1>";
    }
}

function montarTV(config) {
    document.title = config.nome + " - TV";
    
    // Configura Cores e Info
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

    // ----------------------------------------------------
    // Lógica de LAYOUTS (L-Shape, Bottom, Fullscreen)
    // ----------------------------------------------------
    const layout = config.tvLayout || 'l-shape';
    
    if (layout === 'l-shape') {
        document.getElementById('tv-sidebar').style.display = 'flex';
        document.getElementById('tv-bottom-banner').style.display = 'block';
        document.getElementById('tv-bottom-banner').style.width = '50%';
    } 
    else if (layout === 'bottom') {
        document.getElementById('tv-sidebar').style.display = 'none';
        document.getElementById('tv-bottom-banner').style.display = 'block';
        document.getElementById('tv-bottom-banner').style.width = '100%';
    } 
    else if (layout === 'fullscreen') {
        document.getElementById('tv-sidebar').style.display = 'none';
        document.getElementById('tv-bottom-banner').style.display = 'none';
    }

    // Preparar Banners para L-Shape ou Bottom
    tvAdsArray = config.tvAds || [];
    if ((layout === 'l-shape' || layout === 'bottom') && tvAdsArray.length > 0) {
        const slider = document.getElementById('tv-slider');
        slider.innerHTML = '';
        tvAdsArray.forEach((url, index) => {
            const slide = document.createElement('div');
            slide.className = 'tv-slide' + (index === 0 ? ' active' : '');
            
            if (url.includes('.mp4')) {
                slide.innerHTML = `<video src="${url}" style="width:100%; height:100%; object-fit:cover;" muted autoplay loop></video>`;
            } else {
                slide.style.backgroundImage = `url('${url}')`;
            }
            
            slider.appendChild(slide);
        });

        const tempoAnuncio = (config.tvTempoAnuncio || 30) * 1000;
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

    // Iniciar Mídia
    let finalVideoUrl = config.tvVideo || "https://www.youtube.com/watch?v=jfKfPfyJRdk";
    if (config.tipoConexao === 'iptv' && config.xtreamDns && config.xtreamUser && config.xtreamPass) {
        let dns = config.xtreamDns.trim();
        if (dns.endsWith('/')) dns = dns.slice(0, -1);
        finalVideoUrl = `${dns}/get.php?username=${config.xtreamUser.trim()}&password=${config.xtreamPass.trim()}&type=m3u_plus&output=m3u8`;
    }

    iniciarPlayer(finalVideoUrl);
}

function iniciarPlayer(videoUrl) {
    const isPlaylist = videoUrl.includes('type=m3u') || videoUrl.endsWith('.m3u') || videoUrl.includes('get.php');
    const isIPTV = videoUrl.includes('.m3u8') || videoUrl.includes('output=hls') || isPlaylist;
    
    if (isIPTV) {
        document.getElementById('player').style.display = 'none';
        const videoElement = document.getElementById('tv-iptv-player');
        videoElement.style.display = 'block';

        if (isPlaylist) {
            carregarListaM3U(videoUrl, videoElement);
        } else {
            tocarIPTV(videoUrl, videoElement);
        }

        // Lidar com o botão de start de som
        document.getElementById('btn-start-tv').addEventListener('click', () => {
            videoElement.muted = false;
            document.getElementById('start-overlay').style.display = 'none';
            iniciarComerciaisDeTelaCheia();
        });
        
        setupZapping(videoElement);
    } else {
        // YouTube API Logic
        document.getElementById('tv-iptv-player').style.display = 'none';
        document.getElementById('player').style.display = 'block';

        let videoId = 'jfKfPfyJRdk';
        if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        else if (videoUrl.includes('watch?v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
        else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];

        // Aguarda API do YouTube carregar
        if (window.YT && window.YT.Player) {
            criarYouTubePlayer(videoId);
        } else {
            window.onYouTubeIframeAPIReady = () => criarYouTubePlayer(videoId);
        }
    }
}

async function carregarListaM3U(url, videoElement) {
    try {
        // Usa allorigins como proxy para evitar bloqueio de CORS ao baixar o texto da lista
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const data = await response.text();
        
        m3uChannels = parseM3U(data);
        if (m3uChannels.length > 0) {
            console.log(`Lista M3U carregada: ${m3uChannels.length} canais encontrados.`);
            tocarIPTV(m3uChannels[0].url, videoElement);
            mostrarOSD(m3uChannels[0].name);
        } else {
            console.warn("Nenhum canal encontrado na lista M3U.");
        }
    } catch (e) {
        console.error("Erro ao carregar lista M3U", e);
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            const parts = line.split(',');
            const name = parts[parts.length - 1];
            currentChannel = { name: name.trim() };
        } else if (line.startsWith('http') && currentChannel) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = null;
        }
    }
    return channels;
}

function tocarIPTV(streamUrl, videoElement) {
    if (Hls.isSupported()) {
        if (hlsPlayer) {
            hlsPlayer.destroy();
        }
        hlsPlayer = new Hls();
        hlsPlayer.loadSource(streamUrl);
        hlsPlayer.attachMedia(videoElement);
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => videoElement.play().catch(e=>console.log("Play abortado", e)));
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = streamUrl;
        videoElement.addEventListener('loadedmetadata', () => videoElement.play().catch(e=>console.log("Play abortado", e)));
    }
}

function setupZapping(videoElement) {
    window.addEventListener('keydown', (e) => {
        if (m3uChannels.length === 0) return;

        if (e.key === 'ArrowUp') {
            currentChannelIndex = (currentChannelIndex + 1) % m3uChannels.length;
            mudarDeCanal(videoElement);
        } else if (e.key === 'ArrowDown') {
            currentChannelIndex = (currentChannelIndex - 1 + m3uChannels.length) % m3uChannels.length;
            mudarDeCanal(videoElement);
        }
    });
}

function mudarDeCanal(videoElement) {
    const channel = m3uChannels[currentChannelIndex];
    if (channel) {
        tocarIPTV(channel.url, videoElement);
        mostrarOSD(channel.name);
    }
}

function mostrarOSD(name) {
    const osd = document.getElementById('channel-osd');
    const osdName = document.getElementById('channel-osd-name');
    if (osd && osdName) {
        osdName.innerText = "📺 " + name;
        osd.style.opacity = '1';
        
        if (window.osdTimeout) clearTimeout(window.osdTimeout);
        window.osdTimeout = setTimeout(() => {
            osd.style.opacity = '0';
        }, 3000);
    }
}

function criarYouTubePlayer(videoId) {
    ytPlayer = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'showinfo': 0,
            'rel': 0,
            'loop': 1,
            'playlist': videoId,
            'mute': 1 // Inicializa mutado para o autoplay funcionar
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();

    document.getElementById('btn-start-tv').addEventListener('click', () => {
        event.target.unMute();
        event.target.setVolume(100);
        document.getElementById('start-overlay').style.display = 'none';
        
        iniciarComerciaisDeTelaCheia();
    });
}

// ----------------------------------------------------
// MÁGICA: O INTERVALO COMERCIAL (FULLSCREEN LAYOUT)
// ----------------------------------------------------
function iniciarComerciaisDeTelaCheia() {
    const layout = tvConfig.tvLayout || 'l-shape';
    if (layout !== 'fullscreen' || tvAdsArray.length === 0) return;

    agendarProximoComercial();
}

function agendarProximoComercial() {
    const tempoAnuncio = (tvConfig.tvTempoAnuncio || 30) * 1000;
    setTimeout(() => {
        mostrarComercial();
    }, tempoAnuncio);
}

function mostrarComercial() {
    const overlay = document.getElementById('fullscreen-ad-overlay');
    const img = document.getElementById('fullscreen-ad-img');
    const video = document.getElementById('fullscreen-ad-video');
    
    // Pausa o Youtube
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        ytPlayer.pauseVideo();
    } else {
        const iptv = document.getElementById('tv-iptv-player');
        if(iptv) iptv.muted = true;
    }

    const currentUrl = tvAdsArray[currentAdIndex];
    overlay.style.display = 'flex';
    currentAdIndex = (currentAdIndex + 1) % tvAdsArray.length;

    if (currentUrl.includes('.mp4')) {
        img.style.display = 'none';
        video.style.display = 'block';
        video.src = currentUrl;
        
        // Toca o vídeo com som no talo
        video.volume = 1;
        video.muted = false;
        video.play().catch(e => console.log("Erro Play Vídeo", e));

        // Quando o vídeo acabar, retoma o Youtube e agenda o próximo
        video.onended = () => {
            encerrarComercial();
        };

        // Fallback de segurança caso o vídeo não toque
        video.onerror = () => {
            encerrarComercial();
        };
    } else {
        // É Imagem
        video.style.display = 'none';
        video.pause();
        img.style.display = 'block';
        img.src = currentUrl;

        // Fica na tela por 10 segundos
        setTimeout(() => {
            encerrarComercial();
        }, 10000);
    }
}

function encerrarComercial() {
    document.getElementById('fullscreen-ad-overlay').style.display = 'none';
    const video = document.getElementById('fullscreen-ad-video');
    video.pause();
    
    // Retoma o Youtube
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
    } else {
        const iptv = document.getElementById('tv-iptv-player');
        if(iptv) iptv.muted = false;
    }

    // Agenda o próximo
    agendarProximoComercial();
}

function updateClock() {
    const clockElement = document.getElementById('clock');
    if(clockElement) {
        const now = new Date();
        clockElement.innerText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTV();
    updateClock();
    setInterval(updateClock, 60000);
});
