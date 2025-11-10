// Importa Firebase
import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referência da coleção clientes
const clientesRef = collection(db, "clientes");

// Elementos
const formCliente = document.getElementById("formCliente");
const tabelaClientes = document.querySelector("#tableClientes tbody");
const btnSalvarCliente = document.getElementById("btnSalvarCliente");
const inputPesquisa = document.querySelector('input[placeholder="Pesquisar clientes..."]');

// Variável de edição
let clienteEditando = null;

// Função de validação
function validarCampos(cliente) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cliente.email)) {
    alert("Digite um e-mail válido!");
    return false;
  }

  const telefoneLimpo = cliente.telefone.replace(/\D/g, "");
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    alert("Telefone deve ter 10 ou 11 números!");
    return false;
  }
  cliente.telefone = telefoneLimpo;

  if (!cliente.id || isNaN(cliente.id)) {
    alert("Digite um ID válido!");
    return false;
  }

  return true;
}

// Função para salvar ou editar cliente
async function salvarCliente() {
  const cliente = {
    id: document.getElementById("clienteId")?.value.trim() || "",
    nome: document.getElementById("nome").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    email: document.getElementById("email").value.trim(),
    endereco: document.getElementById("endereco").value.trim()
  };

  if (!cliente.nome || !cliente.telefone || !cliente.email || !cliente.id) {
    alert("Preencha todos os campos!");
    return;
  }

  if (!validarCampos(cliente)) return;

  try {
    const snapshot = await getDocs(clientesRef);
    let idDuplicado = false;

    snapshot.forEach(docItem => {
      const data = docItem.data();
      if (!clienteEditando && data.id === cliente.id) {
        idDuplicado = true;
      }
    });

    if (idDuplicado) {
      alert("ID já existe! Escolha outro ID.");
      return;
    }

    if (clienteEditando) {
      await updateDoc(doc(db, "clientes", clienteEditando), cliente);
      clienteEditando = null;
    } else {
      await addDoc(clientesRef, cliente);
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroCliente"));
    modal.hide();
    formCliente.reset();
    carregarClientes();
  } catch (erro) {
    console.error("Erro ao salvar cliente:", erro);
    alert("Erro ao salvar cliente!");
  }
}

// Carregar clientes
async function carregarClientes() {
  tabelaClientes.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;
  try {
    const snapshot = await getDocs(clientesRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let html = "";

    snapshot.forEach(docItem => {
      const c = docItem.data();
      const idDoc = docItem.id;

      if (
        c.id.includes(pesquisa) ||
        c.nome.toLowerCase().includes(pesquisa) ||
        c.telefone.includes(pesquisa) ||
        c.email.toLowerCase().includes(pesquisa) ||
        c.endereco.toLowerCase().includes(pesquisa)
      ) {
        html += `
          <tr>
            <td>${c.nome}</td>
            <td>${c.telefone}</td>
            <td>${c.email}</td>
            <td>${c.endereco}</td>
            <td>
              <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${idDoc}"><i class="fas fa-edit"></i> Editar</button>
              <button class="btn btn-sm btn-danger btn-excluir" data-id="${idDoc}"><i class="fas fa-trash-alt"></i> Excluir</button>
            </td>
          </tr>
        `;
      }
    });

    tabelaClientes.innerHTML = html || `<tr><td colspan="5" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>`;

    // Exclusão
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("button").dataset.id;
        if (confirm("Deseja excluir este cliente?")) {
          await deleteDoc(doc(db, "clientes", id));
          carregarClientes();
        }
      });
    });

    // Edição
    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.closest("button").dataset.id;
        const snapshot = await getDocs(clientesRef);
        snapshot.forEach(docItem => {
          if (docItem.id === id) {
            const c = docItem.data();
            // Adiciona campo ID se não existir
            if (!document.getElementById("clienteId")) {
              const inputId = document.createElement("input");
              inputId.type = "text";
              inputId.id = "clienteId";
              inputId.value = c.id;
              inputId.className = "form-control mb-3";
              inputId.placeholder = "ID do Cliente";
              formCliente.prepend(inputId);
            } else {
              document.getElementById("clienteId").value = c.id;
            }

            document.getElementById("nome").value = c.nome;
            document.getElementById("telefone").value = c.telefone;
            document.getElementById("email").value = c.email;
            document.getElementById("endereco").value = c.endereco;
            clienteEditando = id;

            const modal = new bootstrap.Modal(document.getElementById("modalCadastroCliente"));
            modal.show();
          }
        });
      });
    });

  } catch (erro) {
    console.error("Erro ao carregar clientes:", erro);
    tabelaClientes.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar clientes.</td></tr>`;
  }
}

// Eventos
btnSalvarCliente.addEventListener("click", salvarCliente);
inputPesquisa.addEventListener("input", carregarClientes);

// Carregar ao abrir página
document.addEventListener("DOMContentLoaded", carregarClientes);
