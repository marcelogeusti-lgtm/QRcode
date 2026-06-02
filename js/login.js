import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from './firebase-config.js';

let isLoginMode = true;

// Redireciona se já estiver logado
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "admin.html";
    }
});

const form = document.getElementById('auth-form');
const btnToggle = document.getElementById('btn-toggle');
const title = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const errorMsg = document.getElementById('error-msg');

btnToggle.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    errorMsg.style.display = 'none';
    if (isLoginMode) {
        title.innerText = "Entrar na Conta";
        btnSubmit.innerText = "Fazer Login";
        btnToggle.innerText = "Ainda não tem conta? Criar agora";
    } else {
        title.innerText = "Criar Nova Conta";
        btnSubmit.innerText = "Cadastrar Barbearia";
        btnToggle.innerText = "Já tem uma conta? Fazer Login";
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Carregando...";

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged vai redirecionar
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged vai redirecionar
        }
    } catch (error) {
        console.error(error);
        errorMsg.style.display = 'block';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            errorMsg.innerText = "E-mail ou senha incorretos.";
        } else if (error.code === 'auth/email-already-in-use') {
            errorMsg.innerText = "Este e-mail já está cadastrado.";
        } else if (error.code === 'auth/weak-password') {
            errorMsg.innerText = "A senha deve ter pelo menos 6 caracteres.";
        } else {
            errorMsg.innerText = "Erro ao conectar. Tente novamente.";
        }
        btnSubmit.disabled = false;
        btnSubmit.innerText = isLoginMode ? "Fazer Login" : "Cadastrar Barbearia";
    }
});
