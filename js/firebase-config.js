import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAn0TXU672B7woRM3WIncNDCkPysLLRhxE",
  authDomain: "qrcode-barbearias.firebaseapp.com",
  projectId: "qrcode-barbearias",
  storageBucket: "qrcode-barbearias.firebasestorage.app",
  messagingSenderId: "548457108284",
  appId: "1:548457108284:web:ca7964119051ec1af54439"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Exporta as funções
export { db, doc, setDoc, getDoc, storage, ref, uploadBytes, getDownloadURL };
