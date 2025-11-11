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
const produtosRef = collection(db, "produtos");
const vendasRef = collection(db, "vendas");

// Elementos
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
          ${p.nome} (${p.marca || "Sem marca"}) - R$ ${preco.toFixed(2)} | Estoque: ${quantidade}
        </option>
      `;
    });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
  }
}

// === Adicionar ITEM na tabela ===
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

  // Atualiza preço e subtotal ao selecionar produto
  produtoSelect.addEventListener("change", () => {
    const preco = Number(produtoSelect.selectedOptions[0]?.dataset.preco || 0);
    const precoInput = tr.querySelector(".preco-input");
    precoInput.value = preco.toFixed(2);
    atualizarSubtotal(tr);
  });

  // Atualiza subtotal ao mudar quantidade
  tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));

  // Remover item
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove();
    calcularTotal();
  });
}

// === Atualizar SUBTOTAL ===
function atualizarSubtotal(tr) {
  const select = tr.querySelector(".produto-select");
  const qtdInput = tr.querySelector(".quantidade-input");
  const precoInput = tr.querySelector(".preco-input");
  const subtotalEl = tr.querySelector(".subtotal");

  const preco = Number(select.selectedOptions[0]?.dataset.preco || precoInput.value || 0);
  const qtd = Number(qtdInput.value) || 0;
  const estoque = Number(select.selectedOptions[0]?.dataset.quant || 0);

  // Atualiza o input de preço conforme o produto
  precoInput.value = preco.toFixed(2);

  if (qtd > estoque && estoque > 0) {
    alert(`Quantidade maior que o estoque disponível (${estoque})!`);
    qtdInput.value = estoque;
  }

  const subtotal = qtd * preco;
  subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
  calcularTotal();
}

// === Calcular TOTAL ===
function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach(tr => {
    const subtotal = Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    total += subtotal;
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
  const linhas = itensTable.querySelectorAll("tbody tr");
  if (linhas.length === 0) return alert("Adicione ao menos um item!");

  const itens = [];
  linhas.forEach(tr => {
    const produtoId = tr.querySelector(".produto-select").value;
    const qtd = Number(tr.querySelector(".quantidade-input").value);
    const preco = Number(tr.querySelector(".preco-input").value);
    if (produtoId && qtd > 0) {
      itens.push({ produtoId, qtd, preco });
    }
  });

  const total = Number(valorTotalInput.value.replace("R$ ", "")) || 0;
  const venda = {
    id: await gerarIdVenda(),
    cliente: clienteId,
    status,
    data,
    itens,
    total
  };

  await addDoc(vendasRef, venda);
  alert("✅ Venda cadastrada com sucesso!");

  // Fechar modal e resetar
  const modalEl = document.getElementById("modalCadastroVenda");
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

// === Carregar VENDAS ===
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
