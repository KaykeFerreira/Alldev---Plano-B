import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const fornecedoresRef = collection(db, "fornecedores");

const formFornecedor = document.getElementById("formFornecedor");
const tabelaFornecedores = document.getElementById("tabelaFornecedores");
const btnSalvarFornecedor = document.getElementById("btnSalvarFornecedor");
const inputPesquisa = document.getElementById("pesquisaFornecedor");

let fornecedorEditando = null;

// Validação
function validarCampos(fornecedor) {
  if (!fornecedor.id || isNaN(fornecedor.id)) { alert("ID inválido!"); return false; }

  if (!fornecedor.razao) { alert("Razão Social é obrigatória!"); return false; }

  const cnpjLimpo = fornecedor.cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) { alert("CNPJ deve ter 14 números!"); return false; }
  fornecedor.cnpj = cnpjLimpo;

  const telLimpo = fornecedor.telefone.replace(/\D/g, "");
  if (telLimpo.length < 10 || telLimpo.length > 11) { alert("Telefone deve ter 10 ou 11 números!"); return false; }
  fornecedor.telefone = telLimpo;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fornecedor.email)) { alert("E-mail inválido!"); return false; }

  return true;
}

// Salvar ou editar
async function salvarFornecedor() {
  const fornecedor = {
    id: document.getElementById("fornId").value.trim(),
    razao: document.getElementById("fornRazao").value.trim(),
    cnpj: document.getElementById("fornCnpj").value.trim(),
    telefone: document.getElementById("fornTelefone").value.trim(),
    email: document.getElementById("fornEmail").value.trim()
  };

  if (!validarCampos(fornecedor)) return;

  try {
    const snapshot = await getDocs(fornecedoresRef);
    let idDuplicado = false;

    snapshot.forEach(docItem => {
      const f = docItem.data();
      if (!fornecedorEditando && f.id === fornecedor.id) idDuplicado = true;
      if (fornecedorEditando && f.id === fornecedor.id && docItem.id !== fornecedorEditando) idDuplicado = true;
    });

    if (idDuplicado) { alert("ID já existe!"); return; }

    if (fornecedorEditando) {
      await updateDoc(doc(db, "fornecedores", fornecedorEditando), fornecedor);
      fornecedorEditando = null;
    } else {
      await addDoc(fornecedoresRef, fornecedor);
    }

    bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor")).hide();
    formFornecedor.reset();
    listarFornecedores();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao salvar fornecedor!");
  }
}

// Listar fornecedores
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Carregando...</td></tr>`;
  try {
    const snapshot = await getDocs(fornecedoresRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let html = "";

    snapshot.forEach(docItem => {
      const f = docItem.data();
      const idDoc = docItem.id;

      if (
        (f.id?.toLowerCase().includes(pesquisa)) ||
        (f.razao?.toLowerCase().includes(pesquisa)) ||
        (f.cnpj?.includes(pesquisa)) ||
        (f.telefone?.includes(pesquisa)) ||
        (f.email?.toLowerCase().includes(pesquisa))
      ) {
        html += `
          <tr>
            <td>${f.id}</td>
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

    tabelaFornecedores.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">Nenhum fornecedor encontrado.</td></tr>`;

    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async e => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Deseja realmente excluir?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

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
            document.getElementById("fornTelefone").value = f.telefone;
            document.getElementById("fornEmail").value = f.email;
            fornecedorEditando = id;
            new bootstrap.Modal(document.getElementById("modalCadastroFornecedor")).show();
          }
        });
      });
    });

  } catch (erro) {
    console.error("Erro ao listar fornecedores:", erro);
    tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar fornecedores.</td></tr>`;
  }
}

// Eventos
btnSalvarFornecedor.addEventListener("click", salvarFornecedor);
inputPesquisa.addEventListener("input", listarFornecedores);
document.addEventListener("DOMContentLoaded", listarFornecedores);
