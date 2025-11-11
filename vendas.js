import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// === Referências às coleções ===
const clientesRef = collection(db, "clientes");
const produtosRef = collection(db, "produtos");
const vendasRef = collection(db, "vendas");

// === Elementos da página ===
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const itensTable = document.getElementById("tabela-itens");
const valorTotalInput = document.getElementById("valor-total");
const descontoInput = document.getElementById("desconto");

// === Carregar CLIENTES ===
async function carregarClientes() {
  selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
  const snapshot = await getDocs(clientesRef);
  snapshot.forEach((docSnap) => {
    const cliente = docSnap.data();
    selectCliente.innerHTML += `<option value="${docSnap.id}">${cliente.nome}</option>`;
  });
}

// === Carregar STATUS ===
function carregarStatus() {
  selectStatus.innerHTML = `
    <option value="Pago">Pago</option>
    <option value="Pendente">Pendente</option>
  `;
}

// === Carregar PRODUTOS ===
async function carregarProdutos(select) {
  select.innerHTML = `<option value="">Selecione um produto</option>`;
  const snapshot = await getDocs(produtosRef);
  snapshot.forEach((docSnap) => {
    const p = docSnap.data();
    const preco = Number(p.preco) || 0; // fallback caso não exista preço
    const qtd = Number(p.quantidade) || 0;
    select.innerHTML += `
      <option value="${docSnap.id}" data-preco="${preco}" data-estoque="${qtd}">
        ${p.nome} (${p.marca || "Sem marca"}) — Estoque: ${qtd}
      </option>`;
  });
}

// === Adicionar ITEM ===
async function adicionarItem() {
  const tbody = itensTable.querySelector("tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="form-select produto-select"></select></td>
    <td><input type="number" min="1" value="1" class="form-control quantidade-input"></td>
    <td><input type="text" class="form-control preco-input" readonly></td>
    <td class="subtotal">R$ 0,00</td>
    <td><button class="btn btn-danger btn-remove-item">Remover</button></td>
  `;
  tbody.appendChild(tr);

  const produtoSelect = tr.querySelector(".produto-select");
  await carregarProdutos(produtoSelect);

  // Quando selecionar produto
  produtoSelect.addEventListener("change", () => {
    const preco = Number(produtoSelect.selectedOptions[0]?.dataset.preco || 0);
    tr.querySelector(".preco-input").value = preco.toFixed(2);
    atualizarSubtotal(tr);
  });

  // Atualiza subtotal quando muda quantidade
  tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));

  // Remove linha
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove();
    calcularTotal();
  });
}

// === Atualizar SUBTOTAL ===
function atualizarSubtotal(tr) {
  const qtd = Number(tr.querySelector(".quantidade-input").value);
  const preco = Number(tr.querySelector(".preco-input").value);
  tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
  calcularTotal();
}

// === Calcular TOTAL ===
function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach((tr) => {
    const valor = Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    total += valor;
  });
  valorTotalInput.value = `R$ ${total.toFixed(2)}`;
}

// === Gerar ID da VENDA ===
async function gerarIdVenda() {
  const snapshot = await getDocs(vendasRef);
  let maior = 0;
  snapshot.forEach((docSnap) => {
    const num = parseInt(docSnap.data().id?.replace(/\D/g, "")) || 0;
    if (num > maior) maior = num;
  });
  return "V" + String(maior + 1).padStart(3, "0");
}

// === Finalizar VENDA ===
async function finalizarVenda() {
  const clienteId = selectCliente.value;
  const status = selectStatus.value;
  const data = new Date().toLocaleDateString("pt-BR");

  if (!clienteId) return alert("Selecione um cliente!");
  if (itensTable.querySelectorAll("tbody tr").length === 0)
    return alert("Adicione ao menos um item!");

  const itens = [];
  itensTable.querySelectorAll("tbody tr").forEach((tr) => {
    const produtoId = tr.querySelector(".produto-select").value;
    if (!produtoId) return;
    const qtd = Number(tr.querySelector(".quantidade-input").value);
    const preco = Number(tr.querySelector(".preco-input").value);
    itens.push({ produtoId, qtd, preco });
  });

  const total = Number(valorTotalInput.value.replace("R$ ", "")) || 0;
  const idVenda = await gerarIdVenda();

  const venda = {
    id: idVenda,
    cliente: clienteId,
    status,
    data,
    itens,
    total
  };

  await addDoc(vendasRef, venda);
  alert("Venda cadastrada com sucesso!");
  carregarVendas();
}

// === Carregar VENDAS ===
async function carregarVendas() {
  const tabela = document.querySelector("table.table tbody");
  tabela.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

  const snapshot = await getDocs(vendasRef);
  if (snapshot.empty) {
    tabela.innerHTML = "<tr><td colspan='6'>Nenhuma venda</td></tr>";
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
        <td>${venda.data}</td>
        <td>${venda.status}</td>
        <td>R$ ${venda.total.toFixed(2)}</td>
        <td>
          <button class="btn btn-info btn-detalhes" data-id="${docSnap.id}">Detalhes</button>
          <button class="btn btn-danger btn-excluir" data-id="${docSnap.id}">Excluir</button>
        </td>
      </tr>
    `;
  }

  document.querySelectorAll(".btn-detalhes").forEach(btn =>
    btn.addEventListener("click", exibirDetalhesVenda)
  );

  document.querySelectorAll(".btn-excluir").forEach(btn =>
    btn.addEventListener("click", excluirVenda)
  );
}

// === Exibir Detalhes da Venda ===
async function exibirDetalhesVenda(e) {
  const id = e.currentTarget.dataset.id;
  const vendaDoc = await getDoc(doc(db, "vendas", id));
  if (!vendaDoc.exists()) return alert("Venda não encontrada!");

  const v = vendaDoc.data();
  const clienteSnap = await getDoc(doc(db, "clientes", v.cliente));
  const clienteNome = clienteSnap.exists() ? clienteSnap.data().nome : "Desconhecido";

  let detalhes = `ID: ${v.id}\nCliente: ${clienteNome}\nStatus: ${v.status}\nData: ${v.data}\n\nItens:\n`;

  for (const item of v.itens) {
    const prodSnap = await getDoc(doc(db, "produtos", item.produtoId));
    const produtoNome = prodSnap.exists() ? prodSnap.data().nome : "Produto removido";
    detalhes += `• ${produtoNome} — ${item.qtd} x R$ ${item.preco.toFixed(2)}\n`;
  }

  detalhes += `\nTotal: R$ ${v.total.toFixed(2)}`;
  alert(detalhes);
}

// === Excluir Venda ===
async function excluirVenda(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm("Deseja realmente excluir esta venda?")) return;
  await deleteDoc(doc(db, "vendas", id));
  alert("Venda excluída!");
  carregarVendas();
}

// === Inicialização ===
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  carregarStatus();
  await adicionarItem();
  await carregarVendas();
});

btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);
