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
const descontoInput = document.getElementById("desconto");

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

  produtoSelect.addEventListener("change", () => atualizarSubtotal(tr));
  tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove();
    calcularTotal();
  });
}

// =======================
// PESQUISA DE PRODUTOS NO SELECT (em tempo real)
// =======================

document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("produto-select")) return;

  const termo = e.target.value.toLowerCase();
  const opcoes = e.target.querySelectorAll("option");

  opcoes.forEach(opt => {
    const texto = opt.textContent.toLowerCase();
    opt.style.display = texto.includes(termo) ? "block" : "none";
  });
});



// === Atualizar SUBTOTAL ===
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

// === Calcular TOTAL com DESCONTO ===
function calcularTotal() {
  let total = 0;
  itensTable.querySelectorAll("tbody tr").forEach(tr => {
    const subtotal = Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    total += subtotal;
  });

  const desconto = Number(descontoInput?.value || 0);
  const totalComDesconto = total - desconto;
  valorTotalInput.value = `R$ ${Math.max(totalComDesconto, 0).toFixed(2)}`;
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
  const desconto = Number(descontoInput?.value || 0);

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
    desconto,
    itens,
    total
  };

  await addDoc(vendasRef, venda);
  alert("✅ Venda cadastrada com sucesso!");
  document.getElementById("modalCadastroVenda").querySelector("form").reset();
  itensTable.querySelector("tbody").innerHTML = "";
  valorTotalInput.value = "";
  await adicionarItem();
  await carregarVendas();
}

// === Exibir DETALHES da venda ===
async function exibirDetalhes(idVenda) {
  const ref = doc(db, "vendas", idVenda);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Venda não encontrada!");
  const v = snap.data();

  // Nome do cliente
  const clienteSnap = await getDoc(doc(db, "clientes", v.cliente));
  const nomeCliente = clienteSnap.exists() ? clienteSnap.data().nome : "Cliente não encontrado";

  // Lista de itens detalhados
  let detalhesItens = `
    <table class="table table-bordered text-start">
      <thead>
        <tr>
          <th>Produto</th>
          <th>Qtd</th>
          <th>Preço Unit.</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;
  for (const item of v.itens || []) {
    const prodSnap = await getDoc(doc(db, "produtos", item.produtoId));
    const nomeProd = prodSnap.exists() ? prodSnap.data().nome : "Produto desconhecido";
    const subtotal = item.qtd * item.preco;
    detalhesItens += `
      <tr>
        <td>${nomeProd}</td>
        <td>${item.qtd}</td>
        <td>R$ ${item.preco.toFixed(2)}</td>
        <td>R$ ${subtotal.toFixed(2)}</td>
      </tr>
    `;
  }
  detalhesItens += `
      </tbody>
    </table>
  `;

  // SweetAlert detalhado
  Swal.fire({
    title: `📋 Detalhes da Venda ${v.id}`,
    html: `
      <p><b>Cliente:</b> ${nomeCliente}</p>
      <p><b>Data:</b> ${v.data}</p>
      <p><b>Status:</b> ${v.status}</p>
      <hr>
      ${detalhesItens}
      <hr>
      <p><b>Desconto:</b> R$ ${(v.desconto || 0).toFixed(2)}</p>
      <h5><b>Total Final:</b> R$ ${v.total.toFixed(2)}</h5>
    `,
    width: 700,
    confirmButtonText: "Fechar"
  });
}

// === Editar VENDA ===
async function editarVenda(idVenda) {
  const ref = doc(db, "vendas", idVenda);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Venda não encontrada!");
  const v = snap.data();

  const { value: formValues } = await Swal.fire({
    title: "Editar Venda",
    html: `
      <label>Status:</label>
      <select id="swal-status" class="swal2-select">
        <option value="Pago" ${v.status === "Pago" ? "selected" : ""}>Pago</option>
        <option value="Pendente" ${v.status === "Pendente" ? "selected" : ""}>Pendente</option>
      </select><br><br>
      <label>Desconto (R$):</label>
      <input id="swal-desconto" type="number" min="0" class="swal2-input" value="${v.desconto || 0}">
    `,
    focusConfirm: false,
    preConfirm: () => ({
      status: document.getElementById("swal-status").value,
      desconto: Number(document.getElementById("swal-desconto").value || 0)
    }),
    showCancelButton: true,
    confirmButtonText: "Salvar"
  });

  if (!formValues) return;
  const novoTotal = Math.max(v.total - (formValues.desconto - (v.desconto || 0)), 0);

  await updateDoc(ref, {
    status: formValues.status,
    desconto: formValues.desconto,
    total: novoTotal
  });

  Swal.fire("✅ Atualizado!", "Venda modificada com sucesso.", "success");
  await carregarVendas();
}

// === Excluir VENDA ===
async function excluirVenda(idVenda) {
  if (!confirm("Deseja realmente excluir esta venda?")) return;
  await deleteDoc(doc(db, "vendas", idVenda));
  alert("🗑️ Venda excluída!");
  await carregarVendas();
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
  for (const docSnap of snapshot.docs) {
    const v = docSnap.data();
    const clienteSnap = await getDoc(doc(db, "clientes", v.cliente));
    const nomeCliente = clienteSnap.exists() ? clienteSnap.data().nome : "Desconhecido";

    tabela.innerHTML += `
      <tr>
        <td>${v.id}</td>
        <td>${nomeCliente}</td>
        <td>${v.data}</td>
        <td>${v.status}</td>
        <td>R$ ${Number(v.total).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-info btn-detalhes" data-id="${docSnap.id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-primary btn-editar" data-id="${docSnap.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-excluir" data-id="${docSnap.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  }

  document.querySelectorAll(".btn-detalhes").forEach(btn =>
    btn.addEventListener("click", () => exibirDetalhes(btn.dataset.id))
  );
  document.querySelectorAll(".btn-editar").forEach(btn =>
    btn.addEventListener("click", () => editarVenda(btn.dataset.id))
  );
  document.querySelectorAll(".btn-excluir").forEach(btn =>
    btn.addEventListener("click", () => excluirVenda(btn.dataset.id))
  );
}

// === Eventos ===
btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);
if (descontoInput) descontoInput.addEventListener("input", calcularTotal);

// === Inicialização ===
document.addEventListener("DOMContentLoaded", async () => {
  await carregarClientes();
  carregarStatus();
  await adicionarItem();
  await carregarVendas();
});
