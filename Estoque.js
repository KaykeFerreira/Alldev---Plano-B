import { auth, db } from "./firebaseConfig.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Verifica autenticação
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("user-name").textContent = user.email;
    carregarProdutos();
  }
});

// Função para salvar novo produto
document.getElementById("btnSalvarProduto").addEventListener("click", async () => {
  const codigo = document.getElementById("codigo").value.trim();
  const nome = document.getElementById("nome").value.trim();
  const marca = document.getElementById("marca").value.trim();
  const quantidade = parseInt(document.getElementById("quantidade").value);
  const descricao = document.getElementById("descricao").value.trim();

  if (!codigo || !nome || !marca || isNaN(quantidade)) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }

  try {
    await addDoc(collection(db, "produtos"), {
      codigo,
      nome,
      marca,
      quantidade,
      descricao,
      criadoEm: new Date()
    });

    alert("Produto cadastrado com sucesso!");
    document.getElementById("form-produto").reset();
    carregarProdutos();
  } catch (erro) {
    console.error("Erro ao salvar produto:", erro);
    alert("Erro ao salvar produto.");
  }
});

// Função para carregar produtos
async function carregarProdutos() {
  const tabela = document.getElementById("tabela-produtos");
  tabela.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>Carregando...</td></tr>";

  const produtosSnap = await getDocs(collection(db, "produtos"));
  let html = "";

  produtosSnap.forEach((doc) => {
    const p = doc.data();
    html += `
      <tr>
        <td>${p.codigo}</td>
        <td>${p.nome}</td>
        <td>${p.marca}</td>
        <td>${p.quantidade}</td>
        <td>
          <button class="btn btn-sm btn-info me-2"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn btn-sm btn-danger"><i class="fas fa-trash-alt"></i> Excluir</button>
        </td>
      </tr>`;
  });

  tabela.innerHTML = html || "<tr><td colspan='5' class='text-center text-muted'>Nenhum produto encontrado.</td></tr>";
}

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
