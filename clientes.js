import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const clientesRef = collection(db, "clientes");

const tabelaClientes = document.getElementById("tabelaClientes");
const btnSalvarCliente = document.getElementById("btnSalvarCliente");
const inputPesquisa = document.getElementById("pesquisaCliente");

let clienteEditando = null;

// Função de validação
function validarCampos(cliente) {
  if (!cliente.id || isNaN(cliente.id.replace(/\D/g,''))) { alert("ID inválido!"); return false; }
  if (!cliente.nome) { alert("Nome obrigatório!"); return false; }

  const cpfCnpj = cliente.cpfCnpj.replace(/\D/g,'');
  if (!(cpfCnpj.length === 11 || cpfCnpj.length === 14)) { alert("CPF deve ter 11 e CNPJ 14 números!"); return false; }
  cliente.cpfCnpj = cpfCnpj;

  const tel = cliente.telefone.replace(/\D/g,'');
  if (tel.length < 10 || tel.length > 11) { alert("Telefone deve ter 10 ou 11 números!"); return false; }
  cliente.telefone = tel;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cliente.email)) { alert("Email inválido!"); return false; }

  const cep = cliente.cep.replace(/\D/g,'');
  if (cep.length !== 8) { alert("CEP deve ter 8 números!"); return false; }
  cliente.cep = cep;

  return true;
}

// Função para buscar endereço pelo CEP
async function buscarEndereco(cepInput, enderecoInput){
  const cep = cepInput.value.replace(/\D/g,'');
  if (cep.length !== 8) return;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (!data.erro) {
      enderecoInput.value = `${data.logradouro}, ${data.bairro}, ${data.localidade}-${data.uf}`;
    }
  } catch(e) { console.error("Erro ao buscar CEP", e); }
}

// Salvar ou editar cliente
async function salvarCliente() {
  const cliente = {
    id: document.getElementById("cliId").value.trim(),
    nome: document.getElementById("cliNome").value.trim(),
    cpfCnpj: document.getElementById("cliCpfCnpj").value.trim(),
    telefone: document.getElementById("cliTelefone").value.trim(),
    cep: document.getElementById("cliCep").value.trim(),
    endereco: document.getElementById("cliEndereco").value.trim(),
    email: document.getElementById("cliEmail").value.trim()
  };

  if (!validarCampos(cliente)) return;

  try {
    const snapshot = await getDocs(clientesRef);
    let idDuplicado = false;

    snapshot.forEach(docItem => {
      const c = docItem.data();
      if (!clienteEditando && c.id === cliente.id) idDuplicado = true;
      if (clienteEditando && c.id === cliente.id && docItem.id !== clienteEditando) idDuplicado = true;
    });

    if (idDuplicado) { alert("ID já existe!"); return; }

    if (clienteEditando) {
      await updateDoc(doc(db,"clientes",clienteEditando), cliente);
      clienteEditando = null;
    } else {
      await addDoc(clientesRef, cliente);
    }

    bootstrap.Modal.getInstance(document.getElementById("modalCadastroCliente")).hide();
    document.getElementById("formCliente").reset();
    listarClientes();
  } catch(e){ console.error(e); alert("Erro ao salvar cliente!"); }
}

// Listar clientes
async function listarClientes(){
  tabelaClientes.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Carregando...</td></tr>`;
  try{
    const snapshot = await getDocs(clientesRef);
    const pesquisa = inputPesquisa.value.trim().toLowerCase();
    let html = "";

    snapshot.forEach(docItem => {
      const c = docItem.data();
      const idDoc = docItem.id;

      if (
        (c.id?.toLowerCase().includes(pesquisa)) ||
        (c.nome?.toLowerCase().includes(pesquisa)) ||
        (c.cpfCnpj?.includes(pesquisa)) ||
        (c.telefone?.includes(pesquisa)) ||
        (c.email?.toLowerCase().includes(pesquisa)) ||
        (c.cep?.includes(pesquisa)) ||
        (c.endereco?.toLowerCase().includes(pesquisa))
      ) {
        html += `<tr>
          <td>${c.id}</td>
          <td>${c.nome}</td>
          <td>${c.cpfCnpj}</td>
          <td>${c.telefone}</td>
          <td>${c.email}</td>
          <td>${c.cep}</td>
          <td>${c.endereco}</td>
          <td>
            <button class="btn btn-sm btn-info me-2 btn-editar" data-id="${idDoc}"><i class="fas fa-edit"></i> Editar</button>
            <button class="btn btn-sm btn-danger btn-excluir" data-id="${idDoc}"><i class="fas fa-trash-alt"></i> Excluir</button>
          </td>
        </tr>`;
      }
    });

    tabelaClientes.innerHTML = html || `<tr><td colspan="8" class="text-center text-muted">Nenhum cliente encontrado.</td></tr>`;

    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", async e=>{
        const id = e.target.closest("button").dataset.id;
        if(confirm("Deseja realmente excluir?")){
          await deleteDoc(doc(db,"clientes",id));
          listarClientes();
        }
      });
    });

    document.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", async e => {
        const id = e.target.closest("button").dataset.id;
        const snapshot = await getDocs(clientesRef);
        snapshot.forEach(docItem=>{
          if(docItem.id===id){
            const c = docItem.data();
            document.getElementById("cliId").value=c.id;
            document.getElementById("cliNome").value=c.nome;
            document.getElementById("cliCpfCnpj").value=c.cpfCnpj;
            document.getElementById("cliTelefone").value=c.telefone;
            document.getElementById("cliCep").value=c.cep;
            document.getElementById("cliEndereco").value=c.endereco;
            document.getElementById("cliEmail").value=c.email;
            clienteEditando=id;
            new bootstrap.Modal(document.getElementById("modalCadastroCliente")).show();
          }
        });
      });
    });

  }catch(e){ console.error(e); tabelaClientes.innerHTML=`<tr><td colspan="8" class="text-center text-danger">Erro ao carregar clientes.</td></tr>`; }
}

// Eventos
btnSalvarCliente.addEventListener("click", salvarCliente);
inputPesquisa.addEventListener("input", listarClientes);
document.getElementById("cliCep").addEventListener("blur", ()=>{
  buscarEndereco(document.getElementById("cliCep"), document.getElementById("cliEndereco"));
});

document.addEventListener("DOMContentLoaded", listarClientes);
