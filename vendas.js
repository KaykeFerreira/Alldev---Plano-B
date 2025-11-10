import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências Firebase
const clientesRef = collection(db, "clientes");
const estoqueRef = collection(db, "estoque");
const vendasRef = collection(db, "vendas");

// Elementos do modal
const modalVendaEl = document.getElementById('modalCadastroVenda');
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

// Carregar produtos no select (sem alteração lógica, já estava certo)
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

// Adicionar item na tabela (CORRIGIDO: Preenchimento inicial e estrutura)
async function adicionarItem() {
    const tbody = itensTable.querySelector("tbody");
    
    // Cria a nova linha da tabela
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><select class="form-select produto-select"></select></td>
        <td><input type="number" class="form-control quantidade-input" value="1" min="1"></td>
        <td><input type="text" class="form-control preco-input" value="0.00" disabled></td>
        <td class="subtotal">R$ 0.00</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="fas fa-trash-alt"></i></button></td>
    `;
    tbody.appendChild(tr);

    // Carrega os produtos no select recém-criado
    const produtoSelect = tr.querySelector(".produto-select");
    await carregarProdutos(produtoSelect);
    
    // Inicializa o preço do primeiro produto (se houver)
    const precoInicial = Number(produtoSelect.selectedOptions[0]?.dataset.preco || 0);
    tr.querySelector(".preco-input").value = precoInicial.toFixed(2);

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

    // Calcula o subtotal inicial
    atualizarSubtotal(tr);
}

// Atualizar subtotal (Mantido)
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

    // Limita a quantidade pelo estoque
    if (qtd > estoqueDisponivel) {
        qtd = estoqueDisponivel;
        tr.querySelector(".quantidade-input").value = qtd;
    }

    tr.querySelector(".subtotal").textContent = `R$ ${(qtd * preco).toFixed(2)}`;
    calcularTotal();
}

// Calcular total (Mantido)
function calcularTotal() {
    let total = 0;
    itensTable.querySelectorAll("tr").forEach(tr => {
        // Pega o valor do subtotal na célula <td> e ignora o 'R$ '
        const subtotalText = tr.querySelector(".subtotal").textContent;
        total += Number(subtotalText.replace("R$ ", "")) || 0;
    });
    valorTotalInput.value = `R$ ${total.toFixed(2)}`;
}

// Gerar ID da venda (Mantido)
async function gerarIdVenda() {
    const snapshot = await getDocs(vendasRef);
    let maior = 0;
    snapshot.forEach(doc => {
        const num = parseInt(doc.data().id.replace(/\D/g, ""));
        if (!isNaN(num) && num > maior) maior = num;
    });
    return "V" + String(maior + 1).padStart(3, "0");
}

// Finalizar venda (Mantido)
async function finalizarVenda() {
    const clienteId = selectCliente.value;
    const status = selectStatus.value;
    const data = document.querySelector("#modalCadastroVenda input[type=date]").value;

    if (!clienteId) return alert("Selecione um cliente!");
    if (itensTable.querySelectorAll("tr").length === 0) return alert("Adicione ao menos um item!");

    const itens = [];
    itensTable.querySelectorAll("tr").forEach(tr => {
        const produtoSelect = tr.querySelector(".produto-select");
        const produtoId = produtoSelect.value;
        
        if (produtoId) { // Só adiciona itens que foram realmente selecionados
            const qtd = Number(tr.querySelector(".quantidade-input").value);
            const preco = Number(tr.querySelector(".preco-input").value);
            itens.push({ produtoId, qtd, preco, nome: produtoSelect.selectedOptions[0].textContent.split(' - ')[0] }); // Opcional: salva o nome
        }
    });
    
    if (itens.length === 0) return alert("Nenhum produto válido foi selecionado.");

    const total = Number(valorTotalInput.value.replace("R$ ", ""));
    const venda = { id: await gerarIdVenda(), cliente: clienteId, status, data, itens, total, timestamp: new Date() };

    await addDoc(vendasRef, venda);
    alert("Venda cadastrada com sucesso!");

    // Fecha o modal corretamente
    const modal = bootstrap.Modal.getOrCreateInstance(modalVendaEl);
    modal.hide();

    // Limpa itens e valor para novo uso
    itensTable.querySelector("tbody").innerHTML = "";
    valorTotalInput.value = "";
    await adicionarItem(); // adiciona linha vazia novamente
}

// Eventos
btnAdicionarItem.addEventListener("click", adicionarItem);
btnFinalizar.addEventListener("click", finalizarVenda);

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
    // CORREÇÃO: Usar um listener para carregar os dados somente quando o modal é aberto
    modalVendaEl.addEventListener('show.bs.modal', async () => {
        await carregarClientes();
        carregarStatus();
        itensTable.querySelector("tbody").innerHTML = ""; // Limpa itens antigos
        await adicionarItem(); // Adiciona primeira linha
    });

    // Se o modal não abrir na inicialização, pelo menos carrega o básico:
    await carregarClientes();
    carregarStatus();
});
