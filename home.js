/* =========================================================
   ARENA AMADORA — home.js
   Página inicial: chips de modalidade (com seleção automática
   pra quem já tem cadastro) e prévia dos torneios em destaque.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const blocoChips = document.getElementById("chips-esporte");
  const listaDestaque = document.getElementById("lista-destaque");
  const tituloDestaque = document.getElementById("titulo-destaque");
  const linkVerTodos = document.getElementById("link-ver-todos");

  // Uma cor por modalidade, girando nessa ordem — como uniformes de times diferentes.
  const CORES_CHIP = ["#FF5A36", "#2EC4B6", "#FFC53D", "#5B6EE1", "#E63969", "#8B5CF6"];

  let modalidadeAtiva = null; // null = "Todas"
  let jaAutoSelecionou = false;

  function corDoChip(indice) {
    return CORES_CHIP[indice % CORES_CHIP.length];
  }

  function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
  }

  function criarChip(rotulo, valor, indice) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    if (indice >= 0) btn.style.setProperty("--cor-chip", corDoChip(indice));
    btn.textContent = rotulo;
    if (modalidadeAtiva === valor) btn.classList.add("ativo");
    btn.addEventListener("click", function () {
      modalidadeAtiva = valor;
      renderizarChips();
      carregarDestaques();
    });
    return btn;
  }

  function renderizarChips() {
    blocoChips.innerHTML = "";
    blocoChips.appendChild(criarChip("Todas", null, -1));
    MODALIDADES.forEach(function (m, i) {
      blocoChips.appendChild(criarChip(m, m, i));
    });
  }

  function criarCartaoTorneio(t) {
    const card = document.createElement("div");
    card.className = "sumula";

    const dataFormatada = t.dataInicio
      ? new Date(t.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")
      : "A definir";

    const indiceModalidade = MODALIDADES.indexOf(t.modalidade);
    const cor = indiceModalidade >= 0 ? corDoChip(indiceModalidade) : "var(--apito)";
    card.style.borderTopColor = cor;

    card.innerHTML =
      '<div class="sumula-cabecalho">' +
        '<div><div class="sumula-modalidade" style="color:' + cor + ';">' + escapeHtml(t.modalidade) + " · " + escapeHtml(t.categoria) + '</div>' +
        '<h3 class="sumula-nome">' + escapeHtml(t.nome) + "</h3></div>" +
      "</div>" +
      '<div class="sumula-linha"><span class="rotulo">Data</span><span class="valor">' + dataFormatada + "</span></div>" +
      '<div class="sumula-linha"><span class="rotulo">Cidade</span><span class="valor">' + escapeHtml((t.cidade || "-") + "/" + (t.estado || "")) + "</span></div>" +
      '<div class="sumula-rodape">' +
        (t.whatsappContato
          ? '<a class="btn btn-apito" target="_blank" rel="noopener" href="https://wa.me/' + (t.whatsappContato || "").replace(/\D/g, "") + '">Inscrever-se</a>'
          : "") +
      "</div>";

    return card;
  }

  function carregarDestaques() {
    listaDestaque.innerHTML = '<div class="vazio">Carregando torneios...</div>';
    tituloDestaque.textContent = modalidadeAtiva ? modalidadeAtiva + " em destaque" : "Torneios em destaque";
    linkVerTodos.href = modalidadeAtiva ? "torneios.html?modalidade=" + encodeURIComponent(modalidadeAtiva) : "torneios.html";

    db.ref("torneios").orderByChild("status").equalTo("aprovado").once("value")
      .then(function (snap) {
        const dados = snap.val() || {};
        let lista = Object.keys(dados).map(function (id) {
          return Object.assign({ id: id }, dados[id]);
        });

        if (modalidadeAtiva) {
          lista = lista.filter(function (t) { return t.modalidade === modalidadeAtiva; });
        }

        lista.sort(function (a, b) { return (a.dataInicio || "").localeCompare(b.dataInicio || ""); });
        lista = lista.slice(0, 6);

        listaDestaque.innerHTML = "";
        if (lista.length === 0) {
          listaDestaque.innerHTML =
            '<div class="vazio"><div class="numero">0x0</div>' +
            "<p>Nenhum torneio" + (modalidadeAtiva ? " de " + escapeHtml(modalidadeAtiva) : "") + " por enquanto. " +
            '<a href="auth.html" style="text-decoration:underline; font-weight:700;">Crie sua conta</a> e seja o primeiro a divulgar um.</p></div>';
          return;
        }

        lista.forEach(function (t) { listaDestaque.appendChild(criarCartaoTorneio(t)); });
      })
      .catch(function (erro) {
        listaDestaque.innerHTML = '<div class="vazio">Não foi possível carregar os torneios agora. Tente novamente em instantes.</div>';
        console.error(erro);
      });
  }

  function alternarNav(user) {
    const linkPerfil = document.getElementById("link-perfil");
    const linkEntrar = document.getElementById("link-entrar");
    if (linkPerfil) linkPerfil.style.display = user ? "inline" : "none";
    if (linkEntrar) linkEntrar.style.display = user ? "none" : "inline";
  }

  renderizarChips();
  carregarDestaques();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
  }

  auth.onAuthStateChanged(function (user) {
    alternarNav(user);
    if (!user || jaAutoSelecionou) return;

    // Se a pessoa já tem cadastro com modalidade de interesse, seleciona
    // automaticamente a primeira delas.
    db.ref("usuarios/" + user.uid).once("value").then(function (snap) {
      const dados = snap.val() || {};
      const modalidades = dados.modalidades || [];
      jaAutoSelecionou = true;
      if (modalidades.length > 0) {
        modalidadeAtiva = modalidades[0];
        renderizarChips();
        carregarDestaques();
      }
    });
  });
});
