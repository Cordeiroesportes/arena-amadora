/* =========================================================
   ARENA AMADORA — torneios.js
   Listagem pública (com filtros) + formulário de cadastro
   de torneio para usuários logados (fica pendente de aprovação).
   ========================================================= */

let usuarioAtual = null;
let todosTorneios = [];

document.addEventListener("DOMContentLoaded", function () {
  const filtroModalidade = document.getElementById("filtro-modalidade");
  const filtroCategoria = document.getElementById("filtro-categoria");
  const filtroCidade = document.getElementById("filtro-cidade");
  const lista = document.getElementById("lista-torneios");
  const blocoNaoLogado = document.getElementById("bloco-nao-logado");
  const blocoNovoTorneio = document.getElementById("bloco-novo-torneio");
  const botaoAbrirForm = document.getElementById("botao-novo-torneio");
  const formTorneio = document.getElementById("form-torneio");

  preencherSelect(filtroModalidade, MODALIDADES, true);
  preencherSelect(filtroCategoria, CATEGORIAS, true);

  const selectModalidadeForm = document.getElementById("nt-modalidade");
  const selectCategoriaForm = document.getElementById("nt-categoria");
  const selectEstadoForm = document.getElementById("nt-estado");
  preencherSelect(selectModalidadeForm, MODALIDADES, false);
  preencherSelect(selectCategoriaForm, CATEGORIAS, false);
  preencherSelect(selectEstadoForm, ESTADOS_BR, false);

  function renderizarLista() {
    const modalidade = filtroModalidade.value;
    const categoria = filtroCategoria.value;
    const cidade = filtroCidade.value.trim().toLowerCase();

    const filtrados = todosTorneios.filter(function (t) {
      if (modalidade && t.modalidade !== modalidade) return false;
      if (categoria && t.categoria !== categoria) return false;
      if (cidade && (!t.cidade || t.cidade.toLowerCase().indexOf(cidade) === -1)) return false;
      return true;
    });

    lista.innerHTML = "";

    if (filtrados.length === 0) {
      lista.innerHTML =
        '<div class="vazio"><div class="numero">0x0</div>' +
        "<p>Nenhum torneio encontrado com esses filtros. " +
        "Ajuste a busca ou seja o primeiro a cadastrar um torneio dessa modalidade na sua região.</p></div>";
      return;
    }

    filtrados.forEach(function (t) {
      lista.appendChild(criarCartaoTorneio(t));
    });
  }

  function criarCartaoTorneio(t) {
    const card = document.createElement("div");
    card.className = "sumula";

    const dataFormatada = t.dataInicio
      ? new Date(t.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")
      : "A definir";

    const ehDono = usuarioAtual && t.organizadorUid === usuarioAtual.uid;
    const seloClasse = t.status === "aprovado" ? "selo-aprovado" : "selo-pendente";
    const seloTexto = t.status === "aprovado" ? "Confirmado" : "Em análise";

    card.innerHTML =
      '<div class="sumula-cabecalho">' +
        '<div><div class="sumula-modalidade">' + escapeHtml(t.modalidade) + " · " + escapeHtml(t.categoria) + '</div>' +
        '<h3 class="sumula-nome">' + escapeHtml(t.nome) + "</h3></div>" +
        (ehDono ? '<span class="sumula-selo ' + seloClasse + '">' + seloTexto + "</span>" : "") +
      "</div>" +
      '<div class="sumula-linha"><span class="rotulo">Data</span><span class="valor">' + dataFormatada + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Local</span><span class="valor">' + escapeHtml(t.local || "-") + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Cidade</span><span class="valor">' + escapeHtml((t.cidade || "-") + "/" + (t.estado || "")) + "</span></div>" +
      (t.porte ? '<div class="sumula-linha"><span class="rotulo">Porte da equipe</span><span class="valor">' + escapeHtml(t.porte) + "</span></div>" : "") +
      (t.regras ? '<div class="sumula-linha"><span class="rotulo">Regras</span><span class="valor">' + escapeHtml(t.regras) + "</span></div>" : "") +
      '<div class="sumula-rodape">' +
        (t.whatsappContato
          ? '<a class="btn btn-apito" target="_blank" rel="noopener" href="https://wa.me/' + somenteDigitos(t.whatsappContato) + '">Inscrever-se pelo WhatsApp</a>'
          : "") +
      "</div>";

    return card;
  }

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
  }

  function somenteDigitos(texto) {
    return (texto || "").replace(/\D/g, "");
  }

  function carregarTorneios() {
    lista.innerHTML = '<div class="vazio">Carregando torneios...</div>';

    db.ref("torneios").orderByChild("status").equalTo("aprovado").once("value")
      .then(function (snap) {
        const dados = snap.val() || {};
        let aprovados = Object.keys(dados).map(function (id) {
          return Object.assign({ id: id }, dados[id]);
        });

        // Se o usuário está logado, também mostra os torneios pendentes/dele
        if (usuarioAtual) {
          return db.ref("torneios").orderByChild("organizadorUid").equalTo(usuarioAtual.uid).once("value")
            .then(function (snapMeus) {
              const meus = snapMeus.val() || {};
              Object.keys(meus).forEach(function (id) {
                if (!dados[id]) {
                  aprovados.push(Object.assign({ id: id }, meus[id]));
                }
              });
              return aprovados;
            });
        }
        return aprovados;
      })
      .then(function (todos) {
        todos.sort(function (a, b) {
          return (a.dataInicio || "").localeCompare(b.dataInicio || "");
        });
        todosTorneios = todos;
        renderizarLista();
      })
      .catch(function (erro) {
        lista.innerHTML = '<div class="vazio">Não foi possível carregar os torneios agora. Tente novamente em instantes.</div>';
        console.error(erro);
      });
  }

  [filtroModalidade, filtroCategoria].forEach(function (el) {
    el.addEventListener("change", renderizarLista);
  });
  filtroCidade.addEventListener("input", renderizarLista);

  botaoAbrirForm.addEventListener("click", function () {
    blocoNovoTorneio.style.display = blocoNovoTorneio.style.display === "block" ? "none" : "block";
    if (blocoNovoTorneio.style.display === "block") {
      blocoNovoTorneio.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  formTorneio.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const msg = document.getElementById("msg-novo-torneio");
    msg.className = "mensagem";

    if (!usuarioAtual) {
      mostrarMensagem(msg, "Você precisa estar logado para cadastrar um torneio.", "erro");
      return;
    }

    const dadosTorneio = {
      nome: document.getElementById("nt-nome").value.trim(),
      modalidade: selectModalidadeForm.value,
      categoria: selectCategoriaForm.value,
      porte: document.getElementById("nt-porte").value.trim(),
      dataInicio: document.getElementById("nt-data").value,
      local: document.getElementById("nt-local").value.trim(),
      cidade: document.getElementById("nt-cidade").value.trim(),
      estado: selectEstadoForm.value,
      regras: document.getElementById("nt-regras").value.trim(),
      whatsappContato: document.getElementById("nt-whatsapp").value.trim(),
      organizadorUid: usuarioAtual.uid,
      organizadorNome: usuarioAtual.displayName || usuarioAtual.email,
      status: "pendente",
      timestamp: Date.now()
    };

    if (!dadosTorneio.nome || !dadosTorneio.modalidade || !dadosTorneio.dataInicio || !dadosTorneio.whatsappContato) {
      mostrarMensagem(msg, "Preencha ao menos nome, modalidade, data e WhatsApp de contato.", "erro");
      return;
    }

    const botao = formTorneio.querySelector("button[type=submit]");
    botao.disabled = true;

    db.ref("torneios").push(dadosTorneio)
      .then(function () {
        mostrarMensagem(msg, "Torneio enviado! Ele ficará visível após a aprovação da equipe Arena Amadora.", "ok");
        formTorneio.reset();
        carregarTorneios();
      })
      .catch(function (erro) {
        mostrarMensagem(msg, "Erro ao salvar. Tente novamente.", "erro");
        console.error(erro);
      })
      .finally(function () {
        botao.disabled = false;
      });
  });

  auth.onAuthStateChanged(function (user) {
    usuarioAtual = user;
    blocoNaoLogado.style.display = user ? "none" : "block";
    botaoAbrirForm.style.display = user ? "inline-flex" : "none";
    carregarTorneios();
  });
});
