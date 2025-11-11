import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clientesRef = collection(db, "clientes");
const produtosRef = collection(db, "produtos");
const vendasRef = collection(db, "vendas");

const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const btnAplicarDesconto = document.getElementById("btn-aplicar-desconto");
const itensTable = document.getElementById("itens-table");
const valorTotalInput = document.getElementById("valor-total");
const descontoInput = document.getElementById("valor-desconto");
const dataInput = document.getElementById("data-venda");

// ========== FUNÇÕES ==========

async function carregarClientes() {
  selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
  const snapshot = await getDocs(clientesRef);
  snapshot.forEach(doc => {
    const c = doc.data();
    selectCliente.innerHTML += `<option value="${doc.id}">${c.nome}</option>`;
  });
}

function carregarStatus() {
  selectStatus.innerHTML = `
    <option value="Pago">Pago</option>
    <option value="Pendente">Pendente</option>
  `;
}

async function carregarProdutos(select) {
  select.innerHTML = `<option value="">Selecione um produto</option>`;
  const snapshot = await getDocs(produtosRef);
  snapshot.forEach(doc => {
    const p = doc.data();
    const preco = Number(p.preco || 0);
    const quantidade = Number(p.quantidade || 0);
    select.innerHTML += `
      <option 
        value="${doc.id}" 
        data-preco="${preco}" 
        data-quant="${quantidade}" 
        data-nome="${p.nome}"
      >
        ${p.nome} - R$ ${preco.toFixed(2)} | Estoque: ${quantidade}
      </option>`;
  });
}

async function adicionarItem() {
  const tbody = itensTable.querySelector("tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="form-select produto-select"></select></td>
    <td><input type="number" class="form-control quantidade-input" value="1" min="1"></td>
    <td><input type="text" class="form-control preco-input" value="0.00" disabled></td>
    <td class="subtotal">R$ 0.00</td>
    <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
  `;
  tbody.appendChild(tr);

  const produtoSelect = tr.querySelector(".produto-select");
  await carregarProdutos(produtoSelect);

  produtoSelect.addEventListener("change", () => atualizarSubtotal(tr));
  tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove();
    calcularTotal();
  });
}

function atualizarSubtotal(tr) {
  const select = tr.querySelector(".produto-select");
  const qtdInput = tr.querySelector(".quantidade-input");
  const precoInput = tr.querySelector(".preco-input");
  const subtotalEl = tr.querySelector(".subtotal");

  const preco = Number(select.selectedOptions[0]?.dataset.preco || 0);
  const qtd = Number(qtdInput.value) || 0;
  const estoque = Number(select.selectedOptions[0]?.dataset.quant || 0);

  if (qtd > estoque && estoque > 0) {
    alert(`Quantidade maior que o estoque disponível (${estoque})!`);
    qtdInput.value = estoque;
  }

  precoInput.value = preco.toFixed(2);
  const subtotal = qtd * preco;
  subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  calcularTotal();
}

function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach(tr => {
    const subtotal = Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    total += subtotal;
  });

  const desconto = Number(descontoInput.dataset.aplicado || 0);
  valorTotalInput.value = `R$ ${(total - desconto).toFixed(2)}`;
}

// Botão aplicar desconto
btnAplicarDesconto.addEventListener("click", () => {
  const valor = Number(descontoInput.value) || 0;
  descontoInput.dataset.aplicado = valor;
  calcularTotal();
  alert(`✅ Desconto de R$ ${valor.toFixed(2)} aplicado!`);
});

async function gerarIdVenda() {
  const snapshot = await getDocs(vendasRef);
  let maior = 0;
  snapshot.forEach(doc => {
    const num = parseInt(doc.data().id?.replace(/\D/g, "")) || 0;
    if (num > maior) maior = num;
  });
  return "V" + String(maior + 1).padStart(3, "0");
}

async function finalizarVenda() {
  const clienteId = selectCliente.value;
  const status = selectStatus.value;
  const data = dataInput.value;
  const desconto = Number(descontoInput.dataset.aplicado || 0);

  if (!clienteId) return alert("Selecione um cliente!");
  const linhas = itensTable.querySelectorAll("tbody tr");
  if (linhas.length === 0) return alert("Adicione ao menos um item!");

  const itens = [];
  linhas.forEach(tr => {
    const produtoId = tr.querySelector(".produto-select").value;
    const qtd = Number(tr.querySelector(".quantidade-input").value);
    const preco = Number(tr.querySelector(".preco-input").value);
    if (produtoId && qtd > 0) itens.push({ produtoId, qtd, preco });
  });

  const total = Number(valorTotalInput.value.replace("R$ ", "")) || 0;
  const venda = {
    id: await gerarIdVenda(),
    cliente: clienteId,
    status,
    data,
    desconto,
    itens,
    total
  };

  await addDoc(vendasRef, venda);
  alert("✅ Venda cadastrada com sucesso!");

  // Fechar modal automaticamente
  const modalEl = document.getElementById("modalCadastroVenda");
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  document.getElementById("form-venda").reset();
  itensTable.querySelector("tbody").innerHTML = "";
  valorTotalInput.value = "";
  descontoInput.dataset.aplicado = 0;
  await adicionarItem();
  await carregarVendas();
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  carregarStatus();
  await adicionarItem();
  await carregarVendas();
});

btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);
