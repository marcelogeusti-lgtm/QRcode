// Inicializa a TV com os dados do White Label
function initTV() {
    if (typeof siteConfig === 'undefined') return;

    document.title = siteConfig.nome + " - TV";
    document.getElementById('wl-nome').innerText = siteConfig.nome;

    // Define as cores
    document.documentElement.style.setProperty('--accent-gold', siteConfig.colors.primary);
    document.documentElement.style.setProperty('--bg-dark', siteConfig.colors.background);

    // Configura o iframe do vídeo
    document.getElementById('tv-video-frame').src = siteConfig.tv.videoEmbedUrl;

    // Configura os slides de anúncios
    const slider = document.getElementById('tv-slider');
    slider.innerHTML = ''; // limpa

    siteConfig.tv.anuncios.forEach((imgUrl, index) => {
        const slide = document.createElement('div');
        slide.className = 'tv-slide' + (index === 0 ? ' active' : '');
        slide.style.backgroundImage = `url('${imgUrl}')`;
        slider.appendChild(slide);
    });

    // Inicia o carrossel se houver mais de um anúncio
    if (siteConfig.tv.anuncios.length > 1) {
        startCarousel();
    }
}

// Relógio
function updateClock() {
    const clockElement = document.getElementById('clock');
    const now = new Date();
    let hours = now.getHours().toString().padStart(2, '0');
    let minutes = now.getMinutes().toString().padStart(2, '0');
    clockElement.innerText = `${hours}:${minutes}`;
}

// Carrossel
function startCarousel() {
    const slides = document.querySelectorAll('.tv-slide');
    let currentSlide = 0;
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 10000); // Troca a cada 10 segundos
}

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    initTV();
    updateClock();
    setInterval(updateClock, 60000); // Atualiza o relógio a cada minuto
});
