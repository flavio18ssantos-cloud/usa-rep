/* USA Rep · Estimates
 * Duas telas (Follow-up slim e Padrão) sobre o MESMO armazenamento.
 * - Publicado como artefato: dados no banco compartilhado do artefato (capacidade `db`),
 *   ao vivo para quem estiver com a página aberta.
 * - Aberto do repositório / sem banco: localStorage do navegador.
 */
(() => {
  "use strict";

  const STORE_KEY = "usa-rep.estimates.v1";
  const COLLECTION = "estimates";

  // ---------------------------------------------------------------- util
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hojeISO = () => isoDe(new Date());
  const parseISO = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const diasEntre = (isoA, isoB = hojeISO()) => {
    const a = parseISO(isoA), b = parseISO(isoB);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  };
  const fmtData = (iso) => { const d = parseISO(iso); return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"; };
  const fmtDataLonga = (iso) => { const d = parseISO(iso); return d ? d.toLocaleDateString("pt-BR") : "—"; };
  const fmtUSD = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STATUS_LABEL = { aberto: "em aberto", fechou: "fechou", fechou_outro: "fechou c/ outro", desistiu: "desistiu" };
  const STATUS_PILL = { aberto: "pill-info", fechou: "pill-ok", fechou_outro: "pill-muted", desistiu: "pill-muted" };
  const TIPO_LABEL = { txt: "txt", lig: "ligação", vis: "visita", email: "e-mail" };

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---------------------------------------------------------------- normalização
  function normalizar(e) {
    return {
      id: e.id || uid(),
      cliente: (e.cliente || "").toString(),
      contato: e.contato || "",
      telefone: e.telefone || "",
      local: e.local || "",
      servico: e.servico || "",
      valor: e.valor == null || e.valor === "" ? null : Number(e.valor),
      enviadoEm: e.enviadoEm || hojeISO(),
      status: STATUS_LABEL[e.status] ? e.status : "aberto",
      agendadoEm: e.agendadoEm || null,
      obs: e.obs || "",
      contatos: Array.isArray(e.contatos) ? e.contatos.map((c) => ({ data: c.data, tipo: c.tipo || "txt", nota: c.nota || "" })) : [],
      // campos vindos das outras bases (QuickBooks / CRM); preservados, não editáveis aqui
      estimate: e.estimate ? String(e.estimate) : "",
      origem: e.origem || "",
      email: e.email || "",
      crm: e.crm || "",
      proxFollowUp: e.proxFollowUp || null,
      fontes: Array.isArray(e.fontes) ? e.fontes : [],
      atualizadoEm: e.atualizadoEm || new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------- store (db do artefato ou localStorage)
  const store = {
    itens: [],
    modo: "local",   // "db" | "local"
    db: null,
    somenteLeitura: false,

    async init() {
      let db = null;
      try {
        if (window.claude && typeof window.claude.use === "function") db = await window.claude.use("db");
      } catch { db = null; }

      if (db) {
        this.db = db;
        this.modo = "db";
        try {
          const user = await window.claude.use("user");
          const pode = user ? await user.can("data.write") : null;
          if (pode === false) this.setSomenteLeitura(true);
        } catch { /* sem resposta: mantém controles; um set() recusado decide */ }
        db.collection(COLLECTION).onSnapshot(
          (snap) => {
            this.itens = snap.docs.filter((d) => d.exists).map((d) => normalizar(d.data()));
            render();
            marcarSync(snap.metadata.fromCache ? "sincronizando…" : "compartilhado · ao vivo");
          },
          (err) => { marcarSync("sem conexão (" + err.code + ")"); },
        );
        marcarSync("conectando…");
        return;
      }

      this.modo = "local";
      try {
        const raw = localStorage.getItem(STORE_KEY);
        this.itens = raw ? JSON.parse(raw).map(normalizar) : seed();
      } catch { this.itens = seed(); }
      if (!Array.isArray(this.itens)) this.itens = [];
      this.persistLocal();
      marcarSync("só neste navegador");
      render();
    },

    setSomenteLeitura(v) {
      this.somenteLeitura = v;
      document.body.classList.toggle("readonly", v);
      if (v) marcarSync("compartilhado · somente leitura");
    },

    persistLocal() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.itens)); } catch { /* segue em memória */ }
    },

    get(id) { return this.itens.find((e) => e.id === id); },

    async escrever(e) {
      e = normalizar(e);
      e.atualizadoEm = new Date().toISOString();
      if (this.modo === "db") {
        try {
          await this.db.doc(`${COLLECTION}/${e.id}`).set(e);
        } catch (err) {
          if (err && err.code === "invalid_argument") { this.setSomenteLeitura(true); toast("Você não tem permissão para alterar os dados."); }
          else toast("Não consegui salvar (" + (err && err.code || "erro") + "). Tente de novo.");
          return false;
        }
        return true;
      }
      const i = this.itens.findIndex((x) => x.id === e.id);
      if (i >= 0) this.itens[i] = e; else this.itens.unshift(e);
      this.persistLocal();
      render();
      return true;
    },

    async remover(id) {
      if (this.modo === "db") {
        try { await this.db.doc(`${COLLECTION}/${id}`).delete(); }
        catch (err) { toast("Não consegui excluir (" + (err && err.code || "erro") + ")."); return false; }
        return true;
      }
      this.itens = this.itens.filter((e) => e.id !== id);
      this.persistLocal();
      render();
      return true;
    },

    async substituirTudo(lista) {
      const novos = lista.map(normalizar);
      if (this.modo === "db") {
        const idsNovos = new Set(novos.map((e) => e.id));
        for (const antigo of this.itens) if (!idsNovos.has(antigo.id)) await this.remover(antigo.id);
        for (const e of novos) await this.escrever(e);
        return;
      }
      this.itens = novos;
      this.persistLocal();
      render();
    },

    async registrarContato(id, contato, novoStatus, agendadoEm) {
      const e = structuredClone(this.get(id));
      if (!e) return;
      e.contatos.push(contato);
      e.contatos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
      if (novoStatus) e.status = novoStatus;
      if (agendadoEm) e.agendadoEm = agendadoEm;
      else if (e.agendadoEm && contato.data >= e.agendadoEm) e.agendadoEm = null; // agendamento cumprido
      if (e.status !== "aberto") e.agendadoEm = null;
      await this.escrever(e);
    },

    async setStatus(id, status) {
      const e = structuredClone(this.get(id));
      if (!e) return;
      e.status = status;
      if (status !== "aberto") e.agendadoEm = null;
      await this.escrever(e);
      toast(`${e.cliente}: ${STATUS_LABEL[status]}`);
    },

    async agendar(id, data) {
      const e = structuredClone(this.get(id));
      if (!e) return;
      e.agendadoEm = data || null;
      if (data) e.status = "aberto";
      await this.escrever(e);
      toast(data ? `${e.cliente}: agendado ${fmtData(data)}` : `${e.cliente}: agendamento removido`);
    },
  };

  function marcarSync(txt) { $("#sync-badge").textContent = txt; }

  // dados de exemplo só no modo local, na primeira abertura
  function seed() {
    const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return isoDe(x); };
    return [
      { id: uid(), cliente: "Johnson Residence", contato: "Mike Johnson", telefone: "(561) 555-0100", local: "Boca Raton, FL", servico: "Paver driveway 1,200 sqft", valor: 14800, enviadoEm: d(9), status: "aberto", obs: "Exemplo. Quer começar antes do Thanksgiving.", contatos: [{ data: d(9), tipo: "vis", nota: "Visita e medição" }, { data: d(3), tipo: "txt", nota: "Mandei o estimate, disse que vai olhar com a esposa" }] },
      { id: uid(), cliente: "Garcia Pool Deck", contato: "Ana Garcia", telefone: "(954) 555-0133", local: "Coral Springs, FL", servico: "Travertine pool deck", valor: 22500, enviadoEm: d(14), status: "aberto", obs: "Exemplo.", contatos: [{ data: d(14), tipo: "lig", nota: "Primeira ligação" }, { data: d(8), tipo: "txt", nota: "Perguntou sobre cor do travertino" }] },
      { id: uid(), cliente: "Smith Patio", contato: "Rob Smith", telefone: "(561) 555-0177", local: "Delray Beach, FL", servico: "Patio + fire pit", valor: 9800, enviadoEm: d(5), status: "aberto", agendadoEm: d(-4), obs: "Exemplo.", contatos: [{ data: d(5), tipo: "lig", nota: "Agendou visita pra semana que vem" }] },
      { id: uid(), cliente: "Oliveira Walkway", contato: "Paulo Oliveira", telefone: "(305) 555-0199", local: "Pompano Beach, FL", servico: "Front walkway", valor: 4200, enviadoEm: d(12), status: "fechou_outro", obs: "Exemplo. Fechou com concorrente por preço.", contatos: [{ data: d(12), tipo: "txt" }, { data: d(2), tipo: "lig", nota: "Fechou com outro" }] },
      { id: uid(), cliente: "Miller Backyard", contato: "Sarah Miller", telefone: "(561) 555-0121", local: "Boynton Beach, FL", servico: "Backyard pavers + pergola", valor: 31000, enviadoEm: d(18), status: "fechou", obs: "Exemplo. Depósito pago.", contatos: [{ data: d(18), tipo: "vis" }, { data: d(1), tipo: "lig", nota: "Fechou! Início dia 20" }] },
    ].map(normalizar);
  }

  // ---------------------------------------------------------------- derivados
  function ultimoContato(e) {
    if (!e.contatos.length) return null;
    return e.contatos.reduce((m, c) => (!m || c.data > m.data ? c : m), null);
  }
  function diasSemContato(e) {
    const u = ultimoContato(e);
    return diasEntre(u ? u.data : e.enviadoEm);
  }
  function severidade(e) {
    if (e.status !== "aberto") return "closed";
    if (e.agendadoEm) return diasEntre(e.agendadoEm) <= 0 ? "info" : "danger";
    const d = diasSemContato(e);
    if (d == null) return "ok";
    if (d >= 7) return "danger";
    if (d >= 3) return "warn";
    return "ok";
  }
  function dataReferencia(e) {
    const u = ultimoContato(e);
    return u && u.data > e.enviadoEm ? u.data : e.enviadoEm;
  }
  function textoBusca(e) {
    return norm([e.cliente, e.contato, e.local, e.servico, e.telefone, e.obs].join(" "));
  }

  // ---------------------------------------------------------------- render: follow-up
  const elLista = $("#lista-followup");
  const tpl = $("#tpl-slim-item");

  function renderFollowup() {
    const soAberto = $("#f-aberto").checked;
    const dias = Number($("#f-dias").value);
    const ordem = $("#f-ordem").value;
    const q = norm($("#f-busca").value.trim());

    const itens = store.itens.filter((e) => {
      if (soAberto && e.status !== "aberto") return false;
      if (dias > 0) {
        const d = diasEntre(dataReferencia(e));
        const agendadoFuturo = e.agendadoEm && diasEntre(e.agendadoEm) <= 0;
        if (d > dias && !agendadoFuturo) return false;
      }
      if (q && !textoBusca(e).includes(q)) return false;
      return true;
    });

    const porDias = (a, b) => diasSemContato(a) - diasSemContato(b);
    if (ordem === "recente") itens.sort(porDias);
    else if (ordem === "antigo") itens.sort((a, b) => -porDias(a, b));
    else if (ordem === "valor") itens.sort((a, b) => (b.valor || 0) - (a.valor || 0));

    elLista.innerHTML = "";
    $("#followup-vazio").hidden = itens.length > 0;

    for (const e of itens) {
      const li = tpl.content.firstElementChild.cloneNode(true);
      const sev = severidade(e);
      li.dataset.id = e.id;
      li.classList.add(`sev-${sev}`, `st-${e.status}`);
      if (e.status !== "aberto") li.classList.add("is-closed");

      $(".slim-nome", li).textContent = e.cliente;
      $(".slim-ref", li).textContent = e.estimate ? `#${e.estimate}` : "lead";
      $(".slim-ref", li).classList.toggle("is-lead", !e.estimate);

      const st = $(".slim-status", li);
      if (e.status === "aberto" && e.agendadoEm) {
        const dAg = diasEntre(e.agendadoEm);
        st.className = `slim-status pill ${dAg <= 0 ? "pill-info" : "pill-danger"}`;
        st.textContent = dAg < 0 ? `agendado ${fmtData(e.agendadoEm)}` : dAg === 0 ? "agendado HOJE" : `agendamento atrasado (${fmtData(e.agendadoEm)})`;
      } else {
        st.className = `slim-status pill ${STATUS_PILL[e.status] || "pill-muted"}`;
        st.textContent = STATUS_LABEL[e.status] || e.status;
      }

      $(".slim-quem", li).textContent = [e.contato, e.telefone].filter(Boolean).join(" ") || "sem telefone";
      $(".slim-onde", li).textContent = e.local || e.origem || "—";
      $(".slim-valor", li).textContent = e.valor != null ? fmtUSD(e.valor) : (e.servico || "—");

      const u = ultimoContato(e);
      const d = diasSemContato(e);
      const elUlt = $(".slim-ultimo", li);
      elUlt.innerHTML = u
        ? `<span class="tipo">${esc(TIPO_LABEL[u.tipo] || u.tipo)}</span> <b>${fmtDataLonga(u.data)}</b> <span class="muted">(${d === 0 ? "hoje" : d === 1 ? "ontem" : `${d} dias`})</span>${u.nota ? ` <span class="nota">— ${esc(u.nota)}</span>` : ""}`
        : `<span class="tipo">nenhum</span> <span class="muted">${e.estimate ? "estimate enviado" : "lead entrou"} em <b>${fmtDataLonga(e.enviadoEm)}</b> (${d} dias) e nada registrado depois</span>`;

      $(".slim-dias-n", li).textContent = d == null ? "—" : d;

      // pergunta de acompanhamento + caixinha de atualização
      const ask = $(".slim-ask", li);
      const pergunta = perguntaPara(e, u, d);
      ask.hidden = !pergunta;
      $(".slim-pergunta", li).textContent = pergunta || "";
      $(".slim-form", li).classList.add("write-only");
      if (sev === "info") $('.slim-form select', li).value = "vis";

      $$(".slim-actions .btn", li).forEach((b) => b.classList.add("write-only"));
      if (e.status !== "aberto") $('[data-act="fechou"]', li).hidden = true;
      elLista.appendChild(li);
    }
  }

  function primeiroNome(nome) { return (nome || "").trim().split(/\s+/)[0] || "o cliente"; }
  function perguntaPara(e, u, d) {
    if (e.status !== "aberto") return "";
    const nome = primeiroNome(e.cliente);
    if (e.agendadoEm) {
      const dAg = diasEntre(e.agendadoEm);
      if (dAg < 0) return `Visita marcada para ${fmtData(e.agendadoEm)}. Já confirmou com ${nome}? Anote qualquer mudança.`;
      if (dAg === 0) return `A visita com ${nome} é hoje. Como foi? Registre aqui o que ficou combinado.`;
      return `A visita era ${fmtData(e.agendadoEm)} e não tem nada registrado depois. Aconteceu? O que ${nome} disse?`;
    }
    if (!u) return `Nenhum contato registrado desde ${fmtData(e.enviadoEm)} (${d} dias). Já falou com ${nome}? Qual o status?`;
    const tipo = TIPO_LABEL[u.tipo] || u.tipo;
    if (d <= 1) return `${tipo} com ${nome} ${d === 0 ? "hoje" : "ontem"}. Ficou algum próximo passo combinado?`;
    return `Último ${tipo} com ${nome} foi ${fmtData(u.data)}, há ${d} dias. Teve contato depois disso? Qual a atualização?`;
  }

  elLista.addEventListener("submit", async (ev) => {
    const form = ev.target.closest(".slim-form");
    if (!form) return;
    ev.preventDefault();
    const li = form.closest("li[data-id]");
    const nota = form.elements.nota.value.trim();
    if (!nota) { form.elements.nota.focus(); return; }
    const btn = form.querySelector("button");
    btn.disabled = true;
    await store.registrarContato(li.dataset.id, { data: hojeISO(), tipo: form.elements.tipo.value, nota }, null, null);
    btn.disabled = false;
    toast("Atualização registrada");
  });

  elLista.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-act]");
    const li = ev.target.closest("li[data-id]");
    if (!li) return;
    if (ev.target.closest(".slim-form")) return;
    const id = li.dataset.id;
    if (!btn) { abrirHistorico(id); return; }
    ev.stopPropagation();
    const act = btn.dataset.act;
    if (act === "txt" || act === "lig") abrirContato(id, act);
    else if (act === "fechou") store.setStatus(id, "fechou");
    else if (act === "mais") abrirMenu(id, btn);
  });

  // ---------------------------------------------------------------- menu "mais"
  const menu = $("#menu-mais");
  let menuId = null;

  function abrirMenu(id, anchor) {
    menuId = id;
    const e = store.get(id);
    $('[data-act="aberto"]', menu).hidden = e.status === "aberto";
    $('[data-act="fechou"]', menu).hidden = e.status === "fechou";
    menu.hidden = false;
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const left = Math.max(8, Math.min(window.scrollX + r.right - mw, window.scrollX + window.innerWidth - mw - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${window.scrollY + r.bottom + 6}px`;
    $(".menu-item:not([hidden])", menu).focus();
  }
  function fecharMenu() { menu.hidden = true; menuId = null; }

  menu.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-act]");
    if (!b || !menuId) return;
    const id = menuId;
    fecharMenu();
    const act = b.dataset.act;
    if (act === "vis") abrirContato(id, "vis");
    else if (act === "agendar") abrirAgendar(id);
    else if (act === "historico") abrirHistorico(id);
    else if (act === "editar") abrirEstimate(id);
    else if (STATUS_LABEL[act]) store.setStatus(id, act);
  });
  document.addEventListener("click", (ev) => { if (!menu.hidden && !menu.contains(ev.target)) fecharMenu(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fecharMenu(); });
  window.addEventListener("resize", fecharMenu);

  // ---------------------------------------------------------------- render: padrão
  function renderPadrao() {
    const st = $("#p-status").value;
    const q = norm($("#p-busca").value.trim());
    const tbody = $("#tabela-padrao tbody");

    const itens = store.itens.filter((e) => (!st || e.status === st) && (!q || textoBusca(e).includes(q)));
    itens.sort((a, b) => (a.enviadoEm < b.enviadoEm ? 1 : -1));

    tbody.innerHTML = "";
    $("#padrao-vazio").hidden = itens.length > 0;
    $(".table-wrap").hidden = itens.length === 0;

    for (const e of itens) {
      const tr = document.createElement("tr");
      tr.dataset.id = e.id;
      const sev = severidade(e);
      if (sev === "danger") tr.classList.add("row-danger");
      if (sev === "warn") tr.classList.add("row-warn");
      if (e.status !== "aberto") tr.classList.add("row-closed");
      const u = ultimoContato(e);
      const d = diasSemContato(e);
      tr.innerHTML = `
        <td><strong>${esc(e.cliente)}</strong> <span class="muted num">${e.estimate ? `#${esc(e.estimate)}` : "lead"}</span>${e.obs ? `<div class="obs">${esc(e.obs)}</div>` : ""}</td>
        <td>${esc(e.contato || (e.telefone ? "" : "—"))}${e.telefone ? `<div class="num">${esc(e.telefone)}</div>` : ""}</td>
        <td>${esc(e.local || "—")}${e.origem ? `<div class="muted">${esc(e.origem)}</div>` : ""}</td>
        <td>${esc(e.servico || "—")}</td>
        <td class="num">${fmtUSD(e.valor)}</td>
        <td class="num">${fmtDataLonga(e.enviadoEm)}</td>
        <td><span class="pill ${STATUS_PILL[e.status] || "pill-muted"}">${esc(STATUS_LABEL[e.status] || e.status)}</span></td>
        <td>${u ? `${esc(TIPO_LABEL[u.tipo] || u.tipo)} · <span class="num">${fmtDataLonga(u.data)}</span>${u.nota ? `<div class="muted obs">${esc(u.nota)}</div>` : ""}` : "<span class='muted'>—</span>"}</td>
        <td class="num dias">${d == null ? "—" : d}</td>
        <td>${e.agendadoEm ? `<span class="pill ${diasEntre(e.agendadoEm) <= 0 ? "pill-info" : "pill-danger"}">${fmtDataLonga(e.agendadoEm)}</span>` : "<span class='muted'>—</span>"}</td>
        <td class="actions">
          <button class="btn btn-sm write-only" data-act="contato">+ contato</button>
          <button class="btn btn-sm btn-ghost" data-act="historico">histórico</button>
          <button class="btn btn-sm btn-ghost write-only" data-act="editar">editar</button>
        </td>`;
      tbody.appendChild(tr);
    }
  }

  $("#tabela-padrao").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-act]");
    const tr = ev.target.closest("tr[data-id]");
    if (!tr || !btn) return;
    const id = tr.dataset.id;
    if (btn.dataset.act === "contato") abrirContato(id, "txt");
    else if (btn.dataset.act === "historico") abrirHistorico(id);
    else if (btn.dataset.act === "editar") abrirEstimate(id);
  });

  // ---------------------------------------------------------------- dialogs
  const dlgEstimate = $("#dlg-estimate");
  const formEstimate = $("#form-estimate");

  function abrirEstimate(id) {
    const e = id ? store.get(id) : null;
    formEstimate.reset();
    $("#dlg-estimate-titulo").textContent = e ? "Editar estimate" : "Novo estimate";
    $("#btn-excluir").hidden = !e;
    const f = formEstimate.elements;
    f.id.value = e ? e.id : "";
    f.cliente.value = e?.cliente || "";
    f.contato.value = e?.contato || "";
    f.telefone.value = e?.telefone || "";
    f.local.value = e?.local || "";
    f.servico.value = e?.servico || "";
    f.valor.value = e?.valor ?? "";
    f.enviadoEm.value = e?.enviadoEm || hojeISO();
    f.status.value = e?.status || "aberto";
    f.agendadoEm.value = e?.agendadoEm || "";
    f.obs.value = e?.obs || "";
    dlgEstimate.showModal();
  }

  formEstimate.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = formEstimate.elements;
    const existente = f.id.value ? store.get(f.id.value) : null;
    const e = {
      id: f.id.value || uid(),
      cliente: f.cliente.value.trim(),
      contato: f.contato.value.trim(),
      telefone: f.telefone.value.trim(),
      local: f.local.value.trim(),
      servico: f.servico.value.trim(),
      valor: f.valor.value === "" ? null : Number(f.valor.value),
      enviadoEm: f.enviadoEm.value,
      status: f.status.value,
      agendadoEm: f.status.value === "aberto" ? f.agendadoEm.value || null : null,
      obs: f.obs.value.trim(),
      contatos: existente?.contatos || [],
    };
    if (!e.cliente) return;
    if (await store.escrever(e)) { dlgEstimate.close(); toast(existente ? "Estimate atualizado" : "Estimate criado"); }
  });

  $("#btn-excluir").addEventListener("click", () => {
    const id = formEstimate.elements.id.value;
    const e = store.get(id);
    if (!e) return;
    confirmar("Excluir estimate", `Excluir "${e.cliente}"? Não dá pra desfazer.`, async () => {
      if (await store.remover(id)) { dlgEstimate.close(); toast("Estimate excluído"); }
    });
  });

  const dlgContato = $("#dlg-contato");
  const formContato = $("#form-contato");

  function abrirContato(id, tipo = "txt") {
    const e = store.get(id);
    if (!e) return;
    formContato.reset();
    const f = formContato.elements;
    f.id.value = id;
    f.tipo.value = tipo;
    f.data.value = hojeISO();
    f.status.value = "";
    f.agendadoEm.value = "";
    $("#dlg-contato-titulo").textContent = tipo === "lig" ? "Registrar ligação" : tipo === "vis" ? "Registrar visita" : "Registrar contato";
    $("#dlg-contato-cliente").textContent = [e.cliente, e.contato, e.local].filter(Boolean).join(" · ");
    dlgContato.showModal();
  }

  formContato.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = formContato.elements;
    await store.registrarContato(
      f.id.value,
      { data: f.data.value, tipo: f.tipo.value, nota: f.nota.value.trim() },
      f.status.value || null,
      f.agendadoEm.value || null,
    );
    dlgContato.close();
    toast("Contato registrado");
  });

  const dlgAgendar = $("#dlg-agendar");
  const formAgendar = $("#form-agendar");
  function abrirAgendar(id) {
    const e = store.get(id);
    if (!e) return;
    formAgendar.elements.id.value = id;
    formAgendar.elements.data.value = e.agendadoEm || hojeISO();
    $("#btn-desagendar").hidden = !e.agendadoEm;
    $("#dlg-agendar-cliente").textContent = [e.cliente, e.contato, e.local].filter(Boolean).join(" · ");
    dlgAgendar.showModal();
  }
  formAgendar.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    await store.agendar(formAgendar.elements.id.value, formAgendar.elements.data.value);
    dlgAgendar.close();
  });
  $("#btn-desagendar").addEventListener("click", async () => {
    await store.agendar(formAgendar.elements.id.value, null);
    dlgAgendar.close();
  });

  const dlgHistorico = $("#dlg-historico");
  function abrirHistorico(id) {
    const e = store.get(id);
    if (!e) return;
    $("#dlg-historico-titulo").textContent = `Histórico · ${e.cliente}`;
    const ol = $("#lista-historico");
    ol.innerHTML = "";
    const lista = [...e.contatos].sort((a, b) => (a.data < b.data ? 1 : -1));
    if (!lista.length) ol.innerHTML = `<li><span class="h-data">—</span><span></span><span class="h-nota muted">Nenhum contato registrado.</span></li>`;
    for (const c of lista) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="h-data num">${fmtDataLonga(c.data)}</span><span class="pill pill-muted">${esc(c.tipo)}</span><span class="h-nota">${esc(c.nota || "")}</span>`;
      ol.appendChild(li);
    }
    dlgHistorico.showModal();
  }

  const dlgConfirmar = $("#dlg-confirmar");
  let confirmarCb = null;
  function confirmar(titulo, texto, cb) {
    $("#dlg-confirmar-titulo").textContent = titulo;
    $("#dlg-confirmar-texto").textContent = texto;
    confirmarCb = cb;
    dlgConfirmar.showModal();
  }
  $("#btn-confirmar-ok").addEventListener("click", async () => {
    const cb = confirmarCb; confirmarCb = null;
    dlgConfirmar.close();
    if (cb) await cb();
  });

  $$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

  // ---------------------------------------------------------------- abas / filtros / exportar-importar
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.toggle("is-active", x === t));
      $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${t.dataset.view}`));
      try { localStorage.setItem("usa-rep.view", t.dataset.view); } catch { /* ignore */ }
    }),
  );
  try {
    const v = localStorage.getItem("usa-rep.view");
    if (v) $(`.tab[data-view="${v}"]`)?.click();
  } catch { /* ignore */ }

  ["#f-aberto", "#f-dias", "#f-ordem", "#f-busca", "#p-status", "#p-busca"].forEach((sel) => $(sel).addEventListener("input", render));

  $("#btn-novo").addEventListener("click", () => abrirEstimate(null));
  $("#btn-novo").classList.add("write-only");
  $('label[for="input-importar"]').classList.add("write-only");

  $("#btn-exportar").addEventListener("click", async () => {
    const json = JSON.stringify(store.itens, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast(`JSON copiado (${store.itens.length} estimates)`);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = json; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      toast("Selecionado: use Ctrl/Cmd+C para copiar");
      setTimeout(() => ta.remove(), 15000);
    }
  });

  $("#input-importar").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const dados = JSON.parse(await file.text());
      if (!Array.isArray(dados)) throw new Error("o arquivo precisa ser uma lista de estimates");
      confirmar("Importar estimates", `Importar ${dados.length} estimates? Isso substitui os dados atuais.`, async () => {
        await store.substituirTudo(dados);
        toast("Importado");
      });
    } catch (err) {
      toast("Não consegui ler o arquivo: " + err.message);
    } finally {
      ev.target.value = "";
    }
  });

  // outra aba do navegador alterou os dados (modo local) → recarrega
  window.addEventListener("storage", (ev) => {
    if (store.modo === "local" && ev.key === STORE_KEY) {
      try { store.itens = JSON.parse(ev.newValue || "[]").map(normalizar); render(); } catch { /* ignore */ }
    }
  });

  // ---------------------------------------------------------------- boot
  function render() { renderFollowup(); renderPadrao(); }
  render();
  store.init();
})();
