// login.js
import { auth, signInWithEmailAndPassword } from "./firebaseConfig.js";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    alert("Login realizado com sucesso!");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Erro ao fazer login:", error.message);

    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      alert("Usuário ou senha incorretos.");
    } else if (error.code === "auth/user-not-found") {
      alert("Usuário não encontrado. Verifique seu e-mail.");
    } else {
      alert("Erro ao fazer login. Tente novamente mais tarde.");
    }
  }
});
