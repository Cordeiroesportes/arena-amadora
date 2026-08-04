/* =========================================================
   ARENA AMADORA — configuração do Firebase
   Usa o Compat SDK (não ES modules) de propósito, pelo mesmo
   motivo do Guia ExKombeiros: melhor compatibilidade com
   Safari mobile / iOS.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCtwzdZPnWVuVTnnnEw_MXHX7RYEkIXf7Y",
  authDomain: "arena-amadora.firebaseapp.com",
  databaseURL: "FALTA_PREENCHER", // <-- pegue esse valor na Parte 7 do guia (Realtime Database)
  projectId: "arena-amadora",
  storageBucket: "arena-amadora.firebasestorage.app",
  messagingSenderId: "169173529791",
  appId: "1:169173529791:web:384af7f83579d11f72820a"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

/* ---------------------------------------------------------
   Listas de referência compartilhadas entre as páginas.
   Centralizadas aqui para não duplicar em cada arquivo.
   --------------------------------------------------------- */

const MODALIDADES = [
  "Futebol 4x4",
  "Futebol Society",
  "Futebol de Campo",
  "Futsal",
  "Vôlei",
  "Vôlei de Praia",
  "Pique-bol",
  "Beach Tennis",
  "Basquete 3x3",
  "Handebol"
];

const CATEGORIAS = ["Infantil", "Juvenil", "Adulto", "Master", "Livre"];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

/* E-mails com acesso ao painel de aprovação de torneios.
   Ajuste para os e-mails reais de vocês dois antes de publicar. */
const ADMIN_EMAILS = [
  "seuemail@exemplo.com",
  "emaildoseuirmao@exemplo.com"
];

/* ---------------------------------------------------------
   Helpers pequenos reutilizados nas páginas
   --------------------------------------------------------- */

function preencherSelect(elemento, opcoes, comTodos) {
  if (comTodos) {
    const optTodos = document.createElement("option");
    optTodos.value = "";
    optTodos.textContent = "Todas";
    elemento.appendChild(optTodos);
  }
  opcoes.forEach(function (opcao) {
    const opt = document.createElement("option");
    opt.value = opcao;
    opt.textContent = opcao;
    elemento.appendChild(opt);
  });
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensagem " + (tipo === "erro" ? "erro" : "ok");
}
