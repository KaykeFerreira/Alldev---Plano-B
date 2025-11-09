import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referência da coleção
const fornecedoresRef = collection(db, "fornecedores");

// Campos
const tabela = document.getElementById("tabela-fornecedores");
const pesquisa = document.getElementById("pesquisaFornecedor");
const form = document.getElementById("form-fornecedor");
const btnSalvar = document.getElementById("btnSalvarFornecedor");

let idEditando = null;

// Função para aplicar máscara de CNPJ
function mascaraCNPJ(valor) {
  return valor
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
}

// Máscara para telefone
function mascaraTelefone(valor) {
  return valor
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 15);
}

// Validação simples de email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Carregar fornecedores
async function listarFornecedores(filtro = "") {
  tabela.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;
  const snap = await getDocs(fornecedoresRef);
  let html = "";

  snap.forEach((docItem) => {
    const f = docItem.data();
    if (
      f.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      f.cnpj.toLowerCase().includes(filtro.toLowerCase())
    ) {
      html += `
        <tr>
          <td>${f.nome}</td>
          <td>${f.cnpj}</td>
          <td>${f.telefone}</td>
          <td>${f.email}</td>
          <td>
            <button class="btn btn-sm btn-info me-2" onclick="editarFornecedor('${docItem.id}', '${f.nome}', '${f.cnpj}', '${f.telefone}', '${f.email}')">Editar</button>
          </td>
        </tr>`;
    }
  });

  tabela.innerHTML =
    html ||
    `<tr><td colspan="5" class="text-center text-muted">Nenhum fornecedor encontrado.</td></tr>`;
}

// Evento de pesquisa
pesquisa.addEventListener("input", (e) => listarFornecedores(e.target.value));

// Evento de input (máscaras)
document.getElementById("cnpj").addEventListener("input", (e) => {
  e.target.value = mascaraCNPJ(e.target.value);
});
document.getElementById("telefone").addEventListener("input", (e) => {
  e.target.value = mascaraTelefone(e.target.value);
});

// Cadastrar ou editar fornecedor
btnSalvar.addEventListener("click", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cnpj = document.getElementById("cnpj").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!nome || !cnpj || !telefone || !email) {
    alert("⚠️ Preencha todos os campos obrigatórios!");
    return;
  }

  if (!validarEmail(email)) {
    alert("❌ E-mail inválido!");
    return;
  }

  try {
    if (idEditando) {
      const docRef = doc(db, "fornecedores", idEditando);
      await updateDoc(docRef, { nome, cnpj, telefone, email });
      alert("✏️ Fornecedor atualizado com sucesso!");
      idEditando = null;
    } else {
      await addDoc(fornecedoresRef, { nome, cnpj, telefone, email });
      alert("✅ Fornecedor cadastrado com sucesso!");
    }

    form.reset();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modalCadastroFornecedor")
    );
    modal.hide();

    listarFornecedores();
  } catch (erro) {
    console.error("Erro ao salvar fornecedor:", erro);
    alert("❌ Erro ao salvar fornecedor. Veja o console.");
  }
});

// Tornar função de edição global
window.editarFornecedor = (id, nome, cnpj, telefone, email) => {
  idEditando = id;
  document.getElementById("nome").value = nome;
  document.getElementById("cnpj").value = cnpj;
  document.getElementById("telefone").value = telefone;
  document.getElementById("email").value = email;

  const modal = new bootstrap.Modal(
    document.getElementById("modalCadastroFornecedor")
  );
  modal.show();
  document.getElementById("btnSalvarFornecedor").textContent = "Salvar Alterações";
};

// Carregar ao iniciar
document.addEventListener("DOMContentLoaded", listarFornecedores);
