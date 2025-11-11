import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clienteSelect = document.getElementById("cliente");
const produtoSelect = document.getElementById("produto");
const quantidadeInput = document.getElementById("quantidade");
const descontoInput = document.getElementById("valor-desconto");
const tabelaItens = document.querySelector("#tabela-itens tbody");
const valorTotalSpan = document.getElementById("valor-total");
const tabelaVendas = document.querySelector("#tabela-vendas tbody");

let itensVenda = [];
let produtosCache = {};
let clientesCache = {};

async function carregarClientes() {
  const snap = await getDocs(collection(db, "clientes"));
  snap.forEach((docu) => {
    const data = docu.data();
    clientesCache[docu.id] = data.nome;
    const opt = document.createElement("option");
    opt.value = docu.id;
    opt.textContent = data.nome;
    clienteSelect.appendChild(opt);
  });
}

async function carregarProdutos() {
  const snap = await getDocs(collection(db, "produtos"));
  snap.forEach((docu) => {
    const data = docu.data();
    produtosCache[docu.id] = data;
    const opt = document.createElement("option");
    opt.value = docu.id;
    opt.textContent = data.nome;
    produtoSelect.appendChild(opt);
  });
}

function atualizarTabelaItens() {
  tabelaItens.innerHTML = "";
  let total = 0;

  itensVenda.forEach((item, index) => {
    const tr = document.createElement("tr");
    const subtotal = item.qtd * item.preco;
    total += subtotal;

    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.qtd}</td>
      <td>R$ ${item.preco.toFixed(2)}</td>
      <td>R$ ${subtotal.toFixed(2)}</td>
      <td>
        <button class="editar-item" data-index="${index}">✏️</button>
        <button class="remover-item" data-index="${index}">🗑️</button>
      </td>
    `;
    tabelaItens.appendChild(tr);
  });

  // Aplicar desconto
  const desconto = parseFloat(descontoInput.value) || 0;
  total -= desconto;
  if (total < 0) total = 0;

  valorTotalSpan.textContent = total.toFixed(2);
}

document.getElementById("adicionar-item").addEventListener("click", () => {
  const produtoId = produtoSelect.value;
  const produto = produtosCache[produtoId];
  const qtd = parseInt(quantidadeInput.value);

  if (!produtoId || isNaN(qtd) || qtd <= 0) {
    alert("Selecione o produto e insira uma quantidade válida.");
    return;
  }

  itensVenda.push({
    produtoId,
    nome: produto.nome,
    qtd,
    preco: produto.valor || 0,
  });

  atualizarTabelaItens();
  quantidadeInput.value = "";
});

tabelaItens.addEventListener("click", (e) => {
  if (e.target.classList.contains("remover-item")) {
    const index = e.target.dataset.index;
    itensVenda.splice(index, 1);
    atualizarTabelaItens();
  } else if (e.target.classList.contains("editar-item")) {
    const index = e.target.dataset.index;
    const novoQtd = prompt("Nova quantidade:", itensVenda[index].qtd);
    if (novoQtd && !isNaN(novoQtd) && novoQtd > 0) {
      itensVenda[index].qtd = parseInt(novoQtd);
      atualizarTabelaItens();
    }
  }
});

document.getElementById("finalizar-venda").addEventListener("click", async () => {
  const clienteId = clienteSelect.value;
  if (!clienteId || itensVenda.length === 0) {
    alert("Selecione um cliente e adicione itens à venda.");
    return;
  }

  const desconto = parseFloat(descontoInput.value) || 0;
  const total = parseFloat(valorTotalSpan.textContent);

  const venda = {
    cliente: clienteId,
    data: new Date().toISOString().split("T")[0],
    itens: itensVenda,
    total,
    desconto,
    status: "Pendente",
  };

  await addDoc(collection(db, "vendas"), venda);

  itensVenda = [];
  atualizarTabelaItens();
  alert("Venda registrada com sucesso!");
  carregarVendas();
});

async function carregarVendas() {
  tabelaVendas.innerHTML = "";
  const snap = await getDocs(collection(db, "vendas"));
  snap.forEach((docu) => {
    const data = docu.data();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${docu.id}</td>
      <td>${clientesCache[data.cliente] || "Desconhecido"}</td>
      <td>${data.data}</td>
      <td>R$ ${(data.total || 0).toFixed(2)}</td>
      <td>${data.status}</td>
      <td>
        <button class="detalhes" data-id="${docu.id}">🔍</button>
        <button class="excluir" data-id="${docu.id}">🗑️</button>
      </td>
    `;
    tabelaVendas.appendChild(tr);
  });
}

tabelaVendas.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains("excluir")) {
    if (confirm("Deseja realmente excluir esta venda?")) {
      await deleteDoc(doc(db, "vendas", id));
      carregarVendas();
    }
  } else if (e.target.classList.contains("detalhes")) {
    const vendaSnap = await getDoc(doc(db, "vendas", id));
    const venda = vendaSnap.data();

    let detalhesHTML = `
      <strong>Cliente:</strong> ${clientesCache[venda.cliente] || venda.cliente}<br>
      <strong>Data:</strong> ${venda.data}<br>
      <strong>Status:</strong> ${venda.status}<br>
      <strong>Desconto:</strong> R$ ${(venda.desconto || 0).toFixed(2)}<br><br>
      <strong>Itens:</strong><br>
      <ul>
        ${venda.itens.map(item => `
          <li>${item.nome} - ${item.qtd}x R$ ${item.preco.toFixed(2)} = R$ ${(item.qtd * item.preco).toFixed(2)}</li>
        `).join("")}
      </ul>
      <strong>Total:</strong> R$ ${(venda.total || 0).toFixed(2)}
    `;

    Swal.fire({
      title: "Detalhes da Venda",
      html: detalhesHTML,
      icon: "info",
      confirmButtonText: "Fechar",
    });
  }
});

await carregarClientes();
await carregarProdutos();
await carregarVendas();
