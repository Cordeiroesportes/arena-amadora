/* =========================================================
   ARENA AMADORA — perfil.js
   Página "Meu perfil": mostra o código de atleta, permite
   editar os dados, e gera o código pra quem ainda não tem
   (ex: quem se cadastrou antes desse recurso existir).
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const blocoCarregando = document.getElementById("bloco-carregando");
  const blocoPerfil = document.getElementById("bloco-perfil");
  const cartaoCodigo = document.getElementById("cartao-codigo");
  const textoCodigo = document.getElementById("texto-codigo");
  const form = document.getElementById("form-perfil");
  const msg = document.getElementById("msg-perfil");

  const selectEstado = document.getElementById("pf-estado");
  preencherSelect(selectEstado, ESTADOS_BR, false);

  const blocoModalidades = document.getElementById("pf-modalidades");
  MODALIDADES.forEach(function (m) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = m;
    input.name = "modalidade-perfil";
    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + m));
    blocoModalidades.appendChild(label);
  });

  document.getElementById("botao-sair").addEventListener("click", function () {
    auth.signOut().then(function () { window.location.href = "index.html"; });
  });

  function gerarCodigoAtleta() {
    return db.ref("contadores/atletas").transaction(function (atual) {
      return (atual || 0) + 1;
    }).then(function (resultado) {
      const numero = resultado.snapshot.val();
      return "AA-" + String(numero).padStart(4, "0");
    });
  }

  let uidAtual = null;
  let codigoAtualNaTela = null;

  function preencherFormulario(dados) {
    document.getElementById("pf-nome").value = dados.nome || "";
    document.getElementById("pf-email").value = dados.email || "";
    document.getElementById("pf-telefone").value = dados.telefone || "";
    document.getElementById("pf-nascimento").value = dados.dataNascimento || "";
    document.getElementById("pf-cidade").value = dados.cidade || "";
    selectEstado.value = dados.estado || "";

    const tipos = dados.tipos || [];
    document.getElementById("pf-tipo-atleta").checked = tipos.indexOf("atleta") !== -1;
    document.getElementById("pf-tipo-organizador").checked = tipos.indexOf("organizador") !== -1;

    const modalidadesSalvas = dados.modalidades || [];
    blocoModalidades.querySelectorAll("input").forEach(function (chk) {
      chk.checked = modalidadesSalvas.indexOf(chk.value) !== -1;
    });

    codigoAtualNaTela = dados.codigoAtleta || null;
    if (codigoAtualNaTela) {
      cartaoCodigo.style.display = "block";
      textoCodigo.textContent = codigoAtualNaTela;
    } else {
      cartaoCodigo.style.display = "none";
    }
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    uidAtual = user.uid;

    db.ref("usuarios/" + uidAtual).once("value").then(function (snap) {
      const dados = snap.val() || {};
      dados.email = user.email;
      preencherFormulario(dados);
      blocoCarregando.style.display = "none";
      blocoPerfil.style.display = "block";
    });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    msg.className = "mensagem";

    const nome = document.getElementById("pf-nome").value.trim();
    const telefone = document.getElementById("pf-telefone").value.trim();
    const dataNascimento = document.getElementById("pf-nascimento").value;
    const cidade = document.getElementById("pf-cidade").value.trim();
    const estado = selectEstado.value;

    const tipos = [];
    if (document.getElementById("pf-tipo-atleta").checked) tipos.push("atleta");
    if (document.getElementById("pf-tipo-organizador").checked) tipos.push("organizador");

    const modalidades = Array.prototype.slice
      .call(blocoModalidades.querySelectorAll("input:checked"))
      .map(function (i) { return i.value; });

    if (!nome || tipos.length === 0) {
      mostrarMensagem(msg, "Preencha o nome e selecione ao menos um tipo de participação.", "erro");
      return;
    }
    const ehAtleta = tipos.indexOf("atleta") !== -1;
    if (ehAtleta && !dataNascimento) {
      mostrarMensagem(msg, "Informe a data de nascimento para participar como atleta.", "erro");
      return;
    }

    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;

    // Só gera código novo se a pessoa marcou "atleta" e ainda não tinha um.
    const precisaDeCodigo = ehAtleta && !codigoAtualNaTela;
    const prosseguir = precisaDeCodigo ? gerarCodigoAtleta() : Promise.resolve(codigoAtualNaTela);

    prosseguir.then(function (codigoAtleta) {
      return db.ref("usuarios/" + uidAtual).update({
        nome: nome,
        telefone: telefone,
        dataNascimento: dataNascimento || null,
        cidade: cidade,
        estado: estado,
        tipos: tipos,
        modalidades: modalidades,
        codigoAtleta: ehAtleta ? codigoAtleta : (codigoAtualNaTela || null)
      }).then(function () {
        codigoAtualNaTela = ehAtleta ? codigoAtleta : codigoAtualNaTela;
        if (codigoAtualNaTela) {
          cartaoCodigo.style.display = "block";
          textoCodigo.textContent = codigoAtualNaTela;
        }
      });
    }).then(function () {
      mostrarMensagem(msg, "Dados salvos com sucesso!", "ok");
    }).catch(function (erro) {
      mostrarMensagem(msg, "Erro ao salvar. Tente novamente.", "erro");
      console.error(erro);
    }).finally(function () {
      botao.disabled = false;
    });
  });
});
