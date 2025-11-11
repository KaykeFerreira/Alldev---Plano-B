import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clientesRef = collection(db, "clientes");
const produtosRef = collection(db, "produtos");
const vendasRef = collection(db, "vendas");

// ELEMENTOS
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const itensTable = document.getElementById("itens-table");
const valorTotalInput = document.getElementById("valor-total");
const dataVendaInput = document.getElementById("data-venda");

// === CARREGAR CLIENTES ===
async function carregarClientes() {
  selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
  const snapshot = await getDocs(clientesRef);
  snapshot.forEach((docSnap) => {
    const c = docSnap.data();
    selectCliente.innerHTML += `<option value="${docSnap.id}">${c.nome}</option>`;
  });
}

// === CARREGAR PRODUTOS ===
async function carregarProdutos(select) {
  select.innerHTML = `<option value="">Selecione um produto</option>`;
  const snapshot = await getDocs(produtosRef);
  snapshot.forEach((docSnap) => {
    const p = docSnap.data();
    select.innerHTML += `
      <option value="${docSnap.id}" data-preco="${p.preco || 0}">
        ${p.nome} (${p.marca}) - Estoque: ${p.quantidade}
      </option>`;
  });
}

// === ADICIONAR ITEM ===
async function adicionarItem() {
  const tbody = itensTable.querySelector("tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="form-select produto-select bg-dark text-light border-secondary"></select></td>
    <td><input type="number" min="1" value="1" class="form-control quantidade-input bg-dark text-light border-secondary"></td>
    <td><input type="text" class="form-control preco-input bg-dark text-light border-secondary" readonly></td>
    <td class="subtotal">R$ 0,00</td>
    <td><button class="btn btn-danger btn-sm btn-remove-item">X</button></td>`;
  tbody.appendChild(tr);

  const produtoSelect = tr.querySelector(".produto-select");
  await carregarProdutos(produtoSelect);

  produtoSelect.addEventListener("change", () => {
    const preco = Number(produtoSelect.selectedOptions[0]?.dataset.preco || 0);
    tr.querySelector(".preco-input").value = preco.toFixed(2);
    atualizarSubtotal(tr);
  });

  tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove();
    calcularTotal();
  });
}

// === ATUALIZAR SUBTOTAL ===
function atualizarSubtotal(tr) {
  const qtd = Number(tr.querySelector(".quantidade-input").value);
  const preco = Number(tr.querySelector(".preco-input").value);
  const subtotal = qtd * preco;
  tr.querySelector(".subtotal").textContent = `R$ ${subtotal.toFixed(2)}`;
  calcularTotal();
}

// === CALCULAR TOTAL ===
function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach((tr) => {
    const valor = Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    total += valor;
  });
  valorTotalInput.value = `R$ ${total.toFixed(2)}`;
}

// === GERAR ID DE VENDA ===
async function gerarIdVenda() {
  const snapshot = await getDocs(vendasRef);
  let maior = 0;
  snapshot.forEach((docSnap) => {
    const num = parseInt(docSnap.data().id?.replace(/\D/g, "")) || 0;
    if (num > maior) maior = num;
  });
  return "V" + String(maior + 1).padStart(3, "0");
}

// === FINALIZAR VENDA ===
async function finalizarVenda() {
  const clienteId = selectCliente.value;
  const status = selectStatus.value;
  const data = dataVendaInput.value;

  if (!clienteId) return alert("Selecione um cliente!");
  if (itensTable.querySelectorAll("tbody tr").length === 0) return alert("Adicione ao menos um item!");

  const itens = [];
  itensTable.querySelectorAll("tbody tr").forEach((tr) => {
    const produtoId = tr.querySelector(".produto-select").value;
    if (!produtoId) return;
    const qtd = Number(tr.querySelector(".quantidade-input").value);
    const preco = Number(tr.querySelector(".preco-input").value);
    itens.push({ produtoId, qtd, preco });
  });

  const total = Number(valorTotalInput.value.replace("R$ ", ""));

  const venda = {
    id: await gerarIdVenda(),
    cliente: clienteId,
    status,
    data,
    itens,
    total,
  };

  await addDoc(vendasRef, venda);
  alert("Venda cadastrada com sucesso!");
  carregarVendas();

  // Limpar modal
  itensTable.querySelector("tbody").innerHTML = "";
  valorTotalInput.value = "";
  document.querySelector("#modalCadastroVenda form")?.reset();
  const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroVenda"));
  modal.hide();
}

// === CARREGAR VENDAS ===
async function carregarVendas() {
  const tabela = document.querySelector("table.table tbody");
  tabela.innerHTML = `<tr><td colspan="6">Carregando...</td></tr>`;
  const snapshot = await getDocs(vendasRef);
  if (snapshot.empty) {
    tabela.innerHTML = `<tr><td colspan="6">Nenhuma venda</td></tr>`;
    return;
  }
  tabela.innerHTML = "";
  for (const docSnap of snapshot.docs) {
    const venda = docSnap.data();
    const clienteSnap = await getDoc(doc(db, "clientes", venda.cliente));
    const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Desconhecido";
    tabela.innerHTML += `
      <tr>
        <td>${venda.id}</td>
        <td>${clienteNome}</td>
        <td>${venda.data || "-"}</td>
        <td>${venda.status}</td>
        <td>R$ ${venda.total.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-info btn-detalhes" data-id="${docSnap.id}">Detalhes</button>
          <button class="btn btn-sm btn-danger btn-excluir" data-id="${docSnap.id}">Excluir</button>
        </td>
      </tr>`;
  }

  document.querySelectorAll(".btn-detalhes").forEach((btn) =>
    btn.addEventListener("click", exibirDetalhesVenda)
  );
  document.querySelectorAll(".btn-excluir").forEach((btn) =>
    btn.addEventListener("click", excluirVenda)
  );
}

// === DETALHES ===
async function exibirDetalhesVenda(e) {
  const id = e.currentTarget.dataset.id;
  const vendaDoc = await getDoc(doc(db, "vendas", id));
  if (!vendaDoc.exists()) return alert("Venda não encontrada!");

  const v = vendaDoc.data();
  const clienteSnap = await getDoc(doc(db, "clientes", v.cliente));
  const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Desconhecido";

  let detalhes = `<strong>ID:</strong> ${v.id}<br>
  <strong>Cliente:</strong> ${clienteNome}<br>
  <strong>Status:</strong> ${v.status}<br>
  <strong>Data:</strong> ${v.data}<br><br>
  <strong>Itens:</strong><br>`;

  for (const item of v.itens) {
    const prodSnap = await getDoc(doc(db, "produtos", item.produtoId));
    const produtoNome = prodSnap.exists() ? prodSnap.data().nome : "Produto removido";
    detalhes += `• ${produtoNome} — ${item.qtd} x R$ ${item.preco.toFixed(2)}<br>`;
  }

  detalhes += `<br><strong>Total:</strong> R$ ${v.total.toFixed(2)}`;

  document.getElementById("detalhes-body").innerHTML = detalhes;
  const modal = new bootstrap.Modal(document.getElementById("modalDetalhesVenda"));
  modal.show();
}

// === EXCLUIR ===
async function excluirVenda(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Deseja realmente excluir esta venda?")) return;
  await deleteDoc(doc(db, "vendas", id));
  alert("Venda excluída!");
  carregarVendas();
}

// === INICIALIZAÇÃO ===
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  await carregarVendas();
  btnAdicionarItem.addEventListener("click", adicionarItem);
  btnFinalizar.addEventListener("click", finalizarVenda);
});
