import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Elements
const selectCliente = document.querySelector("#modalCadastroVenda select.cliente-select");
const selectStatus = document.querySelector("#modalCadastroVenda select.status-select");
const itensContainer = document.querySelector("#modalCadastroVenda .itens-tabela tbody");
const btnAdicionarItem = document.querySelector("#modalCadastroVenda .btn-add-item");
const descontoInput = document.querySelector("#modalCadastroVenda input.desconto-input");
const totalInput = document.querySelector("#modalCadastroVenda input.total-input");
const btnFinalizarVenda = document.querySelector("#modalCadastroVenda .btn-finalizar-venda");

let itensVenda = [];

// Carregar clientes do Firestore
async function carregarClientes() {
    selectCliente.innerHTML = '';
    const snapshot = await getDocs(clientesRef);
    snapshot.forEach(docItem => {
        const c = docItem.data();
        selectCliente.innerHTML += `<option value="${c.id}">${c.nome} (${c.id})</option>`;
    });
}

// Carregar status
function carregarStatus() {
    selectStatus.innerHTML = `<option value="Pago">Pago</option><option value="Pendente">Pendente</option>`;
}

// Carregar produtos do estoque
async function carregarProdutos() {
    const selectsProdutos = document.querySelectorAll(".produto-select");
    const snapshot = await getDocs(estoqueRef);
    let options = "";
    snapshot.forEach(docItem => {
        const p = docItem.data();
        options += `<option value="${p.id_item}" data-preco="${p.preco || 0}">${p.tipo} - ${p.id_item}</option>`;
    });
    selectsProdutos.forEach(sel => sel.innerHTML = options);
}

// Adicionar linha de item
function adicionarLinhaItem() {
    const tbody = itensContainer;
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>
            <select class="form-select produto-select"></select>
        </td>
        <td>
            <input type="number" class="form-control quantidade-input" value="1" min="1">
        </td>
        <td>
            <input type="text" class="form-control preco-input" value="0">
        </td>
        <td class="subtotal">0</td>
        <td>
            <button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
    carregarProdutos();
    atualizarSubtotal(tr);

    // Evento remover
    tr.querySelector(".btn-remove-item").addEventListener("click", () => {
        tr.remove();
        calcularTotal();
    });

    // Eventos para recalcular subtotal
    tr.querySelector(".quantidade-input").addEventListener("input", () => atualizarSubtotal(tr));
    tr.querySelector(".preco-input").addEventListener("input", () => atualizarSubtotal(tr));
}

// Atualizar subtotal da linha
function atualizarSubtotal(tr) {
    const qtd = parseFloat(tr.querySelector(".quantidade-input").value || 0);
    const preco = parseFloat(tr.querySelector(".preco-input").value.replace(",",".") || 0);
    const subtotal = qtd * preco;
    tr.querySelector(".subtotal").textContent = `R$ ${subtotal.toFixed(2)}`;
    calcularTotal();
}

// Calcular total da venda
function calcularTotal() {
    let total = 0;
    itensContainer.querySelectorAll("tr").forEach(tr => {
        const subtotal = parseFloat(tr.querySelector(".subtotal").textContent.replace("R$ ",""));
        total += subtotal;
    });
    const desconto = parseFloat(descontoInput.value.replace(",",".") || 0);
    totalInput.value = `R$ ${(total - desconto).toFixed(2)}`;
}

// Gerar ID automático
async function gerarIdVenda() {
    const snapshot = await getDocs(vendasRef);
    let maiorNum = 0;
    snapshot.forEach(docItem => {
        const id = docItem.data().id;
        const num = parseInt(id.replace(/\D/g,""));
        if(!isNaN(num) && num > maiorNum) maiorNum = num;
    });
    return "V" + String(maiorNum + 1).padStart(3,"0");
}

// Salvar venda
async function salvarVenda() {
    const clienteId = selectCliente.value;
    const status = selectStatus.value;
    const data = document.querySelector("#modalCadastroVenda input[type=date]").value;

    if(!clienteId){ alert("Selecione um cliente!"); return; }
    if(itensContainer.querySelectorAll("tr").length === 0){ alert("Adicione ao menos um item!"); return; }

    const itens = [];
    itensContainer.querySelectorAll("tr").forEach(tr=>{
        const produtoId = tr.querySelector(".produto-select").value;
        const qtd = parseInt(tr.querySelector(".quantidade-input").value);
        const preco = parseFloat(tr.querySelector(".preco-input").value.replace(",","."));
        itens.push({produtoId, qtd, preco});
    });

    const total = parseFloat(totalInput.value.replace("R$ ","").replace(",","."));
    const desconto = parseFloat(descontoInput.value.replace(",",".") || 0);

    const venda = {
        id: await gerarIdVenda(),
        cliente: clienteId,
        data,
        status,
        itens,
        desconto,
        total
    };

    await addDoc(vendasRef, venda);
    alert("Venda cadastrada com sucesso!");
    location.reload();
}

// Eventos
btnAdicionarItem.addEventListener("click", adicionarLinhaItem);
descontoInput.addEventListener("input", calcularTotal);
btnFinalizarVenda.addEventListener("click", salvarVenda);

document.addEventListener("DOMContentLoaded", async () => {
    await carregarClientes();
    carregarStatus();
    adicionarLinhaItem(); // adiciona a primeira linha
});
