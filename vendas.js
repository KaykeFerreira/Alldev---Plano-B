// vendas.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências Firestore
const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Modal elementos
const modal = document.getElementById("modalCadastroVenda");
const selects = modal.querySelectorAll("select.form-select");
const selectCliente = selects[0]; // cliente
const selectStatus = selects[1];  // status
const btnAdicionarItem = modal.querySelector(".btn-success");
const btnFinalizar = modal.querySelector(".btn-primary");
const itensTable = modal.querySelector("table");

// Carregar clientes
async function carregarClientes() {
    selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
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

// Carregar produtos em select
async function carregarProdutos(select) {
    select.innerHTML = '<option value="">Selecione um produto</option>';
    const snapshot = await getDocs(estoqueRef);
    snapshot.forEach(doc => {
        const p = doc.data();
        select.innerHTML += `<option value="${doc.id}" data-preco="${p.preco || 0}" data-estoque="${p.quant_estoque || 0}">${p.tipo} - ${doc.id}</option>`;
    });
}

// Adicionar item
async function adicionarItem() {
    const tbody = itensTable.querySelector("tbody") || (() => { itensTable.innerHTML = "<tbody></tbody>"; return itensTable.querySelector("tbody"); })();
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
    const qtdInput = tr.querySelector(".quantidade-input");
    const precoInput = tr.querySelector(".preco-input");

    await carregarProdutos(produtoSelect);

    produtoSelect.addEventListener("change", () => {
        const selected = produtoSelect.selectedOptions[0];
        const preco = parseFloat(selected.dataset.preco || 0);
        precoInput.value = preco.toFixed(2);
        qtdInput.max = parseInt(selected.dataset.estoque || 0);
        atualizarSubtotal(tr);
    });

    qtdInput.addEventListener("input", () => {
        const max = parseInt(qtdInput.max);
        if (qtdInput.value > max) {
            alert(`Quantidade indisponível no estoque! Máximo: ${max}`);
            qtdInput.value = max;
        }
        atualizarSubtotal(tr);
    });

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
    tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
    calcularTotal();
}

// Calcular total
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
    itensTable.querySelectorAll("tr").forEach(tr => {
        const produtoId = tr.querySelector(".produto-select").value;
        const qtd = parseInt(tr.querySelector(".quantidade-input").value);
        const preco = parseFloat(tr.querySelector(".preco-input").value);
        itens.push({ produtoId, qtd, preco });
    });

    const total = parseFloat(modal.querySelector("input[disabled]").value.replace("R$ ", ""));
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
