import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências Firebase
const clientesRef = collection(db, "clientes");
const produtosRef = collection(db, "produtos");
const vendasRef = collection(db, "vendas");

// Elementos
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const itensTable = document.getElementById("itens-table");
const valorTotalInput = document.getElementById("valor-total");
const tabelaVendas = document.querySelector("table.table tbody");

// Variável global para controlar edição
let vendaEditandoId = null;

// === Carregar CLIENTES ===
async function carregarClientes() {
  selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
  const snapshot = await getDocs(clientesRef);
  snapshot.forEach((doc) => {
    const c = doc.data();
    selectCliente.innerHTML += `<option value="${doc.id}">${c.nome}</option>`;
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
  snapshot.forEach((doc) => {
    const p = doc.data();
    select.innerHTML += `
      <option value="${doc.id}" data-preco="${p.preco}" data-quant="${p.quantidade}">
        ${p.nome} (${p.marca}) - Estoque: ${p.quantidade}
      </option>
    `;
  });
}

// === Adicionar ITEM ===
async function adicionarItem(produtoId = "", quantidade = 1) {
  let tbody = itensTable.querySelector("tbody");
  if (!tbody) {
    tbody = document.createElement("tbody");
    itensTable.appendChild(tbody);
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="form-select produto-select"></select></td>
    <td><input type="number" class="form-control quantidade-input" value="${quantidade}" min="1"></td>
    <td><input type="text" class="form-control preco-input" value="0" disabled></td>
    <td class="subtotal">R$ 0.00</td>
    <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
  `;
  tbody.appendChild(tr);

  const produtoSelect = tr.querySelector(".produto-select");
  await carregarProdutos(produtoSelect);

  if (produtoId) produtoSelect.value = produtoId;

  // Atualizar preço e subtotal
  const atualizar = () => atualizarSubtotal(tr);
  produtoSelect.addEventListener("change", atualizar);
  tr.querySelector(".quantidade-input").addEventListener("input", atualizar);

  // Remover item
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove();
    calcularTotal();
  });

  atualizarSubtotal(tr);
}

// === Atualizar SUBTOTAL ===
function atualizarSubtotal(tr) {
  const select = tr.querySelector(".produto-select");
  const preco = Number(select.selectedOptions[0]?.dataset.preco || 0);
  const qtd = Number(tr.querySelector(".quantidade-input").value || 0);
  tr.querySelector(".preco-input").value = preco.toFixed(2);
  tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
  calcularTotal();
}

// === Calcular TOTAL ===
function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach((tr) => {
    total += Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
  });
  valorTotalInput.value = `R$ ${total.toFixed(2)}`;
}

// === Gerar ID da venda ===
async function gerarIdVenda() {
  const snapshot = await getDocs(vendasRef);
  let maior = 0;
  snapshot.forEach((doc) => {
    const num = parseInt(doc.data().id?.replace(/\D/g, "")) || 0;
    if (num > maior) maior = num;
  });
  return "V" + String(maior + 1).padStart(3, "0");
}

// === Finalizar VENDA ===
async function finalizarVenda() {
  const clienteId = selectCliente.value;
  const status = selectStatus.value;
  const data = document.querySelector("#modalCadastroVenda input[type=date]").value;

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

  const total = Number(valorTotalInput.value.replace("R$ ", ""));
  const venda = {
    id: vendaEditandoId ? undefined : await gerarIdVenda(),
    cliente: clienteId,
    status,
    data,
    itens,
    total,
  };

  if (vendaEditandoId) {
    await updateDoc(doc(db, "vendas", vendaEditandoId), venda);
    alert("✅ Venda atualizada com sucesso!");
  } else {
    await addDoc(vendasRef, venda);
    alert("✅ Venda cadastrada com sucesso!");
  }

  const modalEl = document.getElementById("modalCadastroVenda");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.hide();

  vendaEditandoId = null;
  itensTable.querySelector("tbody").innerHTML = "";
  valorTotalInput.value = "";
  await adicionarItem();
  await carregarVendas();
}

// === Excluir VENDA ===
async function excluirVenda(idVenda) {
  if (!confirm("Deseja realmente excluir esta venda?")) return;
  await deleteDoc(doc(db, "vendas", idVenda));
  alert("🗑️ Venda excluída com sucesso!");
  await carregarVendas();
}

// === Editar VENDA ===
async function editarVenda(idVenda) {
  const snap = await getDoc(doc(db, "vendas", idVenda));
  if (!snap.exists()) return alert("Venda não encontrada!");
  const v = snap.data();
  vendaEditandoId = idVenda;

  document.querySelector("#modalCadastroVenda input[type=date]").value = v.data;
  selectCliente.value = v.cliente;
  selectStatus.value = v.status;

  itensTable.querySelector("tbody").innerHTML = "";
  for (const item of v.itens) {
    await adicionarItem(item.produtoId, item.qtd);
  }

  calcularTotal();
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCadastroVenda"));
  modal.show();
}

// === Detalhes da VENDA ===
async function detalhesVenda(idVenda) {
  const snap = await getDoc(doc(db, "vendas", idVenda));
  if (!snap.exists()) return alert("Venda não encontrada!");
  const v = snap.data();

  const clienteSnap = await getDoc(doc(db, "clientes", v.cliente));
  const nomeCliente = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente removido";

  let html = `
    <p><strong>ID:</strong> ${v.id}</p>
    <p><strong>Cliente:</strong> ${nomeCliente}</p>
    <p><strong>Data:</strong> ${v.data}</p>
    <p><strong>Status:</strong> ${v.status}</p>
    <p><strong>Total:</strong> R$ ${Number(v.total).toFixed(2)}</p>
    <hr>
    <h6>Itens da Venda:</h6>
    <ul>
  `;

  for (const item of v.itens) {
    const pSnap = await getDoc(doc(db, "produtos", item.produtoId));
    const nomeProduto = pSnap.exists() ? pSnap.data().nome : "Produto removido";
    html += `<li>${nomeProduto} — ${item.qtd} un. × R$ ${item.preco.toFixed(2)}</li>`;
  }

  html += "</ul>";

  const modalDetalhes = document.getElementById("modalDetalhesVenda");
  modalDetalhes.querySelector(".modal-body").innerHTML = html;
  bootstrap.Modal.getOrCreateInstance(modalDetalhes).show();
}

// === Carregar VENDAS ===
async function carregarVendas() {
  tabelaVendas.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Carregando...</td></tr>";

  const snapshot = await getDocs(vendasRef);
  if (snapshot.empty) {
    tabelaVendas.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Nenhuma venda cadastrada</td></tr>";
    return;
  }

  tabelaVendas.innerHTML = "";
  for (const docSnap of snapshot.docs) {
    const v = docSnap.data();
    const clienteSnap = await getDoc(doc(db, "clientes", v.cliente));
    const nomeCliente = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente removido";

    tabelaVendas.innerHTML += `
      <tr>
        <td>${v.id}</td>
        <td>${nomeCliente}</td>
        <td>${v.data}</td>
        <td>${v.status}</td>
        <td>R$ ${Number(v.total).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-info btn-detalhes-venda" data-id="${docSnap.id}"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-primary btn-editar-venda" data-id="${docSnap.id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger btn-excluir-venda" data-id="${docSnap.id}"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  }

  document.querySelectorAll(".btn-editar-venda").forEach((btn) =>
    btn.addEventListener("click", () => editarVenda(btn.dataset.id))
  );
  document.querySelectorAll(".btn-excluir-venda").forEach((btn) =>
    btn.addEventListener("click", () => excluirVenda(btn.dataset.id))
  );
  document.querySelectorAll(".btn-detalhes-venda").forEach((btn) =>
    btn.addEventListener("click", () => detalhesVenda(btn.dataset.id))
  );
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
