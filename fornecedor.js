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

// Função para gerar ID automático F001, F002...
async function gerarIdAutomatico() {
  const snapshot = await getDocs(fornecedoresRef);
  let maior = 0;
  snapshot.forEach(docItem => {
    const data = docItem.data();
    if (data.id) {
      const num = parseInt(data.id.replace("F", ""));
      if (num > maior) maior = num;
    }
  });
  const novoId = "F" + String(maior + 1).padStart(3, "0");
  return novoId;
}

// Máscara de CNPJ
const cnpjInput = document.getElementById("fornCnpj");
cnpjInput.addEventListener("input", () => {
  let v = cnpjInput.value.replace(/\D/g, "").slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, "$1.$2");
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
  v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
  v = v.replace(/(\d{4})(\d)/, "$1-$2");
  cnpjInput.value = v;
});

// Máscara de telefone
const telefoneInput = document.getElementById("fornTelefone");
telefoneInput.addEventListener("input", () => {
  let v = telefoneInput.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else {
    v = v.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  telefoneInput.value = v;
});

// Função para validar campos
function validarCampos(fornecedor) {
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fornecedor.email)) {
    alert("Digite um e-mail válido!");
    return false;
  }

  // Validar CNPJ
  const cnpjLimpo = fornecedor.cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) {
    alert("CNPJ deve ter 14 números!");
    return false;
  }
  fornecedor.cnpj = cnpjLimpo;

  // Validar telefone
  const telefoneLimpo = fornecedor.telefone.replace(/\D/g, "");
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    alert("Telefone deve ter 10 ou 11 números!");
    return false;
  }
  fornecedor.telefone = telefoneLimpo;

  return true;
}

// Salvar ou editar fornecedor
async function salvarFornecedor(event) {
  event.preventDefault();

  let fornecedor = {
    id: fornecedorEditando ? document.getElementById("fornId").value : await gerarIdAutomatico(),
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
    // Verificar ID duplicado
    const snapshot = await getDocs(fornecedoresRef);
    let idDuplicado = false;
    snapshot.forEach(docItem => {
      const data = docItem.data();
      if (!fornecedorEditando && data.id === fornecedor.id) idDuplicado = true;
    });
    if (idDuplicado) {
      alert("ID já existe! Escolha outro.");
      return;
    }

    if (fornecedorEditando) {
      await updateDoc(doc(db, "fornecedores", fornecedorEditando), fornecedor);
      fornecedorEditando = null;
    } else {
      await addDoc(fornecedoresRef, fornecedor);
    }

    // Fechar modal e reset
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor"));
    modal.hide();
    formFornecedor.reset();
    listarFornecedores();
  } catch (erro) {
    console.error("Erro ao salvar fornecedor:", erro);
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

      const razao = f.razao || "";
      const email = f.email || "";
      const cnpj = f.cnpj || "";
      const telefone = f.telefone || "";
      const id = f.id || "";

      if (
        razao.toLowerCase().includes(pesquisa) ||
        cnpj.includes(pesquisa) ||
        email.toLowerCase().includes(pesquisa) ||
        telefone.includes(pesquisa) ||
        id.includes(pesquisa)
      ) {
        html += `
          <tr>
            <td>${id}</td>
            <td>${razao}</td>
            <td>${cnpj}</td>
            <td>${email}</td>
            <td>${telefone}</td>
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
      btn.addEventListener("click", async e => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Deseja excluir este fornecedor?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

    // Botões editar
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

  } catch (erro) {
    console.error("Erro ao listar fornecedores:", erro);
    tabelaFornecedores.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar fornecedores.</td></tr>`;
  }
}

// Eventos
formFornecedor.addEventListener("submit", salvarFornecedor);
btnSalvarFornecedor.addEventListener("click", salvarFornecedor);
inputPesquisa.addEventListener("input", listarFornecedores);

// Carrega fornecedores ao iniciar
document.addEventListener("DOMContentLoaded", listarFornecedores);
