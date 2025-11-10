// Importa os módulos necessários do Firebase
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referência para a coleção de fornecedores
const fornecedoresRef = collection(db, "fornecedores");

// Elementos do formulário
const formFornecedor = document.getElementById("formFornecedor");
const tabelaFornecedores = document.getElementById("tabelaFornecedores");
const btnSalvarFornecedor = document.getElementById("btnSalvarFornecedor");
const inputPesquisa = document.querySelector("input[placeholder='Pesquisar fornecedores...']");

// Variável para controle de edição
let fornecedorEditando = null;

// Formata CNPJ
function formatarCnpj(cnpj) {
  if (!cnpj) return "";
  const cnpjLimpo = cnpj.replace(/\D/g, "").slice(0, 14);
  return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// Formata telefone
function formatarTelefone(telefone) {
  if (!telefone) return "";
  const telLimpo = telefone.replace(/\D/g, "").slice(0, 11);
  if (telLimpo.length === 11) {
    return telLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (telLimpo.length === 10) {
    return telLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return telLimpo;
}

// Validação do formulário
function validarCampos(fornecedor) {
  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fornecedor.email)) {
    alert("Digite um e-mail válido!");
    return false;
  }

  // CNPJ
  const cnpjLimpo = fornecedor.cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) {
    alert("CNPJ deve ter 14 números!");
    return false;
  }
  fornecedor.cnpj = cnpjLimpo;

  // Telefone
  const telLimpo = fornecedor.telefone.replace(/\D/g, "");
  if (telLimpo.length < 10 || telLimpo.length > 11) {
    alert("Telefone deve ter 10 ou 11 números!");
    return false;
  }
  fornecedor.telefone = telLimpo;

  // ID
  if (!fornecedor.id || typeof fornecedor.id !== "string") {
    alert("ID inválido!");
    return false;
  }

  return true;
}

// Gera ID automático no formato F001, F002...
async function gerarIdAutomatico() {
  const snapshot = await getDocs(fornecedoresRef);
  let maxId = 0;
  snapshot.forEach(docItem => {
    const data = docItem.data();
    if (data && data.id) {
      const numero = parseInt(data.id.replace("F", ""));
      if (!isNaN(numero) && numero > maxId) maxId = numero;
    }
  });
  const novoId = "F" + String(maxId + 1).padStart(3, "0");
  return novoId;
}

// Salvar ou editar fornecedor
async function salvarFornecedor(e) {
  e.preventDefault();

  const fornecedor = {
    id: document.getElementById("fornId").value.trim(),
    razao: document.getElementById("fornRazao").value.trim(),
    cnpj: document.getElementById("fornCnpj").value.trim(),
    email: document.getElementById("fornEmail").value.trim(),
    telefone: document.getElementById("fornTelefone").value.trim()
  };

  // Se não estiver editando, gera ID automático
  if (!fornecedorEditando) {
    fornecedor.id = await gerarIdAutomatico();
    document.getElementById("fornId").value = fornecedor.id;
  }

  if (!validarCampos(fornecedor)) return;

  try {
    // Verifica duplicidade
    const snapshot = await getDocs(fornecedoresRef);
    let idDuplicado = false;
    snapshot.forEach(docItem => {
      const data = docItem.data();
      if (!fornecedorEditando && data.id === fornecedor.id) idDuplicado = true;
    });
    if (idDuplicado) {
      alert("ID já existe! Use outro.");
      return;
    }

    if (fornecedorEditando) {
      await updateDoc(doc(db, "fornecedores", fornecedorEditando), fornecedor);
      fornecedorEditando = null;
    } else {
      await addDoc(fornecedoresRef, fornecedor);
    }

    formFornecedor.reset();
    document.getElementById("fornId").value = "";
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor"));
    modal.hide();
    listarFornecedores();
  } catch (err) {
    console.error("Erro ao salvar fornecedor:", err);
    alert("Erro ao salvar fornecedor!");
  }
}

// Listar fornecedores
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Carregando...</td></tr>`;
  try {
    const snapshot = await getDocs(fornecedoresRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let fornecedores = [];

    snapshot.forEach(docItem => {
      const f = docItem.data();
      if (!f) return;
      if (
        (f.razao && f.razao.toLowerCase().includes(pesquisa)) ||
        (f.cnpj && f.cnpj.includes(pesquisa)) ||
        (f.email && f.email.toLowerCase().includes(pesquisa)) ||
        (f.telefone && f.telefone.includes(pesquisa)) ||
        (f.id && f.id.toLowerCase().includes(pesquisa))
      ) {
        fornecedores.push({ ...f, docId: docItem.id });
      }
    });

    // Ordena pelo ID
    fornecedores.sort((a, b) => parseInt(a.id.replace("F", "")) - parseInt(b.id.replace("F", "")));

    let html = fornecedores.map(f => `
      <tr>
        <td>${f.id}</td>
        <td>${f.razao}</td>
        <td>${formatarCnpj(f.cnpj)}</td>
        <td>${f.email}</td>
        <td>${formatarTelefone(f.telefone)}</td>
        <td>
          <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${f.docId}"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn btn-sm btn-danger btn-excluir" data-id="${f.docId}"><i class="fas fa-trash-alt"></i> Excluir</button>
        </td>
      </tr>
    `).join("");

    tabelaFornecedores.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">Nenhum fornecedor encontrado.</td></tr>`;

    // Excluir
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async e => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Deseja excluir este fornecedor?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

    // Editar
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", async e => {
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

  } catch (err) {
    console.error("Erro ao listar fornecedores:", err);
    tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar fornecedores.</td></tr>`;
  }
}

// Eventos
formFornecedor.addEventListener("submit", salvarFornecedor);
btnSalvarFornecedor.addEventListener("click", salvarFornecedor);
inputPesquisa.addEventListener("input", listarFornecedores);
document.addEventListener("DOMContentLoaded", listarFornecedores);
