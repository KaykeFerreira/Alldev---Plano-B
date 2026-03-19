// Importações do Firebase
import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Captura do formulário
const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value;

  try {
    // Faz login no Firebase Auth
    await signInWithEmailAndPassword(auth, email, senha);
    alert("✅ Login realizado com sucesso!");
    window.location.href = "dashboard.html"; // Redireciona após o login
  } catch (error) {
    console.error("Erro ao fazer login:", error.code, error.message);

    // Tratamento de erros comuns do Firebase
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      alert("❌ Usuário ou senha incorretos.");
    } else if (error.code === "auth/user-not-found") {
      alert("❌ Usuário não encontrado. Verifique o e-mail digitado.");
    } else if (error.code === "auth/invalid-email") {
      alert("⚠️ Formato de e-mail inválido.");
    } else {
      alert("⚠️ Erro ao fazer login. Tente novamente mais tarde.");
    }
  }
});
