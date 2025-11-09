// Importações do Firebase
import { auth, db } from "./firebase-config.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// =======================
// VERIFICA LOGIN
// =======================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("user-name").textContent = user.email;
    carregarProdutos();
  }
});

// =======================
// SALVAR PRODUTO NOVO
// =======================
document.getElementById("btnSalvarProduto").addEventListener("click", async () => {
  const codigo = document.getElementById("codigo").value.trim();
  const nome = document.getElementById("nome").value.trim();
  const marca = document.getElementById("marca").value.trim();
  const quantidade = parseInt(document.getElementById("quantidade").value);
  const descricao = document.getElementById("descricao").value.trim();

  if (!codigo || !nome || !marca || isNaN(quantidade)) {
    alert("⚠️ Preencha todos os campos obrigatórios!");
    return;
  }

  try {
    if (document.getElementById("btnSalvarProduto").dataset.editingId) {
      // Atualizar produto existente
      const id = document.getElementById("btnSalvarProduto").dataset.editingId;
      const ref = doc(db, "produtos", id);
      await updateDoc(ref, { codigo, nome, marca, quantidade, descricao });

      alert("✅ Produto atualizado com sucesso!");
      delete document.getElementById("btnSalvarProduto").dataset.editingId;
    } else {
      // Criar novo produto
      await addDoc(collection(db, "produtos"), {
        codigo,
        nome,
        marca,
        quantidade,
        descricao,
        criadoEm: new Date().toISOString()
      });
      alert("✅ Produto cadastrado com sucesso!");
    }

    document.getElementById("form-produto").reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroEstoque"));
    modal.hide();
    carregarProdutos();
  } catch (erro) {
    console.error("Erro ao salvar produto:", erro);
    alert("❌ Erro ao salvar produto. Verifique o console.");
  }
});

// =======================
// CARREGAR PRODUTOS
// =======================
async function carregarProdutos() {
  const tabela = document.getElementById("tabela-produtos");
  tabela.innerHTML = `
    <tr><td colspan="5" class="text-center text-muted">Carregando produtos...</td></tr>
  `;

  try {
    const produtosSnap = await getDocs(collection(db, "produtos"));
    let html = "";

    produtosSnap.forEach((docSnap) => {
      const p = docSnap.data();
      html += `
        <tr>
          <td>${p.codigo}</td>
          <td>${p.nome}</td>
          <td>${p.marca}</td>
          <td>${p.quantidade}</td>
          <td>
            <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${docSnap.id}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-sm btn-danger btn-excluir" data-id="${docSnap.id}">
              <i class="fas fa-trash-alt"></i> Excluir
            </button>
          </td>
        </tr>
      `;
    });

    tabela.innerHTML = html || `
      <tr><td colspan="5" class="text-center text-muted">Nenhum produto encontrado.</td></tr>
    `;

    // Conecta os botões de ação
    conectarBotoes();
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
    tabela.innerHTML = `
      <tr><td colspan="5" class="text-center text-danger">Erro ao carregar produtos.</td></tr>
    `;
  }
}

// =======================
// CONECTA BOTÕES EDITAR / EXCLUIR
// =======================
function conectarBotoes() {
  // Excluir produto
  document.querySelectorAll(".btn-excluir").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Tem certeza que deseja excluir este produto?")) {
        try {
          await deleteDoc(doc(db, "produtos", id));
          alert("🗑️ Produto excluído com sucesso!");
          carregarProdutos();
        } catch (erro) {
          console.error("Erro ao excluir:", erro);
          alert("❌ Erro ao excluir produto.");
        }
      }
    });
  });

  // Editar produto
  document.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const produtosSnap = await getDocs(collection(db, "produtos"));
      produtosSnap.forEach((docSnap) => {
        if (docSnap.id === id) {
          const p = docSnap.data();
          document.getElementById("codigo").value = p.codigo;
          document.getElementById("nome").value = p.nome;
          document.getElementById("marca").value = p.marca;
          document.getElementById("quantidade").value = p.quantidade;
          document.getElementById("descricao").value = p.descricao || "";

          // Marca que é edição
          document.getElementById("btnSalvarProduto").dataset.editingId = id;

          // Abre o modal
          const modal = new bootstrap.Modal(document.getElementById("modalCadastroEstoque"));
          modal.show();
        }
      });
    });
  });
}

// =======================
// LOGOUT
// =======================
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    alert("Erro ao fazer logout.");
  }
});
