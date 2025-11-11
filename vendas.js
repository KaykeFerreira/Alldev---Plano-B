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

// Referências Firebase
const clientesRef = collection(db, "clientes");
const produtosRef = collection(db, "produtos"); // ✅ agora lê da coleção correta
const vendasRef = collection(db, "vendas");

// Elementos do modal
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const itensTable = document.getElementById("itens-table");
const valorTotalInput = document.getElementById("valor-total");

// === Carregar CLIENTES ===
async function carregarClientes() {
  selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
  const snapshot = await getDocs(clientesRef);
  snapshot.forEach(doc => {
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
  try {
    const snapshot = await getDocs(produtosRef);
    if (snapshot.empty) {
      console.log("Nenhum produto encontrado no Firestore!");
      return;
    }

    snapshot.forEach(doc => {
      const p = doc.data();
      const preco = Number(p.preco || 0);
      const quantidade = Number(p.quantidade || 0);
      select.innerHTML += `
        <option value="${doc.id}" data-preco="${preco}" data-quant="${quantidade}">
          ${p.nome} (${p.marca}) - Estoque: ${quantidade}
        </option>
      `;
    });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}

// === Adicionar ITEM na tabela ===
async function adicionarItem() {
  let tbody = itensTable.querySelector("tbody");
  if (!tbody) {
    tbody = document.createElement("tbody");
    itensTable.appendChild(tbody);
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><select class="form-select produto-select"></select></td>
    <td><input type="number" class="form-control quantidade-input" value="1" min="1"></td>
    <td><input type="text" class="form-control preco-input" value="0" disabled></td>
    <td class="subtotal">R$ 0.00</td>
    <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
  `;
  tbody.appendChild(tr);

  const produtoSelect = tr.querySelector(".produto-select");
  await carregarProdutos(produtoSelect);

  // Atualiza preço ao selecionar produto
  produtoSelect.addEventListener("change", () => {
    const preco = Number(produtoSelect.selectedOptions[0]?.dataset.preco || 0);
    tr.querySelector(".preco-input").value = preco.toFixed(2);
    atualizarSubtotal(tr);
  });

  // Atualiza subtotal ao mudar quantidade
  tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));

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
  if (!select.value) {
    tr.querySelector(".subtotal").textContent = "R$ 0.00";
    calcularTotal();
    return;
  }

  let qtd = Number(tr.querySelector(".quantidade-input").value || 0);
  const preco = Number(tr.querySelector(".preco-input").value || 0);
  const estoqueDisponivel = Number(select.selectedOptions[0]?.dataset.quant || 0);

  if (qtd > estoqueDisponivel) {
    qtd = estoqueDisponivel;
    tr.querySelector(".quantidade-input").value = qtd;
  }

  tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
  calcularTotal();
}

// === Calcular TOTAL ===
function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach(tr => {
    total += Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
  });
  valorTotalInput.value = `R$ ${total.toFixed(2)}`;
}

// === Gerar ID da venda ===
async function gerarIdVenda() {
  const snapshot = await getDocs(vendasRef);
  let maior = 0;
  snapshot.forEach(doc => {
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
  if (itensTable.querySelectorAll("tbody tr").length === 0) return alert("Adicione ao menos um item!");

  const itens = [];
  itensTable.querySelectorAll("tbody tr").forEach(tr => {
    const produtoId = tr.querySelector(".produto-select").value;
    if (!produtoId) return;
    const qtd = Number(tr.querySelector(".quantidade-input").value);
    const preco = Number(tr.querySelector(".preco-input").value);
    itens.push({ produtoId, qtd, preco });
  });

  const total = Number(valorTotalInput.value.replace("R$ ", ""));
  const venda = { id: await gerarIdVenda(), cliente: clienteId, status, data, itens, total };

  await addDoc(vendasRef, venda);
  alert("✅ Venda cadastrada com sucesso!");

  const modalEl = document.getElementById('modalCadastroVenda');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.hide();

  itensTable.querySelector("tbody").innerHTML = "";
  valorTotalInput.value = "";
  await adicionarItem();
  await carregarVendas();
}

// === Editar VENDA ===
async function editarVenda(idVenda) {
  const ref = doc(db, "vendas", idVenda);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Venda não encontrada!");

  const v = snap.data();
  alert(`🔧 Edição de venda ainda em construção (Venda ${v.id})`);
  // Aqui você pode abrir o modal de edição e preencher os campos se quiser fazer edição completa
}

// === Excluir VENDA ===
async function excluirVenda(idVenda) {
  if (!confirm("Deseja realmente excluir esta venda?")) return;
  try {
    await deleteDoc(doc(db, "vendas", idVenda));
    alert("🗑️ Venda excluída com sucesso!");
    await carregarVendas();
  } catch (error) {
    console.error("Erro ao excluir venda:", error);
    alert("Erro ao excluir venda.");
  }
}

// === Carregar VENDAS existentes ===
async function carregarVendas() {
  const tabela = document.querySelector("table.table tbody");
  tabela.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Carregando...</td></tr>";

  const snapshot = await getDocs(vendasRef);
  if (snapshot.empty) {
    tabela.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Nenhuma venda cadastrada</td></tr>";
    return;
  }

  tabela.innerHTML = "";
  snapshot.forEach(docSnap => {
    const v = docSnap.data();
    tabela.innerHTML += `
      <tr>
        <td>${v.id}</td>
        <td>${v.cliente}</td>
        <td>${v.data}</td>
        <td>${v.status}</td>
        <td>R$ ${Number(v.total).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-editar-venda" data-id="${docSnap.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-excluir-venda" data-id="${docSnap.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  });

  // Eventos de editar/excluir
  document.querySelectorAll(".btn-editar-venda").forEach(btn => {
    btn.addEventListener("click", () => editarVenda(btn.dataset.id));
  });
  document.querySelectorAll(".btn-excluir-venda").forEach(btn => {
    btn.addEventListener("click", () => excluirVenda(btn.dataset.id));
  });
}

// === Eventos ===
btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);

// === Inicialização ===
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  carregarStatus();
  await adicionarItem();
  await carregarVendas();
});    
