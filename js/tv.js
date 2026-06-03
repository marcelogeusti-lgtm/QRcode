import { db, doc, getDoc } from './firebase-config.js';

let currentAdIndex = 0;
let tvAdsArray = [];
let ytPlayer = null;
let hlsPlayer = null; // Armazena a instância do hls.js

// Variáveis para Playlist IPTV
let m3uChannels = [];
let currentChannelIndex = 0;
let tvConfig = null;

// Variáveis Menu Visual IPTV
let iptvCategories = {};
let iptvCategoriesArray = [];
let currentCategoryName = "Todos";
let iptvMenuOpen = false;
let iptvMenuTimeout = null;

// Lógica de Unmute Global
let isMuted = true;
function unmuteAll() {
    if (!isMuted) return;
    isMuted = false;
    const iptv = document.getElementById('tv-iptv-player');
    if (iptv) iptv.muted = false;
    if (ytPlayer && typeof ytPlayer.unMute === 'function') {
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
    }
}
document.addEventListener('click', unmuteAll);
document.addEventListener('keydown', unmuteAll);

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
    // Iniciar Mídia
    let finalVideoUrl = config.tvVideo || "https://www.youtube.com/watch?v=jfKfPfyJRdk";
    
    if (config.tipoConexao === 'iptv') {
        if (config.xtreamM3uUrl) {
            // Se o usuário fez upload do arquivo, usa o link direto do Firebase
            finalVideoUrl = config.xtreamM3uUrl;
        } else if (config.xtreamDns && config.xtreamUser && config.xtreamPass) {
            // Fallback para o link dinâmico que sofre bloqueios
            let dns = config.xtreamDns.trim();
            if (dns.endsWith('/')) dns = dns.slice(0, -1);
            finalVideoUrl = `${dns}/get.php?username=${config.xtreamUser.trim()}&password=${config.xtreamPass.trim()}&type=m3u_plus&output=m3u8`;
        }
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

        // Auto-play silencioso para contornar bloqueio de navegadores
        iniciarComerciaisDeTelaCheia();
        
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
        // Usa corsproxy.io para adicionar headers CORS, seja para links diretos ou do Firebase Storage
        const fetchUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

        const response = await fetch(fetchUrl);
        const data = await response.text();
        
        m3uChannels = parseM3U(data);
        if (m3uChannels.length > 0) {
            console.log(`Lista M3U carregada: ${m3uChannels.length} canais encontrados.`);
            
            // Renderiza categorias iniciais
            renderizarCategorias();

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
    iptvCategories = { "Todos": [] };
    let currentChannel = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            // Extrai a Categoria (group-title)
            const groupMatch = line.match(/group-title="([^"]+)"/i);
            const category = groupMatch ? groupMatch[1].trim() : "Outros";

            // Extrai a Logo (tvg-logo)
            const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            const logo = logoMatch ? logoMatch[1] : "";

            // Nome do canal
            const parts = line.split(',');
            const name = parts[parts.length - 1];
            
            currentChannel = { 
                name: name.trim(),
                category: category,
                logo: logo,
                index: channels.length 
            };
        } else if (line.startsWith('http') && currentChannel) {
            currentChannel.url = line;
            channels.push(currentChannel);
            
            // Popula as Categorias
            if (!iptvCategories[currentChannel.category]) {
                iptvCategories[currentChannel.category] = [];
            }
            iptvCategories[currentChannel.category].push(currentChannel);
            iptvCategories["Todos"].push(currentChannel);

            currentChannel = null;
        }
    }

    iptvCategoriesArray = Object.keys(iptvCategories).sort();
    // Garante que 'Todos' seja o primeiro
    iptvCategoriesArray = ["Todos", ...iptvCategoriesArray.filter(c => c !== "Todos")];

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
        if (e.key === 'Enter') {
            if (m3uChannels.length === 0) {
                alert("Aviso: A lista de canais ainda está carregando ou ocorreu um erro de conexão com seu servidor IPTV. Verifique se o DNS, Usuário e Senha estão corretos no Painel.");
                return;
            }
            toggleMenuIPTV();
        } else if (e.key === 'Escape') {
            fecharMenuIPTV();
        }

        if (m3uChannels.length === 0) return;

        // Resetar timer do menu a cada clique se estiver aberto
        if (iptvMenuOpen) resetMenuTimeout();

        if (e.key === 'ArrowUp' && !iptvMenuOpen) {
            currentChannelIndex = (currentChannelIndex + 1) % m3uChannels.length;
            mudarDeCanal(videoElement);
        } else if (e.key === 'ArrowDown' && !iptvMenuOpen) {
            currentChannelIndex = (currentChannelIndex - 1 + m3uChannels.length) % m3uChannels.length;
            mudarDeCanal(videoElement);
        }
    });
}

