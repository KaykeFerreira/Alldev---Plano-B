import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências
const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Modal elementos
const modal = document.getElementById("modalCadastroVenda");
const selectCliente = modal.querySelector("select:nth-of-type(1)");
const selectStatus = modal.querySelector("select:nth-of-type(2)");
const btnAdicionarItem = modal.querySelector(".btn-success");
const btnFinalizar = modal.querySelector(".btn-primary");
const itensTable = modal.querySelector("table");

// Carregar clientes
async function carregarClientes() {
    selectCliente.innerHTML = "<option value=''>Selecione um cliente</option>";
    const snapshot = await getDocs(clientesRef);
    snapshot.forEach(doc => {
        const data = doc.data();
        // doc.id é o ID real do documento, data.nome é o nome do cliente
        selectCliente.innerHTML += `<option value="${doc.id}">${data.nome}</option>`;
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
    select.innerHTML = "<option value=''>Selecione um produto</option>";
    const snapshot = await getDocs(estoqueRef);
    snapshot.forEach(doc => {
        const p = doc.data();
        select.innerHTML += `<option value="${doc.id}" data-preco="${p.preco || 0}" data-quant="${p.quant_estoque || 0}">${p.tipo} - ${doc.id}</option>`;
    });
}

// Adicionar item
async function adicionarItem() {
    const tbody = itensTable.querySelector("tbody") || (itensTable.innerHTML = "<tbody></tbody>" && itensTable.querySelector("tbody"));
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td><select class="form-select produto-select"></select></td>
        <td><input type="number" class="form-control quantidade-input" value="1" min="1"></td>
        <td><input type="text" class="form-control preco-input" value="0"></td>
        <td class="subtotal">0</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
    `;
    tbody.appendChild(tr);

    const produtoSelect = tr.querySelector(".produto-select");
    await carregarProdutos(produtoSelect);

    // Atualiza preço ao trocar produto
    produtoSelect.addEventListener("change", () => {
        const option = produtoSelect.selectedOptions[0];
        const preco = parseFloat(option.dataset.preco || 0);
        tr.querySelector(".preco-input").value = preco.toFixed(2);
        atualizarSubtotal(tr);
    });

    tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));
    tr.querySelector(".preco-input").addEventListener("input", () => atualizarSubtotal(tr));
    tr.querySelector(".btn-remove-item").addEventListener("click", () => {
        tr.remove();
        calcularTotal();
    });

    atualizarSubtotal(tr);
}

// Atualiza subtotal
function atualizarSubtotal(tr) {
    const qtd = parseFloat(tr.querySelector(".quantidade-input").value || 0);
    const preco = parseFloat(tr.querySelector(".preco-input").value.replace(",", ".") || 0);
    tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
    calcularTotal();
}

// Calcula total
function calcularTotal() {
    let total = 0;
    itensTable.querySelectorAll("tr").forEach(tr => {
        total += parseFloat(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    });
    modal.querySelector("input[disabled]").value = `R$ ${total.toFixed(2)}`;
}

// Gerar ID venda
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
    const data = modal.querySelector("input[type=date]").value;

    if (!clienteId) return alert("Selecione um cliente!");
    if (itensTable.querySelectorAll("tr").length === 0) return alert("Adicione ao menos um item!");

    const itens = [];
    for (let tr of itensTable.querySelectorAll("tr")) {
        const produtoId = tr.querySelector(".produto-select").value;
        const qtd = parseInt(tr.querySelector(".quantidade-input").value);
        const preco = parseFloat(tr.querySelector(".preco-input").value.replace(",", "."));

        // Verifica estoque
        const docRef = doc(db, "estoque", produtoId);
        const docSnap = await getDoc(docRef);
        const estoque = docSnap.data().quant_estoque;
        if (qtd > estoque) {
            alert(`Estoque insuficiente para o produto ${docSnap.data().tipo}. Quantidade disponível: ${estoque}`);
            return;
        }

        itens.push({ produtoId, qtd, preco });
    }

    const total = parseFloat(modal.querySelector("input[disabled]").value.replace("R$ ", "").replace(",", "."));
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
    await adicionarItem();
});
