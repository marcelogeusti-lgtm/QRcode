export default async function handler(req, res) {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // Disfarça a requisição como se fosse o aplicativo VLC Media Player
        const fetchResponse = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16',
                'Accept': '*/*'
            }
        });

        if (!fetchResponse.ok) {
            return res.status(fetchResponse.status).send(`Failed to fetch target URL: ${fetchResponse.statusText}`);
        }

        const data = await fetchResponse.text();
        
        // Adiciona headers CORS para permitir que nosso frontend leia os dados
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        res.status(200).send(data);
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
