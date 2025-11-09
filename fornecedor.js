// Importa os módulos necessários do Firebase
import { db } from "./firebase-config.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referência para a coleção de fornecedores no Firestore
const fornecedoresRef = collection(db, "fornecedores");

// Elementos do formulário
const formFornecedor = document.getElementById("formFornecedor");
const tabelaFornecedores = document.getElementById("tabelaFornecedores");

// Função para cadastrar fornecedor
async function cadastrarFornecedor(event) {
  event.preventDefault();

  const razao = document.getElementById("fornRazao").value.trim();
  const cnpj = document.getElementById("fornCnpj").value.trim();
  const email = document.getElementById("fornEmail").value.trim();
  const telefone = document.getElementById("fornTelefone").value.trim();

  if (!razao || !cnpj || !email || !telefone) {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  try {
    await addDoc(fornecedoresRef, {
      razao,
      cnpj,
      email,
      telefone,
      criadoEm: new Date()
    });

    alert("✅ Fornecedor cadastrado com sucesso!");
    formFornecedor.reset();
    listarFornecedores();
  } catch (error) {
    console.error("Erro ao cadastrar fornecedor:", error);
    alert("❌ Erro ao cadastrar fornecedor!");
  }
}

// Função para listar fornecedores
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = `
    <tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>
  `;

  try {
    const snapshot = await getDocs(fornecedoresRef);
    let html = "";

    snapshot.forEach((docItem) => {
      const fornecedor = docItem.data();
      html += `
        <tr>
          <td>${fornecedor.razao}</td>
          <td>${fornecedor.cnpj}</td>
          <td>${fornecedor.email}</td>
          <td>${fornecedor.telefone}</td>
          <td>
            <button class="btn btn-danger btn-sm" data-id="${docItem.id}">
              <i class="fas fa-trash"></i> Excluir
            </button>
          </td>
        </tr>
      `;
    });

    tabelaFornecedores.innerHTML = html || `
      <tr><td colspan="5" class="text-center text-muted">Nenhum fornecedor cadastrado.</td></tr>
    `;

    // Adiciona os eventos de exclusão
    document.querySelectorAll(".btn-danger").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("button").dataset.id;
        await excluirFornecedor(id);
      });
    });
  } catch (error) {
    console.error("Erro ao listar fornecedores:", error);
    tabelaFornecedores.innerHTML = `
      <tr><td colspan="5" class="text-center text-danger">Erro ao carregar fornecedores.</td></tr>
    `;
  }
}

// Função para excluir fornecedor
async function excluirFornecedor(id) {
  try {
    await deleteDoc(doc(db, "fornecedores", id));
    alert("Fornecedor excluído com sucesso!");
    listarFornecedores();
  } catch (error) {
    console.error("Erro ao excluir fornecedor:", error);
  }
}

// Eventos
document.getElementById("btnSalvarFornecedor").addEventListener("click", cadastrarFornecedor);

// Quando a página carregar, listar os fornecedores
document.addEventListener("DOMContentLoaded", listarFornecedores);
