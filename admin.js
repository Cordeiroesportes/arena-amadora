/* =========================================================
   ARENA AMADORA — admin.js
   Painel restrito (ADMIN_EMAILS) para aprovar/rejeitar
   torneios cadastrados por organizadores.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const blocoLogin = document.getElementById("admin-login");
  const blocoPainel = document.getElementById("admin-painel");
  const blocoNegado = document.getElementById("admin-negado");
  const formLogin = document.getElementById("form-admin-login");
  const listaPendentes = document.getElementById("lista-pendentes");
  const listaAprovados = document.getElementById("lista-aprovados");

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
  }

  formLogin.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const msg = document.getElementById("msg-admin-login");
    msg.className = "mensagem";
    const email = document.getElementById("admin-email").value.trim();
    const senha = document.getElementById("admin-senha").value;

    auth.signInWithEmailAndPassword(email, senha)
      .catch(function (erro) {
        mostrarMensagem(msg, "Não foi possível entrar. Confira e-mail e senha.", "erro");
      });
  });

  document.getElementById("botao-sair").addEventListener("click", function () {
    auth.signOut();
  });

  function criarLinhaTorneio(id, t, pendente) {
    const div = document.createElement("div");
    div.className = "sumula";
    div.innerHTML =
      '<div class="sumula-cabecalho">' +
        '<div><div class="sumula-modalidade">' + escapeHtml(t.modalidade) + " · " + escapeHtml(t.categoria) + '</div>' +
        '<h3 class="sumula-nome">' + escapeHtml(t.nome) + "</h3></div>" +
      "</div>" +
      '<div class="sumula-linha"><span class="rotulo">Organizador</span><span class="valor">' + escapeHtml(t.organizadorNome || "-") + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Data</span><span class="valor">' + escapeHtml(t.dataInicio || "-") + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Local</span><span class="valor">' + escapeHtml((t.local || "-") + " — " + (t.cidade || "-") + "/" + (t.estado || "")) + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">WhatsApp</span><span class="valor">' + escapeHtml(t.whatsappContato || "-") + "</span></div>" +
      (t.regras ? '<div class="sumula-linha"><span class="rotulo">Regras</span><span class="valor">' + escapeHtml(t.regras) + "</span></div>" : "") +
      '<div class="sumula-rodape" id="acoes-' + id + '"></div>';

    const acoes = div.querySelector("#acoes-" + id);

    if (pendente) {
      const btnAprovar = document.createElement("button");
      btnAprovar.className = "btn btn-apito";
      btnAprovar.textContent = "Aprovar";
      btnAprovar.addEventListener("click", function () {
        db.ref("torneios/" + id + "/status").set("aprovado").then(carregarTudo);
      });

      const btnRejeitar = document.createElement("button");
      btnRejeitar.className = "btn btn-vermelho";
      btnRejeitar.textContent = "Rejeitar / excluir";
      btnRejeitar.addEventListener("click", function () {
        if (confirm('Excluir o torneio "' + t.nome + '"? Essa ação não pode ser desfeita.')) {
          db.ref("torneios/" + id).remove().then(carregarTudo);
        }
      });

      acoes.appendChild(btnAprovar);
      acoes.appendChild(btnRejeitar);
    } else {
      const btnEncerrar = document.createElement("button");
      btnEncerrar.className = "btn btn-linha";
      btnEncerrar.textContent = "Marcar como encerrado";
      btnEncerrar.addEventListener("click", function () {
        db.ref("torneios/" + id + "/status").set("encerrado").then(carregarTudo);
      });
      acoes.appendChild(btnEncerrar);
    }

    return div;
  }

  function carregarTudo() {
    listaPendentes.innerHTML = '<div class="vazio">Carregando...</div>';
    listaAprovados.innerHTML = "";

    db.ref("torneios").once("value").then(function (snap) {
      const dados = snap.val() || {};
      const ids = Object.keys(dados);

      const pendentes = ids.filter(function (id) { return dados[id].status === "pendente"; });
      const aprovados = ids.filter(function (id) { return dados[id].status === "aprovado"; });

      listaPendentes.innerHTML = "";
      if (pendentes.length === 0) {
        listaPendentes.innerHTML = '<div class="vazio">Nenhum torneio pendente de aprovação.</div>';
      } else {
        pendentes.forEach(function (id) {
          listaPendentes.appendChild(criarLinhaTorneio(id, dados[id], true));
        });
      }

      listaAprovados.innerHTML = "";
      if (aprovados.length === 0) {
        listaAprovados.innerHTML = '<div class="vazio">Nenhum torneio aprovado ainda.</div>';
      } else {
        aprovados.forEach(function (id) {
          listaAprovados.appendChild(criarLinhaTorneio(id, dados[id], false));
        });
      }
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      blocoLogin.style.display = "block";
      blocoPainel.style.display = "none";
      blocoNegado.style.display = "none";
      return;
    }
    if (ADMIN_EMAILS.indexOf(user.email) === -1) {
      blocoLogin.style.display = "none";
      blocoPainel.style.display = "none";
      blocoNegado.style.display = "block";
      return;
    }
    blocoLogin.style.display = "none";
    blocoNegado.style.display = "none";
    blocoPainel.style.display = "block";
    document.getElementById("admin-usuario-atual").textContent = user.email;
    carregarTudo();
  });
});
