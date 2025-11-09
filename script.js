// === Importações Firebase ===
import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// === Inicialização do site ===
document.addEventListener('DOMContentLoaded', () => {

  // --- LOGIN ---
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('usuario').value.trim();
      const senha = document.getElementById('senha').value.trim();

      try {
        await signInWithEmailAndPassword(auth, email, senha);
        sessionStorage.setItem('loggedIn', 'true');
        window.location.href = 'dashboard.html';
      } catch (error) {
        alert("Usuário ou senha incorretos: " + error.message);
      }
    });
  }

  // --- VERIFICA LOGIN ---
  const restrictedPages = ['dashboard.html','estoque.html','fornecedores.html','clientes.html','vendas.html'];
  const currentPage = window.location.pathname.split('/').pop();
  if (restrictedPages.includes(currentPage) && sessionStorage.getItem('loggedIn') !== 'true') {
    window.location.href = 'index.html';
  }

  // --- MENU MOBILE ---
  const toggleBtn = document.getElementById('menu-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.body.classList.toggle('sidebar-open');
    });
    document.addEventListener('click', e => {
      const sidebar = document.getElementById('sidebar-wrapper');
      if (document.body.classList.contains('sidebar-open') &&
        !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        document.body.classList.remove('sidebar-open');
      }
    });
  }

  // --- LOGOUT ---
  window.logout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
  };

  // --- FUNÇÃO GERAL DE CADASTRO ---
  async function cadastrarEntidade(colecao, data, callback) {
    try {
      await addDoc(collection(db, colecao), data);
      alert(`${colecao} cadastrado com sucesso!`);
      if (callback) callback();
    } catch (error) {
      console.error(error);
      alert(`Erro ao cadastrar ${colecao}: ${error.message}`);
    }
  }

  // --- FUNÇÃO GERAL DE CARREGAR TABELAS ---
  async function carregarTabela(colecao, tbodyId, colunas) {
    try {
      const querySnapshot = await getDocs(collection(db, colecao));
      const tbody = document.querySelector(`#${tbodyId} tbody`);
      if (!tbody) return;
      tbody.innerHTML = "";

      querySnapshot.forEach((doc) => {
        const item = doc.data();
        let linha = `<tr>`;
        colunas.forEach(c => linha += `<td>${item[c] ?? ''}</td>`);
        linha += `<td>
          <button class="btn btn-sm btn-info me-2">Editar</button>
          <button class="btn btn-sm btn-danger">Excluir</button>
        </td></tr>`;
        tbody.innerHTML += linha;
      });
    } catch (error) {
      console.error(`Erro ao carregar ${colecao}:`, error);
    }
  }

  // --- USUÁRIOS ---
  document.querySelector("#btnSalvarUsuario")?.addEventListener("click", async () => {
    const form = document.querySelector("#formUsuario");
    const data = {
      nome: form.nome.value,
      email: form.email.value,
      senha: form.senha.value,
      cargo: form.cargo.value
    };
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.senha);
      await addDoc(collection(db, "usuarios"), {
        nome: data.nome,
        email: data.email,
        cargo: data.cargo
      });
      alert("Usuário cadastrado com sucesso!");
      carregarTabela("usuarios", "tableUsuarios", ["nome", "email", "cargo"]);
    } catch (error) {
      alert("Erro ao cadastrar usuário: " + error.message);
    }
  });
  carregarTabela("usuarios", "tableUsuarios", ["nome", "email", "cargo"]);

  // --- CLIENTES ---
  document.querySelector("#btnSalvarCliente")?.addEventListener("click", () => {
    const form = document.querySelector("#formCliente");
    const data = {
      nome: form.nome.value,
      email: form.email.value,
      telefone: form.telefone.value,
      endereco: form.endereco.value
    };
    cadastrarEntidade("clientes", data, () => carregarTabela("clientes", "tableClientes", ["nome","email","telefone","endereco"]));
  });
  carregarTabela("clientes","tableClientes", ["nome","email","telefone","endereco"]);

  // --- CATEGORIAS ---
  document.querySelector("#btnSalvarCategoria")?.addEventListener("click", () => {
    const form = document.querySelector("#formCategoria");
    const data = { nome: form.nome.value };
    cadastrarEntidade("categorias", data, () => carregarTabela("categorias", "tableCategorias", ["nome"]));
  });
  carregarTabela("categorias","tableCategorias", ["nome"]);

  // --- PRODUTOS ---
  document.querySelector("#btnSalvarProduto")?.addEventListener("click", () => {
    const form = document.querySelector("#formProduto");
    const data = {
      nome: form.nome.value,
      categoria_id: form.categoria_id.value,
      preco: form.preco.value,
      estoque_id: form.estoque_id.value
    };
    cadastrarEntidade("produtos", data, () => carregarTabela("produtos", "tableProduto", ["nome", "categoria_id", "preco", "estoque_id"]));
  });
  carregarTabela("produtos", "tableProduto", ["nome", "categoria_id", "preco", "estoque_id"]);

  // --- FORNECEDORES ---
  document.querySelector("#btnSalvarFornecedor")?.addEventListener("click", () => {
    const form = document.querySelector("#formFornecedor");
    const data = {
      razao_social: form.razao.value,
      cnpj: form.cnpj.value,
      email: form.email.value,
      telefone: form.telefone.value
    };
    cadastrarEntidade("fornecedores", data, () => carregarTabela("fornecedores", "tableFornecedores", ["razao_social","cnpj","email","telefone"]));
  });
  carregarTabela("fornecedores","tableFornecedores", ["razao_social","cnpj","email","telefone"]);

  // --- MATERIAIS ---
  document.querySelector("#btnSalvarMaterial")?.addEventListener("click", () => {
    const form = document.querySelector("#formMaterial");
    const data = {
      nome: form.nome.value,
      fornecedor_id: form.fornecedor_id.value,
      categoria_id: form.categoria_id.value
    };
    cadastrarEntidade("materiais", data, () => carregarTabela("materiais", "tableMateriais", ["nome","fornecedor_id","categoria_id"]));
  });
  carregarTabela("materiais","tableMateriais", ["nome","fornecedor_id","categoria_id"]);

  // --- ESTOQUE ---
  document.querySelector("#btnSalvarEstoque")?.addEventListener("click", () => {
    const form = document.querySelector("#formEstoque");
    const data = {
      produto_id: form.produto_id.value,
      quantidade: form.quantidade.value
    };
    cadastrarEntidade("estoque", data, () => carregarTabela("estoque", "tableEstoque", ["produto_id","quantidade"]));
  });
  carregarTabela("estoque","tableEstoque", ["produto_id","quantidade"]);

  // --- PEDIDOS / VENDAS ---
  document.querySelector("#btnSalvarPedido")?.addEventListener("click", () => {
    const form = document.querySelector("#formPedido");
    const itens = [];
    document.querySelectorAll("#itensPedido tbody tr").forEach(tr => {
      itens.push({
        produto_id: tr.querySelector(".produto_id").value,
        quantidade: tr.querySelector(".quantidade").value,
        preco_unitario: tr.querySelector(".preco_unitario").value
      });
    });
    const data = {
      cliente_id: form.cliente_id.value,
      data: form.data.value,
      status: form.status.value,
      desconto: form.desconto.value,
      total: form.total.value,
      itens: itens
    };
    cadastrarEntidade("pedidos", data, () => carregarTabela("pedidos", "tablePedidos", ["cliente_id","data","status","desconto","total"]));
  });
  carregarTabela("pedidos","tablePedidos", ["cliente_id","data","status","desconto","total"]);

});
