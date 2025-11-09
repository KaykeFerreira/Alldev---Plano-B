// Importa módulos do Firebase
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referência da coleção de fornecedores
const fornecedoresRef = collection(db, "fornecedores");

// Elementos do DOM
const formFornecedor = document.getElementById("formFornecedor");
const tabelaFornecedores = document.getElementById("tabelaFornecedores");
const btnSalvarFornecedor = document.getElementById("btnSalvarFornecedor");
const pesquisaFornecedor = document.getElementById("pesquisaFornecedor");

// ID do fornecedor em edição
let editandoId = null;

// Função para validar e-mail
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Máscara de CNPJ
document.getElementById("fornCnpj").addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "").slice(0, 14);
  value = value.replace(/^(\d{2})(\d)/, "$1.$2")
               .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
               .replace(/\.(\d{3})(\d)/, ".$1/$2")
               .replace(/(\d{4})(\d)/, "$1-$2");
  e.target.value = value;
});

// Máscara de telefone
document.getElementById("fornTelefone").addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "").slice(0, 11);
  if (value.length <= 10) {
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
  } else {
    value = value.replace(/^(\d{2})(\d{5})(\d{0,4})$/, "($1) $2-$3");
  }
  e.target.value = value;
});

// Função para salvar ou editar fornecedor
btnSalvarFornecedor.addEventListener("click", async () => {
  const nome = document.getElementById("fornRazao").value.trim();
  const cnpj = document.getElementById("fornCnpj").value.trim();
  const telefone = document.getElementById("fornTelefone").value.trim();
  const email = document.getElementById("fornEmail").value.trim();

  // Valida campos
  if (!nome || !cnpj || !telefone || !email) {
    alert("⚠️ Preencha todos os campos!");
    return;
  }
  if (!validarEmail(email)) {
    alert("❌ E-mail inválido!");
    return;
  }

  try {
    if (editandoId) {
      await updateDoc(doc(db, "fornecedores", editandoId), { nome, cnpj, telefone, email });
      alert("✅ Fornecedor atualizado com sucesso!");
      editandoId = null;
    } else {
      await addDoc(fornecedoresRef, { nome, cnpj, telefone, email, criadoEm: new Date() });
      alert("✅ Fornecedor cadastrado com sucesso!");
    }

    // Reset e fechamento do modal
    formFornecedor.reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor"));
    modal.hide();

    listarFornecedores();
  } catch (erro) {
    console.error("Erro ao salvar fornecedor:", erro);
    alert("❌ Erro ao salvar fornecedor!");
  }
});

// Função para listar fornecedores
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>Carregando...</td></tr>";

  try {
    const snapshot = await getDocs(fornecedoresRef);
    let html = "";

    snapshot.forEach((docItem) => {
      const f = docItem.data();
      html += `
        <tr>
          <td>${f.nome}</td>
          <td>${f.cnpj}</td>
          <td>${f.email}</td>
          <td>${f.telefone}</td>
          <td>
            <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${docItem.id}">Editar</button>
            <button class="btn btn-sm btn-danger btn-excluir" data-id="${docItem.id}">Excluir</button>
          </td>
        </tr>
      `;
    });

    tabelaFornecedores.innerHTML = html || "<tr><td colspan='5' class='text-center text-muted'>Nenhum fornecedor encontrado.</td></tr>";

    // Eventos de exclusão
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

    // Eventos de edição
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        const fData = snapshot.docs.find(d => d.id === id).data();
        document.getElementById("fornRazao").value = fData.nome;
        document.getElementById("fornCnpj").value = fData.cnpj;
        document.getElementById("fornTelefone").value = fData.telefone;
        document.getElementById("fornEmail").value = fData.email;
        editandoId = id;

        const modal = new bootstrap.Modal(document.getElementById("modalCadastroFornecedor"));
        modal.show();
      });
    });

  } catch (erro) {
    console.error("Erro ao listar fornecedores:", erro);
    tabelaFornecedores.innerHTML = "<tr><td colspan='5' class='text-center text-danger'>Erro ao carregar fornecedores.</td></tr>";
  }
}

// Filtro de pesquisa
pesquisaFornecedor.addEventListener("input", () => {
  const filtro = pesquisaFornecedor.value.toLowerCase();
  Array.from(tabelaFornecedores.rows).forEach(row => {
    const nome = row.cells[0]?.textContent.toLowerCase();
    row.style.display = nome?.includes(filtro) ? "" : "none";
  });
});

// Inicializa lista ao carregar a página
document.addEventListener("DOMContentLoaded", listarFornecedores);
