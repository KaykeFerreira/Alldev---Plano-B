import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências Firebase
const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Elementos do modal
const selectCliente = document.getElementById("select-cliente");
const selectStatus = document.getElementById("select-status");
const btnAdicionarItem = document.getElementById("btn-adicionar-item");
const btnFinalizar = document.getElementById("btn-finalizar-venda");
const itensTable = document.getElementById("itens-table");
const valorTotalInput = document.getElementById("valor-total");

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

// Carregar produtos no select
async function carregarProdutos(select) {
    select.innerHTML = `<option value="">Selecione um produto</option>`;
    try {
        const snapshot = await getDocs(estoqueRef);
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
                    ${p.nome} - ${doc.id}
                </option>
            `;
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}

// Adicionar item na tabela
async function adicionarItem() {
    const tbody = itensTable.querySelector("tbody");
    if (!tbody) {
        itensTable.innerHTML = "<tbody></tbody>";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><select class="form-select produto-select"></select></td>
        <td><input type="number" class="form-control quantidade-input" value="1" min="1"></td>
        <td><input type="text" class="form-control preco-input" value="0" disabled></td>
        <td class="subtotal">R$ 0.00</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
    `;
    itensTable.querySelector("tbody").appendChild(tr);

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

// Atualizar subtotal
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

// Calcular total
function calcularTotal() {
    let total = 0;
    itensTable.querySelectorAll("tr").forEach(tr => {
        total += Number(tr.querySelector(".subtotal").textContent.replace("R$ ", "")) || 0;
    });
    valorTotalInput.value = `R$ ${total.toFixed(2)}`;
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
        if (!produtoId) return;
        const qtd = Number(tr.querySelector(".quantidade-input").value);
        const preco = Number(tr.querySelector(".preco-input").value);
        itens.push({ produtoId, qtd, preco });
    });

    const total = Number(valorTotalInput.value.replace("R$ ", ""));
    const venda = { id: await gerarIdVenda(), cliente: clienteId, status, data, itens, total };

    await addDoc(vendasRef, venda);
    alert("Venda cadastrada com sucesso!");

    // Fecha o modal corretamente
    const modalEl = document.getElementById('modalCadastroVenda');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();

    // Limpa itens e valor
    itensTable.querySelector("tbody").innerHTML = "";
    valorTotalInput.value = "";
    await adicionarItem(); // adiciona linha vazia novamente
}

// Eventos
btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    await carregarClientes();
    carregarStatus();
    await adicionarItem(); // linha inicial
});
