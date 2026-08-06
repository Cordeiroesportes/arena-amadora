/* =========================================================
   ARENA AMADORA — admin.js
   Painel restrito (ADMIN_EMAILS): aprova/edita/exclui torneios
   e gerencia os dados de atletas cadastrados.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const blocoLogin = document.getElementById("admin-login");
  const blocoPainel = document.getElementById("admin-painel");
  const blocoNegado = document.getElementById("admin-negado");
  const formLogin = document.getElementById("form-admin-login");
  const listaPendentes = document.getElementById("lista-pendentes");
  const listaAprovados = document.getElementById("lista-aprovados");
  const listaAtletas = document.getElementById("lista-atletas");
  const buscaAtleta = document.getElementById("busca-atleta");

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

  /* ---------------------------------------------------------
     Torneios: listar, aprovar, editar, encerrar, excluir
     --------------------------------------------------------- */

  const CAMPOS_EDITAVEIS = [
    { chave: "nome", rotulo: "Nome", tipo: "text" },
    { chave: "dataInicio", rotulo: "Data", tipo: "date" },
    { chave: "local", rotulo: "Local", tipo: "text" },
    { chave: "cidade", rotulo: "Cidade", tipo: "text" },
    { chave: "whatsappContato", rotulo: "WhatsApp", tipo: "text" },
    { chave: "regras", rotulo: "Regras", tipo: "textarea" }
  ];

  function criarFormularioEdicao(id, t) {
    const form = document.createElement("form");
    form.className = "sumula";

    let html = '<div class="sumula-cabecalho"><h3 class="sumula-nome">Editando torneio</h3></div>';
    CAMPOS_EDITAVEIS.forEach(function (campo) {
      const valor = t[campo.chave] || "";
      if (campo.tipo === "textarea") {
        html += '<div class="campo"><label>' + campo.rotulo + '</label>' +
          '<textarea data-campo="' + campo.chave + '">' + escapeHtml(valor) + '</textarea></div>';
      } else {
        html += '<div class="campo"><label>' + campo.rotulo + '</label>' +
          '<input type="' + campo.tipo + '" data-campo="' + campo.chave + '" value="' + escapeHtml(valor) + '"></div>';
      }
    });
    html += '<div class="sumula-rodape">' +
      '<button type="submit" class="btn btn-apito">Salvar</button>' +
      '<button type="button" class="btn btn-linha" id="cancelar-' + id + '">Cancelar</button>' +
      "</div>";
    form.innerHTML = html;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const atualizacoes = {};
      form.querySelectorAll("[data-campo]").forEach(function (campo) {
        atualizacoes[campo.getAttribute("data-campo")] = campo.value.trim();
      });
      db.ref("torneios/" + id).update(atualizacoes).then(carregarTudo);
    });

    form.querySelector("#cancelar-" + id).addEventListener("click", carregarTudo);

    return form;
  }

  function criarLinhaTorneio(id, t, pendente) {
    const div = document.createElement("div");
    div.className = "sumula";
    div.innerHTML =
      '<div class="sumula-cabecalho">' +
        '<div><div class="sumula-modalidade">' + escapeHtml(t.modalidade) + " · " + escapeHtml(t.categoria) + (t.genero ? " · " + escapeHtml(t.genero) : "") + '</div>' +
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
      acoes.appendChild(btnAprovar);
    } else {
      const btnEncerrar = document.createElement("button");
      btnEncerrar.className = "btn btn-linha";
      btnEncerrar.textContent = "Marcar como encerrado";
      btnEncerrar.addEventListener("click", function () {
        db.ref("torneios/" + id + "/status").set("encerrado").then(carregarTudo);
      });
      acoes.appendChild(btnEncerrar);
    }

    const btnEditar = document.createElement("button");
    btnEditar.className = "btn btn-linha";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", function () {
      div.replaceWith(criarFormularioEdicao(id, t));
    });
    acoes.appendChild(btnEditar);

    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn btn-vermelho";
    btnExcluir.textContent = "Excluir";
    btnExcluir.addEventListener("click", function () {
      if (confirm('Excluir o torneio "' + t.nome + '"? Essa ação não pode ser desfeita.')) {
        db.ref("torneios/" + id).remove().then(carregarTudo);
      }
    });
    acoes.appendChild(btnExcluir);

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

  /* ---------------------------------------------------------
     Atletas: listar e remover cadastro
     --------------------------------------------------------- */

  let todosUsuarios = [];

  function criarCartaoAtleta(uid, u) {
    const div = document.createElement("div");
    div.className = "sumula";
    div.innerHTML =
      '<div class="sumula-cabecalho">' +
        '<div><div class="sumula-modalidade">' + (u.codigoAtleta ? escapeHtml(u.codigoAtleta) : "sem código") + '</div>' +
        '<h3 class="sumula-nome">' + escapeHtml(u.nome || "-") + "</h3></div>" +
      "</div>" +
      '<div class="sumula-linha"><span class="rotulo">E-mail</span><span class="valor">' + escapeHtml(u.email || "-") + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Cidade</span><span class="valor">' + escapeHtml((u.cidade || "-") + "/" + (u.estado || "")) + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Tipos</span><span class="valor">' + escapeHtml((u.tipos || []).join(", ") || "-") + "</span></div>" +
      '<div class="sumula-rodape" id="acoes-atleta-' + uid + '"></div>';

    const acoes = div.querySelector("#acoes-atleta-" + uid);
    const btnRemover = document.createElement("button");
    btnRemover.className = "btn btn-vermelho";
    btnRemover.textContent = "Remover cadastro";
    btnRemover.addEventListener("click", function () {
      if (confirm('Remover os dados de "' + (u.nome || u.email) + '"? O login continua existindo, só os dados salvos são apagados.')) {
        db.ref("usuarios/" + uid).remove().then(function () {
          todosUsuarios = todosUsuarios.filter(function (item) { return item.uid !== uid; });
          renderizarAtletas();
        });
      }
    });
    acoes.appendChild(btnRemover);

    return div;
  }

  function renderizarAtletas() {
    const termo = (buscaAtleta.value || "").trim().toLowerCase();
    const filtrados = todosUsuarios.filter(function (u) {
      if (!termo) return true;
      return (u.nome || "").toLowerCase().indexOf(termo) !== -1 ||
        (u.email || "").toLowerCase().indexOf(termo) !== -1 ||
        (u.codigoAtleta || "").toLowerCase().indexOf(termo) !== -1;
    });

    listaAtletas.innerHTML = "";
    if (filtrados.length === 0) {
      listaAtletas.innerHTML = '<div class="vazio">Nenhum cadastro encontrado.</div>';
      return;
    }
    filtrados.forEach(function (u) {
      listaAtletas.appendChild(criarCartaoAtleta(u.uid, u));
    });
  }

  window.carregarAtletas = function () {
    listaAtletas.innerHTML = '<div class="vazio">Carregando...</div>';
    db.ref("usuarios").once("value").then(function (snap) {
      const dados = snap.val() || {};
      todosUsuarios = Object.keys(dados).map(function (uid) {
        return Object.assign({ uid: uid }, dados[uid]);
      });
      renderizarAtletas();
    });
  };

  buscaAtleta.addEventListener("input", renderizarAtletas);

  /* ---------------------------------------------------------
     Autenticação do painel
     --------------------------------------------------------- */

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
