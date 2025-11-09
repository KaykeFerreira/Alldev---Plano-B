// firebase-config.js

// 1. Configure suas credenciais (OBRIGATÓRIO: Substitua por seus dados reais)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO_ID.firebaseapp.com",
    projectId: "SEU_PROJETO_ID",
    storageBucket: "SEU_PROJETO_ID.appspot.com",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// 2. Importar módulos do Firebase (versão 9 modular via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query 
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// 3. Inicializar e exportar instâncias
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { 
    auth, 
    db, 
    signInWithEmailAndPassword, 
    signOut, 
    collection, 
    addDoc, 
    onSnapshot, 
    query 
};
