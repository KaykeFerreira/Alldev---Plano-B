// vendas.js
import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências Firestore
const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Elementos do DOM
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnFinalizar = document.querySelector(".btn-finalizar");
const itensContainer = document.getElementById("itens-container");
const itensTable = document.getElementById("itens-table");

// Carregar clientes
async function carregarClientes() {
    selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
    const snapshot = await getDocs(clientesRef);
    snapshot.forEach(doc => {
        const c = doc.data();
        selectCliente.innerHTML += `<option value="${doc.id}">${c.nome}</option>`;
    });
}

// Carregar status
function carregarStatus() {
    selectStatus.innerHTML = `
        <option value="Pago">Pago</option>
        <option value="Pendente">Pendente</option>
    `;
}

// Carregar produtos em um select
async function carregarProdutos(select) {
    select.innerHTML = `<option value="">Selecione um produto</option>`;
    const snapshot = await getDocs(estoqueRef);
    snapshot.forEach(doc => {
        const p = doc.data();
        select.innerHTML += `<option value="${doc.id}" data-preco="${p.preco || 0}" data-quant="${p.quantidade || 0}">
            ${p.tipo} - ${doc.id}
        </option>`;
    });
}

// Criar uma nova linha de item
async function criarLinhaItem() {
    const row = document.createElement("div");
    row.className = "row produto-row mb-3";

    row.innerHTML = `
        <div class="col-md-5 mb-3">
            <select class="form-select produto-select"></select>
        </div>
        <div class="col-md-3 mb-3">
            <input type="number" class="form-control quantidade-input" value="1" min="1">
        </div>
        <div class="col-md-3 mb-3">
            <input type="text" class="form-control preco-input" value="0" disabled>
        </div>
        <div class="col-md-1 d-flex align-items-end mb-3">
            <button type="button" class="btn btn-sm btn-success btn-add-item"><i class="fas fa-plus"></i></button>
        </div>
    `;

    itensContainer.appendChild(row);

    const produtoSelect = row.querySelector(".produto-select");
    await carregarProdutos(produtoSelect);

    // Atualizar preço ao selecionar produto
    produtoSelect.addEventListener("change", () => {
        const preco = parseFloat(produtoSelect.selectedOptions[0]?.dataset.preco || 0);
        row.querySelector(".preco-input").value = preco.toFixed(2);
        atualizarSubtotal(row);
    });

    // Atualizar subtotal quando quantidade mudar
    row.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(row));

    // Evento do botão adicionar nova linha
    row.querySelector(".btn-add-item").addEventListener("click", criarLinhaItem);

    atualizarSubtotal(row);
}

// Atualizar subtotal de uma linha
function atualizarSubtotal(row) {
    const qtd = parseFloat(row.querySelector(".quantidade-input").value || 0);
    const preco = parseFloat(row.querySelector(".preco-input").value || 0);

    const estoqueDisponivel = parseFloat(row.querySelector(".produto-select").selectedOptions[0]?.dataset.quant || 0);
    if (qtd > estoqueDisponivel) {
        alert("Quantidade solicitada maior que o estoque disponível!");
        row.querySelector(".quantidade-input").value = estoqueDisponivel;
    }

    // Criar ou atualizar a tabela de resumo
    atualizarTabelaResumo();
}

// Atualizar tabela resumo e total
function atualizarTabelaResumo() {
    itensTable.innerHTML = "<thead><tr><th>Produto</th><th>Quantidade</th><th>Preço Unitário</th><th>Subtotal</th></tr></thead><tbody></tbody>";
    const tbody = itensTable.querySelector("tbody");
    let total = 0;

    itensContainer.querySelectorAll(".produto-row").forEach(row => {
        const produto = row.querySelector(".produto-select").selectedOptions[0]?.textContent || "";
        const qtd = parseFloat(row.querySelector(".quantidade-input").value || 0);
        const preco = parseFloat(row.querySelector(".preco-input").value || 0);
        const subtotal = qtd * preco;

        if (produto) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${produto}</td><td>${qtd}</td><td>R$ ${preco.toFixed(2)}</td><td>R$ ${subtotal.toFixed(2)}</td>`;
            tbody.appendChild(tr);
            total += subtotal;
        }
    });

    const desconto = parseFloat(document.getElementById("desconto").value || 0);
    total -= desconto;
    document.getElementById("valor-total").value = `R$ ${total.toFixed(2)}`;
}

// Gerar ID da venda
async function gerarIdVenda() {
    const snapshot = await getDocs(vendasRef);
    let maior = 0;
    snapshot.forEach(doc => {
        const num = parseInt(doc.data().id.replace(/\D/g, ""));
        if (!isNaN(num) && num > maior) maior = num;
    });
    return "V" + String(maior + 1).padStart(3, "0");
}

// Finalizar venda
async function finalizarVenda() {
    const clienteId = selectCliente.value;
    const status = selectStatus.value;
    const data = document.querySelector("#modalCadastroVenda input[type=date]").value;

    if (!clienteId) return alert("Selecione um cliente!");
    if (itensContainer.querySelectorAll(".produto-row").length === 0) return alert("Adicione ao menos um item!");

    const itens = [];
    itensContainer.querySelectorAll(".produto-row").forEach(row => {
        const produtoId = row.querySelector(".produto-select").value;
        const qtd = parseInt(row.querySelector(".quantidade-input").value);
        const preco = parseFloat(row.querySelector(".preco-input").value);
        if (produtoId) itens.push({ produtoId, qtd, preco });
    });

    const total = parseFloat(document.getElementById("valor-total").value.replace("R$ ", ""));
    const venda = { id: await gerarIdVenda(), cliente: clienteId, status, data, itens, total };

    await addDoc(vendasRef, venda);
    alert("Venda cadastrada com sucesso!");
    location.reload();
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    await carregarClientes();
    carregarStatus();
    await criarLinhaItem(); // linha inicial
});

// Evento finalizar venda
btnFinalizar.addEventListener("click", finalizarVenda);

// Atualizar subtotal ao mudar desconto
document.getElementById("desconto").addEventListener("input", atualizarTabelaResumo);
