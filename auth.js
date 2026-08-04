/* =========================================================
   ARENA AMADORA — auth.js
   Cadastro e login de atletas / organizadores.
   Agora também gera o Código de Atleta automaticamente
   (sequencial, tipo AA-0001) para quem marca "atleta".
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const abaLogin = document.getElementById("aba-login");
  const abaCadastro = document.getElementById("aba-cadastro");
  const formLogin = document.getElementById("form-login");
  const formCadastro = document.getElementById("form-cadastro");

  function mostrarAba(aba) {
    const ehLogin = aba === "login";
    abaLogin.classList.toggle("ativa", ehLogin);
    abaCadastro.classList.toggle("ativa", !ehLogin);
    formLogin.style.display = ehLogin ? "block" : "none";
    formCadastro.style.display = ehLogin ? "none" : "block";
  }

  abaLogin.addEventListener("click", function () { mostrarAba("login"); });
  abaCadastro.addEventListener("click", function () { mostrarAba("cadastro"); });

  // Preenche selects de modalidade e estado
  const selectModalidades = document.getElementById("cad-modalidades");
  MODALIDADES.forEach(function (m) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = m;
    input.name = "modalidade";
    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + m));
    selectModalidades.appendChild(label);
  });

  const selectEstado = document.getElementById("cad-estado");
  preencherSelect(selectEstado, ESTADOS_BR, false);

  // Mostra/esconde campos de equipe quando "organizador" é marcado
  const checkOrganizador = document.getElementById("cad-tipo-organizador");
  const blocoEquipe = document.getElementById("bloco-equipe");
  checkOrganizador.addEventListener("change", function () {
    blocoEquipe.style.display = checkOrganizador.checked ? "block" : "none";
  });

  /* ---------------- Código de atleta ---------------- */
  // Usa uma transação no contador "contadores/atletas" pra garantir
  // que dois cadastros ao mesmo tempo nunca recebam o mesmo número.
  function gerarCodigoAtleta() {
    return db.ref("contadores/atletas").transaction(function (atual) {
      return (atual || 0) + 1;
    }).then(function (resultado) {
      const numero = resultado.snapshot.val();
      return "AA-" + String(numero).padStart(4, "0");
    });
  }

  /* ---------------- Cadastro ---------------- */

  formCadastro.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const msg = document.getElementById("msg-cadastro");
    msg.className = "mensagem";

    const nome = document.getElementById("cad-nome").value.trim();
    const email = document.getElementById("cad-email").value.trim();
    const senha = document.getElementById("cad-senha").value;
    const telefone = document.getElementById("cad-telefone").value.trim();
    const dataNascimento = document.getElementById("cad-nascimento").value;
    const cidade = document.getElementById("cad-cidade").value.trim();
    const estado = selectEstado.value;
    const nomeEquipe = document.getElementById("cad-nome-equipe").value.trim();

    const tipos = [];
    if (document.getElementById("cad-tipo-atleta").checked) tipos.push("atleta");
    if (checkOrganizador.checked) tipos.push("organizador");

    const modalidades = Array.prototype.slice
      .call(selectModalidades.querySelectorAll("input:checked"))
      .map(function (i) { return i.value; });

    if (!nome || !email || !senha || tipos.length === 0) {
      mostrarMensagem(msg, "Preencha nome, e-mail, senha e selecione ao menos um tipo de participação.", "erro");
      return;
    }
    if (senha.length < 6) {
      mostrarMensagem(msg, "A senha precisa ter pelo menos 6 caracteres.", "erro");
      return;
    }
    const ehAtleta = tipos.indexOf("atleta") !== -1;
    if (ehAtleta && !dataNascimento) {
      mostrarMensagem(msg, "Informe a data de nascimento para participar como atleta.", "erro");
      return;
    }

    const botao = formCadastro.querySelector("button[type=submit]");
    botao.disabled = true;

    auth.createUserWithEmailAndPassword(email, senha)
      .then(function (cred) {
        const uid = cred.user.uid;
        const prosseguir = ehAtleta ? gerarCodigoAtleta() : Promise.resolve(null);

        return prosseguir.then(function (codigoAtleta) {
          return db.ref("usuarios/" + uid).set({
            nome: nome,
            email: email,
            telefone: telefone,
            cidade: cidade,
            estado: estado,
            tipos: tipos,
            modalidades: modalidades,
            nomeEquipe: nomeEquipe || null,
            dataNascimento: dataNascimento || null,
            codigoAtleta: codigoAtleta,
            criadoEm: Date.now()
          });
        });
      })
      .then(function () {
        mostrarMensagem(msg, "Cadastro concluído! Redirecionando...", "ok");
        setTimeout(function () { window.location.href = "torneios.html"; }, 1200);
      })
      .catch(function (erro) {
        mostrarMensagem(msg, traduzirErro(erro), "erro");
        botao.disabled = false;
      });
  });

  /* ---------------- Login ---------------- */

  formLogin.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const msg = document.getElementById("msg-login");
    msg.className = "mensagem";

    const email = document.getElementById("log-email").value.trim();
    const senha = document.getElementById("log-senha").value;
    const botao = formLogin.querySelector("button[type=submit]");
    botao.disabled = true;

    auth.signInWithEmailAndPassword(email, senha)
      .then(function () {
        window.location.href = "torneios.html";
      })
      .catch(function (erro) {
        mostrarMensagem(msg, traduzirErro(erro), "erro");
        botao.disabled = false;
      });
  });

  function traduzirErro(erro) {
    const codigo = erro && erro.code;
    const mapa = {
      "auth/email-already-in-use": "Este e-mail já está cadastrado. Tente fazer login.",
      "auth/invalid-email": "E-mail inválido.",
      "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres).",
      "auth/user-not-found": "E-mail não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/invalid-credential": "E-mail ou senha incorretos."
    };
    return mapa[codigo] || "Ocorreu um erro. Tente novamente.";
  }

  // Se já estiver logado, manda direto pra lista de torneios
  auth.onAuthStateChanged(function (user) {
    if (user) {
      const jaAvisou = sessionStorage.getItem("arena_login_redirect_evitado");
      if (!jaAvisou) {
        // não redireciona automaticamente para permitir trocar de conta,
        // mas mostra aviso discreto
        const aviso = document.getElementById("aviso-logado");
        if (aviso) {
          aviso.style.display = "block";
          aviso.textContent = "Você já está logado como " + user.email + ".";
        }
      }
    }
  });
});
