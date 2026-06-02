import { db, doc, getDoc } from './firebase-config.js';

async function initTV() {
    const urlParams = new URLSearchParams(window.location.search);
    const barberId = urlParams.get('id');

    if (!barberId) {
        document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>URL Inválida. Faltou o ID da barbearia (?id=nome)</h1>";
        return;
    }

    try {
        const docRef = doc(db, "barbearias", barberId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const config = docSnap.data();
            montarTV(config);
        } else {
            document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Barbearia não cadastrada!</h1>";
        }
    } catch (error) {
        console.error(error);
        document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:20vh'>Erro ao conectar com o banco.</h1>";
    }
}

function montarTV(config) {
    document.title = config.nome + " - TV";
    document.getElementById('wl-nome').innerText = config.nome;

    document.documentElement.style.setProperty('--accent-gold', config.corPrincipal);
    
    // Vídeo padrão via Firebase futuramente
    document.getElementById('tv-video-frame').src = "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&loop=1&playlist=jfKfPfyJRdk";
    
    const slider = document.getElementById('tv-slider');
    slider.innerHTML = '';
    const anuncios = ["assets/tv_ad1.png", "assets/fade.png"];
    
    anuncios.forEach((imgUrl, index) => {
        const slide = document.createElement('div');
        slide.className = 'tv-slide' + (index === 0 ? ' active' : '');
        slide.style.backgroundImage = `url('${imgUrl}')`;
        slider.appendChild(slide);
    });

    if (anuncios.length > 1) {
        startCarousel();
    }
}

function updateClock() {
    const clockElement = document.getElementById('clock');
    const now = new Date();
    clockElement.innerText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function startCarousel() {
    const slides = document.querySelectorAll('.tv-slide');
    let currentSlide = 0;
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
    initTV();
    updateClock();
    setInterval(updateClock, 60000);
});
