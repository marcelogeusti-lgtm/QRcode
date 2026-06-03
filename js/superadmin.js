import { db, doc, updateDoc, collection, getDocs } from './firebase-config.js';

let allClients = [];

// 1. Lógica de Login Mestre (Independente do Firebase Auth)
const loginForm = document.getElementById('superadmin-login-form');
const overlay = document.getElementById('auth-overlay');
const errorMsg = document.getElementById('auth-error');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('sa-email').value.trim();
    const password = document.getElementById('sa-password').value.trim();

    if (email === 'marcelogeusti@gmail.com' && password === 'G@usti8826') {
        // Acesso Concedido
        overlay.style.display = 'none';
        await loadClients();
    } else {
        // Acesso Negado
        errorMsg.style.display = 'block';
    }
});

// 2. Carregar Clientes do Banco de Dados
async function loadClients() {
    try {
        const querySnapshot = await getDocs(collection(db, "barbearias"));
        allClients = [];
        
        let total = 0;
        let proCount = 0;
        let freeCount = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const client = {
                id: docSnap.id,
                ...data
            };
            allClients.push(client);

            // Contagem de Métricas
            total++;
            if (client.plan === 'PRO') {
                proCount++;
            } else {
                freeCount++;
            }
        });

        // Atualiza os Cards de Métricas
        document.getElementById('metric-total').innerText = total;
        document.getElementById('metric-pro').innerText = proCount;
        document.getElementById('metric-free').innerText = freeCount;

        renderTable(allClients);

    } catch (e) {
        console.error("Erro ao buscar clientes: ", e);
        document.getElementById('clients-tbody').innerHTML = `<tr><td colspan="5" style="color:#ff4444; text-align:center;">Erro ao carregar clientes do banco de dados.</td></tr>`;
    }
}

// 3. Renderizar a Tabela
function renderTable(clientsArray) {
    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = "";

    if (clientsArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--muted-foreground); padding: 2rem;">Nenhum cliente encontrado.</td></tr>`;
        return;
    }

    // Ordenar por data de criação (mais recentes primeiro)
    clientsArray.sort((a, b) => {
        const dateA = a.dataCriacao ? new Date(a.dataCriacao) : new Date(0);
        const dateB = b.dataCriacao ? new Date(b.dataCriacao) : new Date(0);
        return dateB - dateA; // Decrescente
    });

    clientsArray.forEach(client => {
        const tr = document.createElement('tr');
        
        // Formatação do WhatsApp Link
        let waLink = client.whatsappUrl ? `<a href="${client.whatsappUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline;">Conversar no Zap</a>` : `<span style="color:var(--muted-foreground)">Não informado</span>`;
        
        // Data formatada
        let dataCriacaoStr = "Desconhecida";
        if (client.dataCriacao) {
            const d = new Date(client.dataCriacao);
            dataCriacaoStr = d.toLocaleDateString('pt-BR') + " " + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

        // Badge do Plano
        const isPro = client.plan === 'PRO';
        const badgeHtml = isPro ? `<span class="badge badge-pro">PRO</span>` : `<span class="badge badge-free">GRATUITO</span>`;

        // Botões Mágicos
        const actionBtn = isPro 
            ? `<button class="action-btn" onclick="window.togglePlan('${client.id}', 'FREE')">⬇️ Rebaixar para Grátis</button>`
            : `<button class="action-btn btn-pro" onclick="window.togglePlan('${client.id}', 'PRO')">✨ Tornar PRO</button>`;

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--foreground);">${client.nome || 'Sem Nome'}</div>
                <div style="font-size: 0.75rem; color: var(--muted-foreground); font-family: monospace;">ID: ${client.id}</div>
            </td>
            <td>${waLink}</td>
            <td style="font-size: 0.875rem;">${dataCriacaoStr}</td>
            <td>${badgeHtml}</td>
            <td style="text-align: right;">${actionBtn}</td>
        `;

        tbody.appendChild(tr);
    });
}

// 4. Função para Mudar o Plano (O Botão Mágico)
window.togglePlan = async function(barberId, newPlan) {
    const confirmation = confirm(`Tem certeza que deseja mudar o plano da barbearia [${barberId}] para ${newPlan}?`);
    if (!confirmation) return;

    try {
        const docRef = doc(db, "barbearias", barberId);
        await updateDoc(docRef, {
            plan: newPlan
        });
        
        // Atualiza a tabela na tela sem precisar recarregar
        await loadClients();
        alert(`Sucesso! A barbearia [${barberId}] agora é ${newPlan}.`);
    } catch (e) {
        console.error("Erro ao atualizar plano:", e);
        alert("Erro ao tentar atualizar o plano. Verifique o console.");
    }
};

// 5. Pesquisa (Filtro)
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allClients.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(term)) || 
        (c.id && c.id.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

// 6. Logout Simples
document.getElementById('btn-logout').addEventListener('click', () => {
    overlay.style.display = 'flex';
    document.getElementById('sa-password').value = "";
    document.getElementById('clients-tbody').innerHTML = "";
    errorMsg.style.display = 'none';
});
