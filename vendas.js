import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Seletores do modal
const modal = document.getElementById("modalCadastroVenda");
const selectCliente = modal.querySelector("select:nth-of-type(1)"); // Cliente
const selectStatus = modal.querySelector("select:nth-of-type(2)");  // Status
const produtoSelect = modal.querySelector(".produto-select");
const btnAdicionar = modal.querySelector(".btn-success");
const btnFinalizar = modal.querySelector(".btn-primary");
const itensTable = modal.querySelector("table");

// Lista de itens da venda
let itensVenda = [];

// Carregar clientes no select
async function carregarClientes() {
    selectCliente.innerHTML = "";
    const snapshot = await getDocs(clientesRef);
    snapshot.forEach(docItem => {
        const c = docItem.data();
        selectCliente.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
}

// Carregar status
function carregarStatus() {
    selectStatus.innerHTML = `<option value="Pago">Pago</option><option value="Pendente">Pendente</option>`;
}

// Carregar produtos
async function carregarProdutos(select) {
    const snapshot = await getDocs(estoqueRef);
    select.innerHTML = "";
    snapshot.forEach(docItem => {
        const p = docItem.data();
        select.innerHTML += `<option value="${p.id_item}" data-preco="${p.preco || 0}">${p.tipo} - ${p.id_item}</option>`;
    });
}

// Adicionar item à tabela
async function adicionarItem() {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><select class="form-select produto-select"></select></td>
        <td><input type="number" class="form-control quantidade-input" value="1" min="1"></td>
        <td><input type="text" class="form-control preco-input" value="0"></td>
        <td class="subtotal">0</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
    `;
    itensTable.querySelector("tbody").appendChild(tr);

    const produtoSelect = tr.querySelector(".produto-select");
    await carregarProdutos(produtoSelect);

    // Atualizar preço ao trocar produto
    produtoSelect.addEventListener("change", () => {
        const preco = parseFloat(produtoSelect.selectedOptions[0].dataset.preco || 0);
        tr.querySelector(".preco-input").value = preco;
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

// Atualizar subtotal da linha
function atualizarSubtotal(tr) {
    const qtd = parseFloat(tr.querySelector(".quantidade-input").value || 0);
    const preco = parseFloat(tr.querySelector(".preco-input").value.replace(",",".") || 0);
    tr.querySelector(".subtotal").textContent = `R$ ${(qtd*preco).toFixed(2)}`;
    calcularTotal();
}

// Calcular total da venda
function calcularTotal() {
    let total = 0;
    itensTable.querySelectorAll("tr").forEach(tr => {
        const subtotal = parseFloat(tr.querySelector(".subtotal").textContent.replace("R$ ",""));
        total += subtotal;
    });
    const totalInput = modal.querySelector("input[disabled]");
    totalInput.value = `R$ ${total.toFixed(2)}`;
}

// Gerar ID automático da venda
async function gerarIdVenda() {
    const snapshot = await getDocs(vendasRef);
    let maior = 0;
    snapshot.forEach(docItem => {
        const num = parseInt(docItem.data().id.replace(/\D/g,""));
        if(!isNaN(num) && num>maior) maior=num;
    });
    return "V" + String(maior+1).padStart(3,"0");
}

// Finalizar venda
async function finalizarVenda() {
    const clienteId = selectCliente.value;
    const status = selectStatus.value;
    const data = modal.querySelector("input[type=date]").value;

    if(!clienteId){ alert("Selecione um cliente!"); return; }
    if(itensTable.querySelectorAll("tr").length===0){ alert("Adicione ao menos um item!"); return; }

    const itens = [];
    itensTable.querySelectorAll("tr").forEach(tr=>{
        const produtoId = tr.querySelector(".produto-select").value;
        const qtd = parseInt(tr.querySelector(".quantidade-input").value);
        const preco = parseFloat(tr.querySelector(".preco-input").value.replace(",","."));
        itens.push({produtoId,qtd,preco});
    });

    const total = parseFloat(modal.querySelector("input[disabled]").value.replace("R$ ","").replace(",","."));

    const venda = {
        id: await gerarIdVenda(),
        cliente: clienteId,
        data,
        status,
        itens,
        total
    };

    await addDoc(vendasRef, venda);
    alert("Venda cadastrada com sucesso!");
    location.reload();
}

// Eventos
btnAdicionar.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    await carregarClientes();
    carregarStatus();
    await adicionarItem();
});
