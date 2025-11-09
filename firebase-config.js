// Importando os módulos que vamos usar do Firebase (sem o Analytics)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCkz6E2D2qnUKE5M03ALu_uqCZK7JLQp3Y",
  authDomain: "alldev---plano-b.firebaseapp.com",
  projectId: "alldev---plano-b",
  storageBucket: "alldev---plano-b.appspot.com",
  messagingSenderId: "766087243717",
  appId: "1:766087243717:web:d77ece57140c7d748b8dac",
  measurementId: "G-3PFEXYL9XC"
};

// Inicializando o Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
