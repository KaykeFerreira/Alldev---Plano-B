document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const usuario = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;
            if (usuario === 'admin' && senha === '123') {
                sessionStorage.setItem('loggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert('Usuário ou senha incorretos.');
            }
        });
    }

    // --- VERIFICA LOGIN ---
    const restrictedPages = ['dashboard.html','estoque.html','fornecedores.html','clientes.html','vendas.html'];
    const currentPage = window.location.pathname.split('/').pop();
    if(restrictedPages.includes(currentPage) && sessionStorage.getItem('loggedIn') !== 'true'){
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
            if(document.body.classList.contains('sidebar-open') &&
                !sidebar.contains(e.target) && !toggleBtn.contains(e.target)){
                    document.body.classList.remove('sidebar-open');
            }
        });
    }

    // --- LOGOUT ---
    window.logout = () => {
        sessionStorage.removeItem('loggedIn');
        window.location.href = 'index.html';
    };

    // --- FUNÇÃO GERAL DE CADASTRO ---
    function cadastrarEntidade(endpoint, data, callback){
        fetch(`https://zack-unspeedy-nonmenially.ngrok-free.dev/${endpoint}`, {   // 🔧 alterado para o IP do servidor Flask
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            alert(res.message);
            if(callback) callback();
        })
        .catch(err => {
            console.error(err);
            alert(`Erro ao cadastrar ${endpoint}`);
        });
    }

    // --- FUNÇÃO GERAL DE CARREGAR TABELAS ---
    function carregarTabela(endpoint, tbodyId, colunas){
        fetch(`https://zack-unspeedy-nonmenially.ngrok-free.dev/${endpoint}`)   // 🔧 alterado para o IP do servidor Flask
        .then(res => res.json())
        .then(items => {
            const tbody = document.querySelector(`#${tbodyId} tbody`);
            if(!tbody) return;
            tbody.innerHTML = "";
            items.forEach(item => {
                let linha = `<tr>`;
                colunas.forEach(c => linha += `<td>${item[c]}</td>`);
                linha += `<td>
                    <button class="btn btn-sm btn-info me-2">Editar</button>
                    <button class="btn btn-sm btn-danger">Excluir</button>
                </td></tr>`;
                tbody.innerHTML += linha;
            });
        })
        .catch(err => console.error(`Erro ao carregar ${endpoint}:`, err));
    }

    // --- USUARIOS ---
    document.querySelector("#btnSalvarUsuario")?.addEventListener("click", () => {
        const form = document.querySelector("#formUsuario");
        const data = {
            nome: form.nome.value,
            email: form.email.value,
            senha: form.senha.value,
            cargo: form.cargo.value
        };
        cadastrarEntidade("usuario", data, () => carregarTabela("usuario", "tableUsuarios", ["id","nome","email","cargo"]));
    });
    carregarTabela("usuario","tableUsuarios", ["id","nome","email","cargo"]);

    // --- CLIENTES ---
    document.querySelector("#btnSalvarCliente")?.addEventListener("click", () => {
        const form = document.querySelector("#formCliente");
        const data = {
            nome: form.nome.value,
            email: form.email.value,
            telefone: form.telefone.value,
            endereco: form.endereco.value
        };
        cadastrarEntidade("cliente", data, () => carregarTabela("cliente", "tableClientes", ["id","nome","email","telefone","endereco"]));
    });
    carregarTabela("cliente","tableClientes", ["id","nome","email","telefone","endereco"]);

    // --- CATEGORIAS ---
    document.querySelector("#btnSalvarCategoria")?.addEventListener("click", () => {
        const form = document.querySelector("#formCategoria");
        const data = { nome: form.nome.value };
        cadastrarEntidade("categoria", data, () => carregarTabela("categoria", "tableCategorias", ["id","nome"]));
    });
    carregarTabela("categoria","tableCategorias", ["id","nome"]);

    // --- PRODUTOS ---
    document.querySelector("#btnSalvarProduto")?.addEventListener("click", () => {
        const form = document.querySelector("#formProduto");
        if (!form) {
            console.error("Formulário #formProduto não encontrado!");
            return;
        }

        const data = {
            nome: form.nome.value,
            categoria_id: form.categoria_id.value,
            preco: form.preco.value,
            estoque_id: form.estoque_id.value
        };

        cadastrarEntidade("produto", data, () =>
            carregarTabela("produto", "tableProduto", ["id", "nome", "categoria_id", "preco", "estoque_id"])
        );
    });
    carregarTabela("produto", "tableProduto", ["id", "nome", "categoria_id", "preco", "estoque_id"]);

    // --- FORNECEDORES ---
    document.querySelector("#btnSalvarFornecedor")?.addEventListener("click", () => {
        const form = document.querySelector("#formFornecedor");
        const data = {
            razao_social: form.razao.value,
            cnpj: form.cnpj.value,
            email: form.email.value,
            telefone: form.telefone.value
        };
        cadastrarEntidade("fornecedor", data, () => carregarTabela("fornecedor", "tableFornecedores", ["id","razao_social","cnpj","email","telefone"]));
    });
    carregarTabela("fornecedor","tableFornecedores", ["id","razao_social","cnpj","email","telefone"]);

    // --- MATERIAIS ---
    document.querySelector("#btnSalvarMaterial")?.addEventListener("click", () => {
        const form = document.querySelector("#formMaterial");
        const data = {
            nome: form.nome.value,
            fornecedor_id: form.fornecedor_id.value,
            categoria_id: form.categoria_id.value
        };
        cadastrarEntidade("material", data, () => carregarTabela("material", "tableMateriais", ["id","nome","fornecedor_id","categoria_id"]));
    });
    carregarTabela("material","tableMateriais", ["id","nome","fornecedor_id","categoria_id"]);

    // --- ESTOQUE ---
    document.querySelector("#btnSalvarEstoque")?.addEventListener("click", () => {
        const form = document.querySelector("#formEstoque");
        const data = {
            produto_id: form.produto_id.value,
            quantidade: form.quantidade.value
        };
        cadastrarEntidade("estoque", data, () => carregarTabela("estoque", "tableEstoque", ["id","produto_id","quantidade"]));
    });
    carregarTabela("estoque","tableEstoque", ["id","produto_id","quantidade"]);

    // --- PEDIDOS ---
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
        cadastrarEntidade("pedido", data, () => carregarTabela("pedido", "tablePedidos", ["id","cliente_id","data","status","desconto","total"]));
    });
    carregarTabela("pedido","tablePedidos", ["id","cliente_id","data","status","desconto","total"]);

});



