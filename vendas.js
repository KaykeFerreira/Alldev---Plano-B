// ======== Configuração e Inicialização do Firebase ========
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkz6E2D2qnUKE5M03ALu_uqCZK7JLQp3Y",
  authDomain: "alldev---plano-b.firebaseapp.com",
  projectId: "alldev---plano-b",
  storageBucket: "alldev---plano-b.firebasestorage.app",
  messagingSenderId: "766087243717",
  appId: "1:766087243717:web:d77ece57140c7d748b8dac",
  measurementId: "G-3PFEXYL9XC"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ======== Função: Registrar uma venda ========
async function registrarVenda(event) {
  event.preventDefault();

  const cliente = document.getElementById("cliente").value.trim();
  const produto = document.getElementById("produto").value.trim();
  const quantidade = document.getElementById("quantidade").value.trim();
  const valor = document.getElementById("valor").value.trim();

  if (!cliente || !produto || !quantidade || !valor) {
    alert("Preencha todos os campos antes de salvar!");
    return;
  }

  try {
    await addDoc(collection(db, "vendas"), {
      cliente,
      produto,
      quantidade: parseInt(quantidade),
      valor: parseFloat(valor),
      data: new Date().toLocaleString("pt-BR")
    });

    alert("Venda registrada com sucesso!");
    document.getElementById("vendaForm").reset();
    listarVendas();
  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    alert("Erro ao registrar venda. Verifique o console.");
  }
}

// ======== Função: Listar vendas no HTML ========
async function listarVendas() {
  const tabela = document.getElementById("tabelaVendas");
  tabela.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "vendas"));
    querySnapshot.forEach((doc) => {
      const venda = doc.data();
      const row = `
        <tr>
          <td>${venda.cliente}</td>
          <td>${venda.produto}</td>
          <td>${venda.quantidade}</td>
          <td>R$ ${venda.valor.toFixed(2)}</td>
          <td>${venda.data}</td>
        </tr>
      `;
      tabela.innerHTML += row;
    });
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
  }
}

// ======== Função: Logout ========
function logout() {
  signOut(auth)
    .then(() => {
      alert("Logout realizado com sucesso!");
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Erro ao fazer logout:", error);
    });
}

// ======== Eventos ========
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("vendaForm");
  if (form) {
    form.addEventListener("submit", registrarVenda);
  }

  listarVendas();
});

window.logout = logout;