// ================= Lógica do Menu Visual IPTV =================

function renderizarCategorias() {
    const catContainer = document.getElementById('iptv-categories');
    if (!catContainer) return;
    
    catContainer.innerHTML = '';
    iptvCategoriesArray.forEach(cat => {
        const div = document.createElement('div');
        div.innerText = cat;
        div.style.padding = '15px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        div.style.transition = 'background 0.2s';
        
        if (cat === currentCategoryName) {
            div.style.background = 'var(--accent-gold)';
            div.style.color = 'black';
            div.style.fontWeight = 'bold';
            div.style.borderRadius = '4px';
        }

        div.onclick = () => {
            currentCategoryName = cat;
            renderizarCategorias(); // Atualiza a cor de seleção
            renderizarCanaisDaCategoria(cat);
            resetMenuTimeout();
        };

        div.onmouseover = () => { if(cat !== currentCategoryName) div.style.background = 'rgba(255,255,255,0.1)'; };
        div.onmouseout = () => { if(cat !== currentCategoryName) div.style.background = 'transparent'; };

        catContainer.appendChild(div);
    });

    // Renderiza os canais da primeira categoria ao abrir
    renderizarCanaisDaCategoria(currentCategoryName);
}

function renderizarCanaisDaCategoria(categoria) {
    const grid = document.getElementById('iptv-channels-grid');
    const title = document.getElementById('iptv-current-category-title');
    if (!grid || !title) return;

    title.innerText = categoria;
    grid.innerHTML = '';

    const canais = iptvCategories[categoria] || [];
    
    canais.forEach(channel => {
        const card = document.createElement('div');
        card.style.background = 'rgba(0,0,0,0.6)';
        card.style.border = '1px solid rgba(255,255,255,0.1)';
        card.style.borderRadius = '8px';
        card.style.padding = '1rem';
        card.style.cursor = 'pointer';
        card.style.textAlign = 'center';
        card.style.transition = 'transform 0.2s, border 0.2s';

        // Logo
        const img = document.createElement('img');
        img.src = channel.logo || 'https://via.placeholder.com/150x150/222/D4AF37?text=TV';
        img.style.width = '100%';
        img.style.height = '120px';
        img.style.objectFit = 'contain';
        img.style.marginBottom = '1rem';
        // Erro na logo fallback
        img.onerror = () => { img.src = 'https://via.placeholder.com/150x150/222/D4AF37?text=TV'; };

        const name = document.createElement('div');
        name.innerText = channel.name;
        name.style.fontWeight = 'bold';
        name.style.fontSize = '0.9rem';
        name.style.whiteSpace = 'nowrap';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis';

        card.appendChild(img);
        card.appendChild(name);

        card.onclick = () => {
            currentChannelIndex = channel.index;
            mudarDeCanal(document.getElementById('tv-iptv-player'));
            fecharMenuIPTV();
        };

        card.onmouseover = () => { 
            card.style.transform = 'scale(1.05)'; 
            card.style.borderColor = 'var(--accent-gold)';
        };
        card.onmouseout = () => { 
            card.style.transform = 'scale(1)'; 
            card.style.borderColor = 'rgba(255,255,255,0.1)';
        };

        grid.appendChild(card);
    });
}

function toggleMenuIPTV() {
    if (iptvMenuOpen) {
        fecharMenuIPTV();
    } else {
        abrirMenuIPTV();
    }
}

function abrirMenuIPTV() {
    const menu = document.getElementById('iptv-menu-overlay');
    if (menu) {
        menu.style.display = 'flex';
        iptvMenuOpen = true;
        renderizarCategorias();
        resetMenuTimeout();
    }
}

function fecharMenuIPTV() {
    const menu = document.getElementById('iptv-menu-overlay');
    if (menu) {
        menu.style.display = 'none';
        iptvMenuOpen = false;
        if (iptvMenuTimeout) clearTimeout(iptvMenuTimeout);
    }
}

function resetMenuTimeout() {
    if (iptvMenuTimeout) clearTimeout(iptvMenuTimeout);
    iptvMenuTimeout = setTimeout(() => {
        fecharMenuIPTV();
    }, 10000); // 10 segundos de inatividade fecha o menu
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
    
    // Auto-play silencioso
    iniciarComerciaisDeTelaCheia();
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
