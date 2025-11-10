import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

const selectCliente = document.querySelector("#modalCadastroVenda select:nth-of-type(1)");
const selectStatus = document.querySelector("#modalCadastroVenda select:nth-of-type(2)");
const itensContainer = document.querySelector("#modalCadastroVenda .border table");
const btnAdicionarItem = document.querySelector("#modalCadastroVenda .border button");
const descontoInput = document.querySelector("#modalCadastroVenda input[placeholder='Desconto']");
const totalInput = document.querySelector("#modalCadastroVenda input[disabled]");
const btnFinalizarVenda = document.querySelector("#modalCadastroVenda .btn-primary");

let itensVenda = [];

// Carregar clientes no select
async function carregarClientes() {
    selectCliente.innerHTML = "";
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

// Adicionar item à tabela
function adicionarItem() {
    const produtoSel = document.querySelector(".produto-select:last-child");
    const qtdInput = document.querySelector(".quantidade-input:last-child");
    const precoInput = document.querySelector(".preco-input:last-child");

    const produtoId = produtoSel.value;
    const produtoTexto = produtoSel.options[produtoSel.selectedIndex].text;
    const qtd = parseInt(qtdInput.value) || 1;
    const preco = parseFloat(precoInput.value.replace(",",".") || 0);

    itensVenda.push({produtoId, produtoTexto, qtd, preco});
    renderizarItens();
}

// Renderizar tabela de itens
function renderizarItens() {
    itensContainer.innerHTML = `
        <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Preço Unitário</th>
            <th>Subtotal</th>
            <th>Opções</th>
        </tr>
    `;
    let total = 0;
    itensVenda.forEach((item, index)=>{
        const subtotal = item.qtd * item.preco;
        total += subtotal;
        itensContainer.innerHTML += `
            <tr>
                <td>${item.produtoTexto}</td>
                <td>${item.qtd}</td>
                <td>R$ ${item.preco.toFixed(2)}</td>
                <td>R$ ${subtotal.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-danger" data-index="${index}"><i class="fas fa-trash-alt"></i></button></td>
            </tr>
        `;
    });
    const desconto = parseFloat(descontoInput.value.replace(",",".") || 0);
    totalInput.value = `R$ ${(total - desconto).toFixed(2)}`;

    // remover item
    document.querySelectorAll("#modalCadastroVenda .btn-danger").forEach(btn=>{
        btn.addEventListener("click", e=>{
            const idx = parseInt(e.target.closest("button").dataset.index);
            itensVenda.splice(idx,1);
            renderizarItens();
        });
    });
}

// Gerar ID automático da venda
async function gerarIdVenda() {
    const snapshot = await getDocs(vendasRef);
    let maiorNum = 0;
    snapshot.forEach(docItem=>{
        const id = docItem.data().id;
        const num = parseInt(id.replace(/\D/g,""));
        if(!isNaN(num) && num > maiorNum) maiorNum = num;
    });
    return "V" + String(maiorNum + 1).padStart(3,"0");
}

// Salvar venda
async function salvarVenda() {
    if(itensVenda.length === 0){ alert("Adicione ao menos um item!"); return; }
    const venda = {
        id: await gerarIdVenda(),
        cliente: selectCliente.value,
        data: document.querySelector("#modalCadastroVenda input[type=date]").value,
        status: selectStatus.value,
        itens: itensVenda,
        desconto: parseFloat(descontoInput.value.replace(",",".") || 0),
        total: parseFloat(totalInput.value.replace("R$ ","").replace(",","."))
    };
    await addDoc(vendasRef, venda);
    alert("Venda registrada com sucesso!");
    location.reload(); // ou atualizar lista
}

// Eventos
btnAdicionarItem.addEventListener("click", ()=>{
    adicionarItem();
    carregarProdutos();
});

descontoInput.addEventListener("input", renderizarItens);
btnFinalizarVenda.addEventListener("click", salvarVenda);

document.addEventListener("DOMContentLoaded", async ()=>{
    await carregarClientes();
    carregarStatus();
    await carregarProdutos();
});
