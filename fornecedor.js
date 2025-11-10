// Importa os módulos necessários do Firebase
import { db } from "./firebase-config.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referência para a coleção de fornecedores
const fornecedoresRef = collection(db, "fornecedores");

// Elementos do formulário
const formFornecedor = document.getElementById("formFornecedor");
const tabelaFornecedores = document.getElementById("tabelaFornecedores");
const btnSalvarFornecedor = document.getElementById("btnSalvarFornecedor");
const inputPesquisa = document.getElementById("pesquisaFornecedor");

// Variável para controle de edição
let fornecedorEditando = null;

// Função para validar campos
function validarCampos(fornecedor) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fornecedor.email)) {
    alert("Digite um e-mail válido!");
    return false;
  }

  const cnpjLimpo = fornecedor.cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) {
    alert("CNPJ deve ter 14 números!");
    return false;
  }
  fornecedor.cnpj = cnpjLimpo;

  const telefoneLimpo = fornecedor.telefone.replace(/\D/g, "");
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    alert("Telefone deve ter 10 ou 11 números!");
    return false;
  }
  fornecedor.telefone = telefoneLimpo;

  if (!fornecedor.id || isNaN(fornecedor.id)) {
    alert("Digite um ID válido!");
    return false;
  }

  return true;
}

// Função para salvar ou editar fornecedor
async function salvarFornecedor(event) {
  event.preventDefault();

  const fornecedor = {
    id: document.getElementById("fornId").value.trim(),
    razao: document.getElementById("fornRazao").value.trim(),
    cnpj: document.getElementById("fornCnpj").value.trim(),
    email: document.getElementById("fornEmail").value.trim(),
    telefone: document.getElementById("fornTelefone").value.trim()
  };

  if (!fornecedor.id || !fornecedor.razao || !fornecedor.cnpj || !fornecedor.email || !fornecedor.telefone) {
    alert("Preencha todos os campos!");
    return;
  }

  if (!validarCampos(fornecedor)) return;

  try {
    const snapshot = await getDocs(fornecedoresRef);
    let idDuplicado = false;

    snapshot.forEach(docItem => {
      const data = docItem.data();
      if (!fornecedorEditando && data.id === fornecedor.id) {
        idDuplicado = true;
      }
      // se estiver editando, verificar se outro fornecedor já tem esse ID
      if (fornecedorEditando && data.id === fornecedor.id && docItem.id !== fornecedorEditando) {
        idDuplicado = true;
      }
    });

    if (idDuplicado) {
      alert("ID já existe! Escolha outro ID.");
      return;
    }

    if (fornecedorEditando) {
      await updateDoc(doc(db, "fornecedores", fornecedorEditando), fornecedor);
      fornecedorEditando = null;
    } else {
      await addDoc(fornecedoresRef, fornecedor);
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor"));
    modal.hide();

    formFornecedor.reset();
    listarFornecedores();
  } catch (erro) {
    console.error("Erro ao salvar fornecedor:", erro);
    alert("Erro ao salvar fornecedor!");
  }
}

// Função para listar fornecedores
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;

  try {
    const snapshot = await getDocs(fornecedoresRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let html = "";

    snapshot.forEach(docItem => {
      const f = docItem.data();
      const idDoc = docItem.id;

      // Garantir que campos existam
      const razao = f.razao?.toLowerCase() || "";
      const cnpj = f.cnpj || "";
      const email = f.email?.toLowerCase() || "";
      const telefone = f.telefone || "";
      const id = f.id || "";

      if (razao.includes(pesquisa) || cnpj.includes(pesquisa) || email.includes(pesquisa) || telefone.includes(pesquisa) || id.includes(pesquisa)) {
        html += `
          <tr>
            <td>${f.razao}</td>
            <td>${f.cnpj}</td>
            <td>${f.email}</td>
            <td>${f.telefone}</td>
            <td>
              <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${idDoc}"><i class="fas fa-edit"></i> Editar</button>
              <button class="btn btn-sm btn-danger btn-excluir" data-id="${idDoc}"><i class="fas fa-trash-alt"></i> Excluir</button>
            </td>
          </tr>
        `;
      }
    });

    tabelaFornecedores.innerHTML = html || `<tr><td colspan="5" class="text-center text-muted">Nenhum fornecedor encontrado.</td></tr>`;

    // Botões de exclusão
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

    // Botões de edição
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("button").dataset.id;
        const snapshot = await getDocs(fornecedoresRef);
        snapshot.forEach(docItem => {
          if (docItem.id === id) {
            const f = docItem.data();
            document.getElementById("fornId").value = f.id;
            document.getElementById("fornRazao").value = f.razao;
            document.getElementById("fornCnpj").value = f.cnpj;
            document.getElementById("fornEmail").value = f.email;
            document.getElementById("fornTelefone").value = f.telefone;
            fornecedorEditando = id;

            const modal = new bootstrap.Modal(document.getElementById("modalCadastroFornecedor"));
            modal.show();
          }
        });
      });
    });

  } catch (erro) {
    console.error("Erro ao listar fornecedores:", erro);
    tabelaFornecedores.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar fornecedores.</td></tr>`;
  }
}

// Eventos
formFornecedor.addEventListener("submit", salvarFornecedor);
btnSalvarFornecedor.addEventListener("click", salvarFornecedor);
inputPesquisa.addEventListener("input", listarFornecedores);

// Listar fornecedores ao carregar página
document.addEventListener("DOMContentLoaded", listarFornecedores);
