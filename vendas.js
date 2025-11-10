// vendas.js
import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências
const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Elementos do modal
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const itensTable = document.getElementById("itens-table");

// Array de itens
let itensVenda = [];

// Carregar clientes
async function carregarClientes() {
    selectCliente.innerHTML = `<option value="">Selecione um cliente</option>`;
    const snapshot = await getDocs(clientesRef);
    snapshot.forEach(doc => {
        const c = doc.data();
        // doc.id é o ID do documento no Firestore
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

// Carregar produtos
async function carregarProdutos(select) {
    select.innerHTML = `<option value="">Selecione um produto</option>`;
    const snapshot = await getDocs(estoqueRef);
    snapshot.forEach(doc => {
        const p = doc.data();
        select.innerHTML += `<option value="${doc.id}" data-preco="${p.preco || 0}" data-quant="${p.quantidade || 0}">${p.tipo} - ${doc.id}</option>`;
    });
}

// Adicionar item na tabela
async function adicionarItem() {
    const tbody = itensTable.querySelector("tbody") || (itensTable.innerHTML = "<tbody></tbody>" && itensTable.querySelector("tbody"));
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

    // Atualizar preço e quantidade
    produtoSelect.addEventListener("change", () => {
        const preco = parseFloat(produtoSelect.selectedOptions[0].dataset.preco || 0);
        tr.querySelector(".preco-input").value = preco.toFixed(2);
        atualizarSubtotal(tr);
    });

    tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));
    tr.querySelector(".btn-remove-item").addEventListener("click", () => {
        tr.remove();
        calcularTotal();
    });

    atualizarSubtotal(tr);
}

// Atualizar subtotal
function atualizarSubtotal(tr) {
    const qtd = parseFloat(tr.querySelector(".quantidade-input").value || 0);
    const preco = parseFloat(tr.querySelector(".preco-input").value || 0);

    // Verifica estoque
    const estoqueDisponivel = parseFloat(tr.querySelector(".produto-select").selectedOptions[0]?.dataset.quant || 0);
    if (qtd > estoqueDisponivel) {
        alert("Quantidade solicitada maior que o estoque disponível!");
        tr.querySelector(".quantidade-input").value = estoqueDisponivel;
    }

    tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
    calcularTotal();
}

// Calcular total da venda
function calcularTotal() {
    let total = 0;
    itensTable.querySelectorAll("tr").forEach(tr => {
        total += parseFloat(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    });
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
    if (itensTable.querySelectorAll("tr").length === 0) return alert("Adicione ao menos um item!");

    const itens = [];
    itensTable.querySelectorAll("tr").forEach(tr => {
        const produtoId = tr.querySelector(".produto-select").value;
        const qtd = parseInt(tr.querySelector(".quantidade-input").value);
        const preco = parseFloat(tr.querySelector(".preco-input").value);
        itens.push({ produtoId, qtd, preco });
    });

    const total = parseFloat(document.getElementById("valor-total").value.replace("R$ ", ""));
    const venda = { id: await gerarIdVenda(), cliente: clienteId, status, data, itens, total };

    await addDoc(vendasRef, venda);
    alert("Venda cadastrada com sucesso!");
    location.reload();
}

// Eventos
btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    await carregarClientes();
    carregarStatus();
    await adicionarItem(); // adiciona linha inicial
});
