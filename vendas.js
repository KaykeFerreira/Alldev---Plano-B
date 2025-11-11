import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Referências no Firestore
const clientesRef = collection(db, "clientes");
const produtosRef = collection(db, "produtos");
const vendasRef = collection(db, "vendas");

const clienteSelect = document.getElementById("cliente");
const itensContainer = document.getElementById("itensContainer");
const btnAddItem = document.getElementById("adicionarItem");
const btnCadastrar = document.getElementById("cadastrarVenda");
const listaVendas = document.getElementById("listaVendas");

let produtos = [];
let clientes = [];

// ======= CARREGAR CLIENTES E PRODUTOS =======
async function carregarDados() {
  try {
    const clientesSnap = await getDocs(clientesRef);
    clientes = clientesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    clienteSelect.innerHTML =
      "<option value=''>Selecione o cliente</option>" +
      clientes.map((c) => `<option value='${c.id}'>${c.nome}</option>`).join("");

    const produtosSnap = await getDocs(produtosRef);
    produtos = produtosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    console.log("Produtos carregados:", produtos);
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}

// ======= ADICIONAR ITEM =======
function adicionarItem() {
  const itemDiv = document.createElement("div");
  itemDiv.classList.add("itemVenda");
  itemDiv.innerHTML = `
    <select class="produtoSelect">
      <option value="">Selecione o produto</option>
      ${produtos
        .map(
          (p) =>
            `<option value="${p.id}" data-quantidade="${p.quantidade}" data-nome="${p.nome}">
              ${p.nome} (${p.marca})
            </option>`
        )
        .join("")}
    </select>

    <input type="number" class="quantidadeInput" placeholder="Qtd" min="1" />
    <button class="removerItem">Remover</button>
  `;

  itensContainer.appendChild(itemDiv);

  itemDiv.querySelector(".removerItem").addEventListener("click", () => {
    itemDiv.remove();
  });
}

// ======= CADASTRAR VENDA =======
async function cadastrarVenda() {
  const clienteId = clienteSelect.value;
  if (!clienteId) {
    alert("Selecione um cliente!");
    return;
  }

  const itens = [];
  const itensDivs = itensContainer.querySelectorAll(".itemVenda");

  for (let div of itensDivs) {
    const select = div.querySelector(".produtoSelect");
    const inputQtd = div.querySelector(".quantidadeInput");

    const produtoId = select.value;
    const quantidade = Number(inputQtd.value);

    if (!produtoId || quantidade <= 0) continue;

    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) continue;

    if (quantidade > produto.quantidade) {
      alert(`Quantidade maior que o estoque do produto ${produto.nome}`);
      return;
    }

    itens.push({
      produtoId,
      produtoNome: produto.nome,
      quantidade,
    });

    await updateDoc(doc(db, "produtos", produtoId), {
      quantidade: produto.quantidade - quantidade,
    });
  }

  if (itens.length === 0) {
    alert("Adicione pelo menos um produto válido!");
    return;
  }

  const novaVenda = {
    clienteId,
    itens,
    criadoEm: new Date().toISOString(),
  };

  await addDoc(vendasRef, novaVenda);
  alert("Venda cadastrada com sucesso!");

  itensContainer.innerHTML = "";
  clienteSelect.value = "";
  carregarVendas();
}

// ======= CARREGAR VENDAS =======
async function carregarVendas() {
  listaVendas.innerHTML = "";
  const vendasSnap = await getDocs(vendasRef);

  for (let d of vendasSnap.docs) {
    const venda = { id: d.id, ...d.data() };
    const cliente = clientes.find((c) => c.id === venda.clienteId);

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>Cliente:</strong> ${cliente ? cliente.nome : "Desconhecido"}<br>
      <button class="detalhesVenda">Detalhes</button>
      <button class="editarVenda">Editar</button>
      <button class="excluirVenda">Excluir</button>
    `;

    // BOTÃO DETALHES
    li.querySelector(".detalhesVenda").addEventListener("click", () => {
      const detalhes = venda.itens
        .map(
          (i) =>
            `Produto: ${i.produtoNome} — Quantidade: ${i.quantidade}`
        )
        .join("\n");
      alert(
        `Venda de ${cliente ? cliente.nome : "Desconhecido"}\n\n${detalhes}\n\nData: ${
          venda.criadoEm
        }`
      );
    });

    // BOTÃO EDITAR
    li.querySelector(".editarVenda").addEventListener("click", async () => {
      const novaQtd = prompt("Digite a nova quantidade (para todos os produtos):");
      if (!novaQtd) return;

      const novosItens = venda.itens.map((i) => ({
        ...i,
        quantidade: Number(novaQtd),
      }));

      await updateDoc(doc(db, "vendas", venda.id), { itens: novosItens });
      alert("Venda atualizada!");
      carregarVendas();
    });

    // BOTÃO EXCLUIR
    li.querySelector(".excluirVenda").addEventListener("click", async () => {
      if (confirm("Tem certeza que deseja excluir esta venda?")) {
        await deleteDoc(doc(db, "vendas", venda.id));
        alert("Venda excluída!");
        carregarVendas();
      }
    });

    listaVendas.appendChild(li);
  }
}

// ======= EVENTOS =======
btnAddItem.addEventListener("click", adicionarItem);
btnCadastrar.addEventListener("click", cadastrarVenda);

// ======= INICIALIZAÇÃO =======
carregarDados().then(carregarVendas);
