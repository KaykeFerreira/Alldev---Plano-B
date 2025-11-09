// Importa os módulos necessários do Firebase
import { db } from "./firebaseConfig.js";
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
const listaFornecedores = document.getElementById("listaFornecedores");

// Função para cadastrar fornecedor
async function cadastrarFornecedor(event) {
  event.preventDefault();

  const nome = formFornecedor.nome.value.trim();
  const cnpj = formFornecedor.cnpj.value.trim();
  const telefone = formFornecedor.telefone.value.trim();

  if (!nome || !cnpj || !telefone) {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  try {
    await addDoc(fornecedoresRef, {
      nome,
      cnpj,
      telefone,
      criadoEm: new Date()
    });

    alert("Fornecedor cadastrado com sucesso!");
    formFornecedor.reset();
    listarFornecedores();
  } catch (error) {
    console.error("Erro ao cadastrar fornecedor:", error);
    alert("Erro ao cadastrar fornecedor!");
  }
}

// Função para listar fornecedores
async function listarFornecedores() {
  listaFornecedores.innerHTML = "";

  try {
    const snapshot = await getDocs(fornecedoresRef);
    snapshot.forEach((docItem) => {
      const fornecedor = docItem.data();
      const item = document.createElement("li");
      item.className = "fornecedor-item";
      item.innerHTML = `
        <strong>${fornecedor.nome}</strong><br>
        CNPJ: ${fornecedor.cnpj}<br>
        Telefone: ${fornecedor.telefone}<br>
        <button data-id="${docItem.id}" class="btn-excluir">Excluir</button>
      `;
      listaFornecedores.appendChild(item);
    });

    // Botões de exclusão
    const botoesExcluir = document.querySelectorAll(".btn-excluir");
    botoesExcluir.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        await excluirFornecedor(id);
      });
    });
  } catch (error) {
    console.error("Erro ao listar fornecedores:", error);
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
if (formFornecedor) formFornecedor.addEventListener("submit", cadastrarFornecedor);

// Quando a página carregar, listar os fornecedores
document.addEventListener("DOMContentLoaded", listarFornecedores);
