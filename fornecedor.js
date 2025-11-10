import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const fornecedoresRef = collection(db, "fornecedores");

const tabelaFornecedores = document.getElementById("tabelaFornecedores");
const btnSalvarFornecedor = document.getElementById("btnSalvarFornecedor");
const inputPesquisa = document.getElementById("pesquisaFornecedor");

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

  return true;
}

// Função para aplicar máscara
function aplicarMascara() {
  const cnpjInput = document.getElementById("fornCnpj");
  const telefoneInput = document.getElementById("fornTelefone");

  cnpjInput.addEventListener("input", () => {
    let v = cnpjInput.value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
    cnpjInput.value = v;
  });

  telefoneInput.addEventListener("input", () => {
    let v = telefoneInput.value.replace(/\D/g, "");
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else {
      v = v.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    }
    telefoneInput.value = v;
  });
}

// Função para gerar ID automático
async function gerarIdAutomatico() {
  const snapshot = await getDocs(fornecedoresRef);
  let maior = 0;
  snapshot.forEach(docItem => {
    const data = docItem.data();
    const num = parseInt(data.id.replace("F", ""), 10);
    if (num > maior) maior = num;
  });
  const novoId = "F" + String(maior + 1).padStart(3, "0");
  return novoId;
}

// Salvar fornecedor
async function salvarFornecedor(event) {
  event.preventDefault();

  const fornecedor = {
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
    if (fornecedorEditando) {
      await updateDoc(doc(db, "fornecedores", fornecedorEditando), fornecedor);
      fornecedorEditando = null;
    } else {
      await addDoc(fornecedoresRef, fornecedor);
    }

    bootstrap.Modal.getInstance(document.getElementById("modalCadastroFornecedor")).hide();
    document.getElementById("formFornecedor").reset();
    listarFornecedores();
  } catch (erro) {
    console.error("Erro ao salvar fornecedor:", erro);
    alert("Erro ao salvar fornecedor!");
  }
}

// Listar fornecedores
async function listarFornecedores() {
  tabelaFornecedores.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;
  try {
    const snapshot = await getDocs(fornecedoresRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let html = "";

    snapshot.forEach(docItem => {
      const f = docItem.data();
      const idDoc = docItem.id;

      if (
        f.razao.toLowerCase().includes(pesquisa) ||
        f.cnpj.includes(pesquisa) ||
        f.email.toLowerCase().includes(pesquisa) ||
        f.telefone.includes(pesquisa) ||
        f.id.includes(pesquisa)
      ) {
        html += `<tr>
          <td>${f.id}</td>
          <td>${f.razao}</td>
          <td>${f.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</td>
          <td>${f.telefone.length === 11 ? f.telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : f.telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3")}</td>
          <td>${f.email}</td>
          <td>
            <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${idDoc}"><i class="fas fa-edit"></i> Editar</button>
            <button class="btn btn-sm btn-danger btn-excluir" data-id="${idDoc}"><i class="fas fa-trash-alt"></i> Excluir</button>
          </td>
        </tr>`;
      }
    });

    tabelaFornecedores.innerHTML = html || `<tr><td colspan="5" class="text-center text-muted">Nenhum fornecedor encontrado.</td></tr>`;

    // Botões de exclusão
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async e => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
          await deleteDoc(doc(db, "fornecedores", id));
          listarFornecedores();
        }
      });
    });

    // Botões de edição
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", async e => {
        const id = e.target.closest("button").dataset.id;
        const snapshot = await getDocs(fornecedoresRef);
        snapshot.forEach(docItem => {
          if (docItem.id === id) {
            const f = docItem.data();
            document.getElementById("fornId").value = f.id;
            document.getElementById("fornRazao").value = f.razao;
            document.getElementById("fornCnpj").value = f.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
            document.getElementById("fornTelefone").value = f.telefone.length === 11 ? f.telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : f.telefone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
            document.getElementById("fornEmail").value = f.email;
            fornecedorEditando = id;

            new bootstrap.Modal(document.getElementById("modalCadastroFornecedor")).show();
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
btnSalvarFornecedor.addEventListener("click", salvarFornecedor);
inputPesquisa.addEventListener("input", listarFornecedores);
document.addEventListener("DOMContentLoaded", () => {
  aplicarMascara();
  listarFornecedores();
});
