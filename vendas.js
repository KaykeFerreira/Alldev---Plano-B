// vendas.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// 🔧 Configuração Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔒 Verificação de login
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
  else document.getElementById("usuarioLogado").textContent = user.email;
});

// 🚪 Logout
window.logout = () => {
  signOut(auth).then(() => window.location.href = "login.html");
};

// 🧾 Cadastrar Venda
const formVenda = document.getElementById("formVenda");
if (formVenda) {
  formVenda.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cliente = document.getElementById("cliente").value;
    const produto = document.getElementById("produto").value;
    const quantidade = parseInt(document.getElementById("quantidade").value);
    const total = parseFloat(document.getElementById("total").value);

    if (!cliente || !produto || !quantidade || !total) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      await addDoc(collection(db, "vendas"), {
        cliente,
        produto,
        quantidade,
        total,
        data: new Date().toLocaleString()
      });

      alert("✅ Venda cadastrada com sucesso!");
      formVenda.reset();
      const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroVenda"));
      modal.hide();
    } catch (erro) {
      console.error("Erro ao cadastrar:", erro);
      alert("❌ Falha ao cadastrar venda!");
    }
  });
}

// 📋 Listar Vendas em tempo real
const listaVendas = document.getElementById("listaVendas");
if (listaVendas) {
  const refVendas = collection(db, "vendas");

  onSnapshot(refVendas, (snapshot) => {
    listaVendas.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const venda = docSnap.data();
      const id = docSnap.id;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${venda.cliente}</td>
        <td>${venda.produto}</td>
        <td>${venda.quantidade}</td>
        <td>R$ ${venda.total.toFixed(2)}</td>
        <td>${venda.data}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="removerVenda('${id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      listaVendas.appendChild(tr);
    });
  });
}

// 🗑️ Remover venda
window.removerVenda = async (id) => {
  if (confirm("Tem certeza que deseja excluir esta venda?")) {
    try {
      await deleteDoc(doc(db, "vendas", id));
      alert("Venda removida!");
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
    }
  }
};
