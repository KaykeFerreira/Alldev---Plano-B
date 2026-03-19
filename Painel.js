import { auth, db } from "firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// 🔹 Verifica se o usuário está logado
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("user-name").textContent = user.email;
    carregarDados();
  } else {
    window.location.href = "login.html";
  }
});

// 🔹 Função para carregar estatísticas (exemplo)
async function carregarDados() {
  const produtosSnap = await getDocs(collection(db, "produtos"));
  const clientesSnap = await getDocs(collection(db, "clientes"));

  document.getElementById("estoque-count").textContent = produtosSnap.size;
  document.getElementById("clientes-count").textContent = clientesSnap.size;

  document.getElementById("estoque-alert").textContent =
    produtosSnap.size > 0 ? "Tudo certo com o estoque" : "Nenhum produto cadastrado";
}

// 🔹 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
