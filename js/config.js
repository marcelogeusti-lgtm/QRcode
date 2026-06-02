// Arquivo de Configuração White Label
// Altere os valores abaixo para criar um novo site para outro cliente.

const siteConfig = {
    // Informações da Empresa
    nome: "BARBEARIA",
    slogan: "ESTILO & TRADIÇÃO",
    logoPath: "assets/logo.png",
    
    // Cores (Ajuste para bater com a marca do cliente)
    colors: {
        primary: "#d4af37",      // Cor de destaque (Dourado por padrão)
        primaryHover: "#b5952f", // Cor de destaque ao passar o mouse
        background: "#0f1115"    // Cor de fundo escuro
    },

    // Redes Sociais e Contatos
    instagramUrl: "https://instagram.com",
    whatsappUrl: "https://wa.me/5511999999999",

    // Informações Úteis
    wifiPassword: "BarbeariaVIP2026",
    pixKey: "11999999999",

    // Catálogo de Cortes/Serviços
    catalogo: [
        { nome: "Degradê / Fade", imagem: "assets/fade.png" },
        { nome: "Social Clássico", imagem: "assets/fade.png" },
        { nome: "Barba Premium", imagem: "assets/fade.png" }
    ],

    // Configurações da Tela da TV
    tv: {
        // Link de um vídeo que ficará passando (YouTube Embed, por exemplo)
        // Dica: mute=1 é necessário para auto-play em muitos navegadores.
        videoEmbedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&loop=1&playlist=jfKfPfyJRdk",
        
        // Imagens do carrossel lateral (Propagandas)
        anuncios: [
            "assets/tv_ad1.png",
            "assets/fade.png"
        ]
    }
};
