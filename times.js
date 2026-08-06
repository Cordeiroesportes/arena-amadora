/* =========================================================
   ARENA AMADORA — times.js
   Técnico cria times fixos e escala atletas informando o
   código gerado no cadastro (ex: AA-0001).
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const botaoNovoTime = document.getElementById("botao-novo-time");
  const blocoNovoTime = document.getElementById("bloco-novo-time");
  const formTime = document.getElementById("form-time");
  const listaTimes = document.getElementById("lista-times");

  const selectModalidade = document.getElementById("nt-modalidade-time");
  const selectGenero = document.getElementById("nt-genero-time");
  const selectEstado = document.getElementById("nt-estado-time");
  preencherSelect(selectModalidade, MODALIDADES, false);
  preencherSelect(selectGenero, GENEROS, false);
  preencherSelect(selectEstado, ESTADOS_BR, false);

  let usuarioAtual = null;
  let meusTimes = [];

  document.getElementById("botao-sair").addEventListener("click", function () {
    auth.signOut().then(function () { window.location.href = "index.html"; });
  });

  botaoNovoTime.addEventListener("click", function () {
    blocoNovoTime.style.display = blocoNovoTime.style.display === "block" ? "none" : "block";
    if (blocoNovoTime.style.display === "block") {
      blocoNovoTime.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
  }

  /* ---------------- Criar time ---------------- */

  formTime.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const msg = document.getElementById("msg-novo-time");
    msg.className = "mensagem";

    const nome = document.getElementById("nt-nome-time").value.trim();
    const cidade = document.getElementById("nt-cidade-time").value.trim();

    if (!nome) {
      mostrarMensagem(msg, "Dê um nome para o time.", "erro");
      return;
    }

    const botao = formTime.querySelector("button[type=submit]");
    botao.disabled = true;

    db.ref("times").push({
      nome: nome,
      modalidade: selectModalidade.value,
      genero: selectGenero.value,
      cidade: cidade,
      estado: selectEstado.value,
      tecnicoUid: usuarioAtual.uid,
      tecnicoNome: usuarioAtual.displayName || usuarioAtual.email,
      criadoEm: Date.now()
    }).then(function () {
      formTime.reset();
      blocoNovoTime.style.display = "none";
      carregarTimes();
    }).catch(function (erro) {
      mostrarMensagem(msg, "Erro ao criar o time. Tente novamente.", "erro");
      console.error(erro);
    }).finally(function () {
      botao.disabled = false;
    });
  });

  /* ---------------- Adicionar / remover jogador ---------------- */

  function adicionarJogador(timeId, codigo, msgEl, jogadoresAtuais) {
    codigo = codigo.trim().toUpperCase();
    if (!codigo) {
      mostrarMensagem(msgEl, "Digite o código do atleta.", "erro");
      return;
    }

    const jaNoTime = Object.keys(jogadoresAtuais || {}).some(function (uid) {
      return jogadoresAtuais[uid].codigo === codigo;
    });
    if (jaNoTime) {
      mostrarMensagem(msgEl, "Esse atleta já está no time.", "erro");
      return;
    }

    db.ref("usuarios").orderByChild("codigoAtleta").equalTo(codigo).once("value")
      .then(function (snap) {
        const dados = snap.val();
        if (!dados) {
          mostrarMensagem(msgEl, "Código não encontrado. Confira com o atleta.", "erro");
          return;
        }
        const uidAtleta = Object.keys(dados)[0];
        const atleta = dados[uidAtleta];

        return db.ref("times/" + timeId + "/jogadores/" + uidAtleta).set({
          codigo: codigo,
          nome: atleta.nome || codigo,
          adicionadoEm: Date.now()
        }).then(function () {
          mostrarMensagem(msgEl, "Atleta adicionado!", "ok");
          carregarTimes();
        });
      })
      .catch(function (erro) {
        mostrarMensagem(msgEl, "Erro ao buscar o código. Tente novamente.", "erro");
        console.error(erro);
      });
  }

  function removerJogador(timeId, uidAtleta) {
    db.ref("times/" + timeId + "/jogadores/" + uidAtleta).remove().then(carregarTimes);
  }

  /* ---------------- Renderização ---------------- */

  function criarCartaoTime(id, t) {
    const div = document.createElement("div");
    div.className = "sumula";
    div.style.marginBottom = "18px";

    const jogadores = t.jogadores || {};
    const idsJogadores = Object.keys(jogadores);

    let htmlJogadores = "";
    if (idsJogadores.length === 0) {
      htmlJogadores = '<p style="font-size:14px; color:var(--tinta-suave); margin:10px 0;">Nenhum atleta no elenco ainda.</p>';
    } else {
      htmlJogadores = '<div style="margin:10px 0;">';
      idsJogadores.forEach(function (uidAtleta) {
        const j = jogadores[uidAtleta];
        htmlJogadores +=
          '<div class="sumula-linha">' +
            '<span class="valor">' + escapeHtml(j.nome) + " (" + escapeHtml(j.codigo) + ")</span>" +
            '<button type="button" class="btn btn-linha" data-remover="' + uidAtleta + '" style="padding:4px 10px; font-size:12px;">Remover</button>' +
          "</div>";
      });
      htmlJogadores += "</div>";
    }

    div.innerHTML =
      '<div class="sumula-cabecalho">' +
        '<div><div class="sumula-modalidade">' + escapeHtml(t.modalidade) + (t.genero ? " · " + escapeHtml(t.genero) : "") + '</div>' +
        '<h3 class="sumula-nome">' + escapeHtml(t.nome) + "</h3></div>" +
      "</div>" +
      '<div class="sumula-linha"><span class="rotulo">Cidade</span><span class="valor">' + escapeHtml((t.cidade || "-") + "/" + (t.estado || "")) + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Elenco</span><span class="valor">' + idsJogadores.length + " atleta(s)</span></div>" +
      htmlJogadores +
      '<div id="msg-time-' + id + '" class="mensagem"></div>' +
      '<div style="display:flex; gap:8px; margin-top:8px;">' +
        '<input type="text" id="codigo-' + id + '" placeholder="Código do atleta (ex: AA-0001)" style="flex:1; padding:10px 12px; border:1.5px solid var(--linha-escura); border-radius:6px; background:var(--giz);">' +
        '<button type="button" class="btn btn-apito" id="add-' + id + '">Adicionar</button>' +
      "</div>" +
      '<div class="sumula-rodape">' +
        '<button type="button" class="btn btn-vermelho" id="excluir-' + id + '">Excluir time</button>' +
      "</div>";

    div.querySelectorAll("[data-remover]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removerJogador(id, btn.getAttribute("data-remover"));
      });
    });

    div.querySelector("#add-" + id).addEventListener("click", function () {
      const input = div.querySelector("#codigo-" + id);
      const msgEl = div.querySelector("#msg-time-" + id);
      adicionarJogador(id, input.value, msgEl, jogadores);
    });

    div.querySelector("#excluir-" + id).addEventListener("click", function () {
      if (confirm('Excluir o time "' + t.nome + '"? Essa ação não pode ser desfeita.')) {
        db.ref("times/" + id).remove().then(carregarTimes);
      }
    });

    return div;
  }

  function carregarTimes() {
    listaTimes.innerHTML = '<div class="vazio">Carregando seus times...</div>';

    db.ref("times").orderByChild("tecnicoUid").equalTo(usuarioAtual.uid).once("value")
      .then(function (snap) {
        const dados = snap.val() || {};
        meusTimes = Object.keys(dados).map(function (id) {
          return Object.assign({ id: id }, dados[id]);
        });

        listaTimes.innerHTML = "";
        if (meusTimes.length === 0) {
          listaTimes.innerHTML = '<div class="vazio">Você ainda não criou nenhum time. Clique em "+ Criar time" para começar.</div>';
          return;
        }
        meusTimes.forEach(function (t) {
          listaTimes.appendChild(criarCartaoTime(t.id, t));
        });
      })
      .catch(function (erro) {
        listaTimes.innerHTML = '<div class="vazio">Não foi possível carregar seus times agora.</div>';
        console.error(erro);
      });
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    usuarioAtual = user;
    carregarTimes();
  });
});
