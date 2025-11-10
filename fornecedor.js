import { db } from "./firebase-config.js";
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const fornecedoresRef = collection(db, "fornecedores");

const formFornecedor = document.getElementById("formFornecedor");
const tabelaFornecedores = document.getElementById("tabelaFornecedores");
const btnSalvarFornecedor = document.getElementById("btnSalvarFornecedor");
const inputPesquisa = document.getElementById("pesquisaFornecedor");

let fornecedorEditando = null;

// ===================== Formatação =====================
function formatarCnpj(cnpj) {
  if (!cnpj) return "";
  const v = cnpj.replace(/\D/g, "").padStart(14, "0").slice(0,14);
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarTelefone(tel) {
  if (!tel) return "";
  const v = tel.replace(/\D/g, "").slice(0,11);
  if (v.length === 11) return v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (v.length === 10) return v.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return v;
}

// ===================== Validação =====================
function validarCampos(fornecedor) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fornecedor.email)) {
    alert("Digite um e-mail válido!");
    return false;
  }

  const cnpjLimpo = fornecedor.cnpj.replace(/\D/g, "").slice(0,14);
  if (cnpjLimpo.length !== 14) {
    alert("CNPJ deve ter 14 números!");
    return false;
  }
  fornecedor.cnpj = cnpjLimpo;

  const telefoneLimpo = fornecedor.telefone.replace(/\D/g, "").slice(0,11);
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    alert("Telefone deve ter 10 ou 11 números!");
    return false;
  }
  fornecedor.telefone = telefoneLimpo;

  if (!fornecedor.id) {
    alert("ID inválido!");
    return false;
  }

  return true;
}

// ===================== Gerar ID automático =====================
async function gerarIdAutomatico() {
  const snapshot = await getDocs(fornecedoresRef);
  let ids = [];
  snapshot.forEach(docItem => {
    const data = docItem.data();
    if (data.id) ids.push(parseInt(data.id.replace("F", "")));
  });
  const maior = ids.length ? Math.max(...ids) : 0;
  return "F" + String(maior + 1).padStart(3, "0");
}

// ===================== Salvar =====================
async function salvarFornecedor(event) {
  event.preventDefault();

  const fornecedor = {
    id: document.getElementById("fornId").value.trim() || await gerarIdAutomatico(),
    razao: document.getElementById("fornRazao").value.trim(),
    cnpj: document.getElementById("fornCnpj").value.trim(),
    email: document.getElementById("fornEmail").value.trim(),
    telefone: document.getElementById("fornTelefone").value.trim()
  };

  if (!fornecedor.razao || !fornecedor.cnpj || !fornecedor.email || !fornecedor.telefone) {
    alert("Preencha todos os campos!");
    return;
  }

  if (!validarCampos(fornecedor)) return;

  try {
    if (!fornecedorEditando) {
      // Verifica duplicidade
      const snapshot = await getDocs(fornecedoresRef);
      let idDuplicado = false;
      snapshot.forEach(docItem => {
        const data = docItem.data();
        if (data.id === fornecedor.id) idDuplicado = true;
      });
      if (idDuplicado) {
        alert("ID já existe! Escolha outro.");
        return;
      }

      await addDoc(fornecedoresRef, fornecedor);
    } else {
      await updateDoc(doc(db, "fornecedores", fornecedorEditando), fornecedor);
      fornecedorEditando = null;
    }

    // Fechar modal e resetar formulário
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor"));
    modal.hide();
    formFornecedor.reset();
    document.getElementById("fornId").value = ""; // Limpar ID também
    listarFornecedores();
  } catch (erro) {
    console.error("Erro ao salvar fornecedor:", erro);
    alert("Erro ao salvar fornecedor!");
  }
}

// ===================== Listar fornecedores =====================
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Carregando...</td></tr>`;
  try {
    const snapshot = await getDocs(fornecedoresRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let html = "";

    snapshot.forEach(docItem => {
      const f = docItem.data();
      const idDoc = docItem.id;
      if (!f) return;

      if (
        (f.razao && f.razao.toLowerCase().includes(pesquisa)) ||
        (f.cnpj && f.cnpj.includes(pesquisa)) ||
        (f.email && f.email.toLowerCase().includes(pesquisa)) ||
        (f.telefone && f.telefone.includes(pesquisa)) ||
        (f.id && f.id.toLowerCase().includes(pesquisa))
      ) {
        html += `
          <tr>
            <td>${f.id}</td>
            <td>${f.razao}</td>
            <td>${formatarCnpj(f.cnpj)}</td>
            <td>${f.email}</td>
            <td>${formatarTelefone(f.telefone)}</td>
            <td>
              <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${idDoc}"><i class="fas fa-edit"></i> Editar</button>
              <button class="btn btn-sm btn-danger btn-excluir" data-id="${idDoc}"><i class="fas fa-trash-alt"></i> Excluir</button>
            </td>
          </tr>
        `;
      }
    });

    tabelaFornecedores.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">Nenhum fornecedor encontrado.</td></tr>`;

    // Botões excluir
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

    // Botões editar
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
    tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar fornecedores.</td></tr>`;
  }
}

// ===================== Eventos =====================
formFornecedor.addEventListener("submit", salvarFornecedor);
btnSalvarFornecedor.addEventListener("click", salvarFornecedor);
inputPesquisa.addEventListener("input", listarFornecedores);
document.addEventListener("DOMContentLoaded", listarFornecedores);

// ===================== Limitar input no modal =====================
document.getElementById("fornCnpj").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\D/g,"").slice(0,14);
});

document.getElementById("fornTelefone").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\D/g,"").slice(0,11);
});
