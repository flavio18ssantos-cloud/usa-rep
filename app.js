/* USA Rep · Estimates
 * Duas telas (Follow-up slim e Padrão) sobre o MESMO armazenamento.
 * Qualquer mudança feita em uma reflete imediatamente na outra.
 */
(() => {
  "use strict";

  const STORE_KEY = "usa-rep.estimates.v1";

  // ---------------------------------------------------------------- util
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const parseISO = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const diasEntre = (isoA, isoB = hojeISO()) => {
    const a = parseISO(isoA), b = parseISO(isoB);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  };
  const fmtData = (iso) => {
    const d = parseISO(iso);
    return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
  };
  const fmtDataLonga = (iso) => {
    const d = parseISO(iso);
    return d ? d.toLocaleDateString("pt-BR") : "—";
  };
  const fmtUSD = (n) =>
    n == null || n === "" ? "—" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const STATUS_LABEL = {
    aberto: "em aberto",
    fechou: "fechou",
    fechou_outro: "fechou c/ outro",
    desistiu: "desistiu",
  };
  const STATUS_PILL = {
    aberto: "pill-info",
    fechou: "pill-ok",
    fechou_outro: "pill-muted",
    desistiu: "pill-muted",
  };
  const TIPO_LABEL = { txt: "txt", lig: "ligação", vis: "visita", email: "e-mail" };

  // ---------------------------------------------------------------- store
  /** @typedef {{ data: string, tipo: 'txt'|'lig'|'vis'|'email', nota?: string }} Contato */
  /** @typedef {{
   *   id: string, cliente: string, contato?: string, telefone?: string, local?: string,
   *   servico?: string, valor?: number|null, enviadoEm: string,
   *   status: 'aberto'|'fechou'|'fechou_outro'|'desistiu',
   *   agendadoEm?: string|null, obs?: string, contatos: Contato[],
   *   atualizadoEm: string
   * }} Estimate */

  const store = {
    /** @type {Estimate[]} */
    itens: [],
    load() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        this.itens = raw ? JSON.parse(raw) : seed();
      } catch {
        this.itens = seed();
      }
      if (!Array.isArray(this.itens)) this.itens = [];
      this.save(false);
    },
    save(notify = true) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.itens)); } catch { /* sem storage: segue em memória */ }
      if (notify) render();
    },
    get(id) { return this.itens.find((e) => e.id === id); },
    upsert(e) {
      e.atualizadoEm = new Date().toISOString();
      const i = this.itens.findIndex((x) => x.id === e.id);
      if (i >= 0) this.itens[i] = e; else this.itens.unshift(e);
      this.save();
    },
    remove(id) {
      this.itens = this.itens.filter((e) => e.id !== id);
      this.save();
    },
    registrarContato(id, contato, novoStatus, agendadoEm) {
      const e = this.get(id);
      if (!e) return;
      e.contatos = e.contatos || [];
      e.contatos.push(contato);
      e.contatos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
      if (novoStatus) e.status = novoStatus;
      if (agendadoEm !== undefined) e.agendadoEm = agendadoEm || null;
      // se o contato registrado já passou da data agendada, limpa o agendamento vencido
      if (e.agendadoEm && contato.data >= e.agendadoEm && !agendadoEm) e.agendadoEm = null;
      this.upsert(e);
    },
    setStatus(id, status) {
      const e = this.get(id);
      if (!e) return;
      e.status = status;
      if (status !== "aberto") e.agendadoEm = null;
      this.upsert(e);
    },
  };

  // dados de exemplo só na primeira abertura (sem nada salvo)
  function seed() {
    const d = (n) => {
      const x = new Date(); x.setDate(x.getDate() - n);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    return [
      { id: uid(), cliente: "Johnson Residence", contato: "Mike Johnson", telefone: "(561) 555-0100", local: "Boca Raton, FL", servico: "Paver driveway 1,200 sqft", valor: 14800, enviadoEm: d(9), status: "aberto", agendadoEm: null, obs: "Quer começar antes do Thanksgiving.", contatos: [{ data: d(9), tipo: "vis", nota: "Visita e medição" }, { data: d(3), tipo: "txt", nota: "Mandei o estimate, disse que vai olhar com a esposa" }] },
      { id: uid(), cliente: "Garcia Pool Deck", contato: "Ana Garcia", telefone: "(954) 555-0133", local: "Coral Springs, FL", servico: "Travertine pool deck", valor: 22500, enviadoEm: d(14), status: "aberto", agendadoEm: null, obs: "", contatos: [{ data: d(14), tipo: "lig", nota: "Primeira ligação" }, { data: d(8), tipo: "txt", nota: "Perguntou sobre cor do travertino" }] },
      { id: uid(), cliente: "Smith Patio", contato: "Rob Smith", telefone: "(561) 555-0177", local: "Delray Beach, FL", servico: "Patio + fire pit", valor: 9800, enviadoEm: d(5), status: "aberto", agendadoEm: d(-4), obs: "", contatos: [{ data: d(5), tipo: "lig", nota: "Agendou visita pra semana que vem" }] },
      { id: uid(), cliente: "Oliveira Walkway", contato: "Paulo Oliveira", telefone: "(305) 555-0199", local: "Pompano Beach, FL", servico: "Front walkway", valor: 4200, enviadoEm: d(12), status: "fechou_outro", agendadoEm: null, obs: "Fechou com concorrente por preço.", contatos: [{ data: d(12), tipo: "txt" }, { data: d(2), tipo: "lig", nota: "Fechou com outro" }] },
      { id: uid(), cliente: "Miller Backyard", contato: "Sarah Miller", telefone: "(561) 555-0121", local: "Boynton Beach, FL", servico: "Backyard pavers + pergola", valor: 31000, enviadoEm: d(18), status: "fechou", agendadoEm: null, obs: "Depósito pago.", contatos: [{ data: d(18), tipo: "vis" }, { data: d(1), tipo: "lig", nota: "Fechou! Início dia 20" }] },
      { id: uid(), cliente: "Brown Driveway", contato: "Tom Brown", telefone: "(954) 555-0150", local: "Parkland, FL", servico: "Driveway extension", valor: 7600, enviadoEm: d(26), status: "desistiu", agendadoEm: null, obs: "", contatos: [{ data: d(26), tipo: "txt" }, { data: d(15), tipo: "txt", nota: "Adiou pro ano que vem" }] },
    ].map((e) => ({ ...e, atualizadoEm: new Date().toISOString() }));
  }

  // ---------------------------------------------------------------- derivados
  function ultimoContato(e) {
    if (!e.contatos || !e.contatos.length) return null;
    return e.contatos.reduce((m, c) => (!m || c.data > m.data ? c : m), null);
  }
  function diasSemContato(e) {
    const u = ultimoContato(e);
    return diasEntre(u ? u.data : e.enviadoEm);
  }
  /** severidade do alerta no follow-up */
  function severidade(e) {
    if (e.status !== "aberto") return "closed";
    if (e.agendadoEm) {
      const dAg = diasEntre(e.agendadoEm); // negativo = futuro
      if (dAg <= 0) return "info";       // agendado pra frente (ou hoje)
      return "danger";                   // agendamento passou e ninguém atualizou
    }
    const d = diasSemContato(e);
    if (d == null) return "ok";
    if (d >= 7) return "danger";
    if (d >= 3) return "warn";
    return "ok";
  }
  function dataReferencia(e) {
    // data usada pelo filtro "últimos N dias": o evento mais recente do estimate
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

    let itens = store.itens.filter((e) => {
      if (soAberto && e.status !== "aberto") return false;
      if (dias > 0) {
        const d = diasEntre(dataReferencia(e));
        const agendadoFuturo = e.agendadoEm && diasEntre(e.agendadoEm) <= 0;
        if (d > dias && !agendadoFuturo) return false;
      }
      if (q && !textoBusca(e).includes(q)) return false;
      return true;
    });

    const sortDias = (a, b) => diasSemContato(a) - diasSemContato(b);
    if (ordem === "recente") itens.sort(sortDias);
    else if (ordem === "antigo") itens.sort((a, b) => -sortDias(a, b));
    else if (ordem === "valor") itens.sort((a, b) => (b.valor || 0) - (a.valor || 0));

    elLista.innerHTML = "";
    $("#followup-vazio").hidden = itens.length > 0;

    for (const e of itens) {
      const li = tpl.content.firstElementChild.cloneNode(true);
      const sev = severidade(e);
      li.dataset.id = e.id;
      li.classList.add(`sev-${sev}`);
      if (e.status !== "aberto") li.classList.add("is-closed");

      $(".slim-nome", li).textContent = e.cliente;

      const st = $(".slim-status", li);
      if (e.status === "aberto" && e.agendadoEm) {
        const dAg = diasEntre(e.agendadoEm);
        st.className = `slim-status pill ${dAg <= 0 ? "pill-info" : "pill-danger"}`;
        st.textContent = dAg < 0 ? `agendado ${fmtData(e.agendadoEm)}` : dAg === 0 ? "agendado HOJE" : `agendamento atrasado (${fmtData(e.agendadoEm)})`;
      } else {
        st.className = `slim-status pill ${STATUS_PILL[e.status] || "pill-muted"}`;
        st.textContent = STATUS_LABEL[e.status] || e.status;
      }

      $(".slim-quem", li).textContent = [e.contato, e.telefone].filter(Boolean).join(" ") || "—";
      $(".slim-onde", li).textContent = e.local || "—";
      $(".slim-valor", li).textContent = fmtUSD(e.valor);

      const u = ultimoContato(e);
      $(".slim-ultimo", li).textContent = u
        ? `último: ${TIPO_LABEL[u.tipo] || u.tipo} em ${fmtData(u.data)}${u.nota ? ` — ${u.nota}` : ""}`
        : `enviado em ${fmtData(e.enviadoEm)}, sem contato depois`;

      const d = diasSemContato(e);
      $(".slim-dias-n", li).textContent = d == null ? "—" : d;

      if (e.status !== "aberto") {
        $$('[data-act="fechou"]', li).forEach((b) => (b.hidden = true));
      }
      elLista.appendChild(li);
    }
  }

  elLista.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-act]");
    const li = ev.target.closest("li[data-id]");
    if (!li) return;
    const id = li.dataset.id;
    if (!btn) { abrirEstimate(id); return; }
    const act = btn.dataset.act;
    if (act === "txt" || act === "lig") abrirContato(id, act);
    else if (act === "fechou") { if (confirm("Marcar como FECHOU com a gente?")) store.setStatus(id, "fechou"); }
    else if (act === "mais") menuMais(id, btn);
  });

  function menuMais(id, anchor) {
    // menu simples via prompt de opções (sem dependências)
    const e = store.get(id);
    const opcoes = [
      ["1", "Registrar visita"],
      ["2", "Agendar visita / estimate (data)"],
      ["3", "Fechou com outro"],
      ["4", "Desistiu"],
      ["5", "Reabrir (em aberto)"],
      ["6", "Ver histórico"],
      ["7", "Editar tudo"],
    ];
    const r = prompt(`${e.cliente}\n\n${opcoes.map(([k, l]) => `${k} — ${l}`).join("\n")}\n\nDigite o número:`);
    switch ((r || "").trim()) {
      case "1": abrirContato(id, "vis"); break;
      case "2": {
        const dt = prompt("Agendado para (AAAA-MM-DD):", e.agendadoEm || hojeISO());
        if (dt && /^\d{4}-\d{2}-\d{2}$/.test(dt)) { e.agendadoEm = dt; e.status = "aberto"; store.upsert(e); }
        break;
      }
      case "3": store.setStatus(id, "fechou_outro"); break;
      case "4": store.setStatus(id, "desistiu"); break;
      case "5": store.setStatus(id, "aberto"); break;
      case "6": abrirHistorico(id); break;
      case "7": abrirEstimate(id); break;
    }
    anchor.blur();
  }

  // ---------------------------------------------------------------- render: padrão
  function renderPadrao() {
    const st = $("#p-status").value;
    const q = norm($("#p-busca").value.trim());
    const tbody = $("#tabela-padrao tbody");

    let itens = store.itens.filter((e) => (!st || e.status === st) && (!q || textoBusca(e).includes(q)));
    itens.sort((a, b) => (a.enviadoEm < b.enviadoEm ? 1 : -1));

    tbody.innerHTML = "";
    $("#padrao-vazio").hidden = itens.length > 0;

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
        <td><strong>${esc(e.cliente)}</strong>${e.obs ? `<div class="obs">${esc(e.obs)}</div>` : ""}</td>
        <td>${esc(e.contato || "—")}${e.telefone ? `<div class="muted">${esc(e.telefone)}</div>` : ""}</td>
        <td>${esc(e.local || "—")}</td>
        <td>${esc(e.servico || "—")}</td>
        <td class="num">${fmtUSD(e.valor)}</td>
        <td>${fmtDataLonga(e.enviadoEm)}</td>
        <td><span class="pill ${STATUS_PILL[e.status] || "pill-muted"}">${esc(STATUS_LABEL[e.status] || e.status)}</span></td>
        <td>${u ? `${esc(TIPO_LABEL[u.tipo] || u.tipo)} · ${fmtDataLonga(u.data)}${u.nota ? `<div class="muted">${esc(u.nota)}</div>` : ""}` : "<span class='muted'>—</span>"}</td>
        <td class="num dias">${d == null ? "—" : d}</td>
        <td>${e.agendadoEm ? `<span class="pill ${diasEntre(e.agendadoEm) <= 0 ? "pill-info" : "pill-danger"}">${fmtDataLonga(e.agendadoEm)}</span>` : "<span class='muted'>—</span>"}</td>
        <td class="actions">
          <button class="btn btn-sm" data-act="contato">+ contato</button>
          <button class="btn btn-sm btn-ghost" data-act="historico">histórico</button>
          <button class="btn btn-sm btn-ghost" data-act="editar">editar</button>
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

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------------------------------------------------------- dialogs
  const dlgEstimate = $("#dlg-estimate");
  const formEstimate = $("#form-estimate");

  function abrirEstimate(id) {
    const e = id ? store.get(id) : null;
    formEstimate.reset();
    $("#dlg-estimate-titulo").textContent = e ? "Editar estimate" : "Novo estimate";
    $("#btn-excluir").hidden = !e;
    formEstimate.elements.id.value = e ? e.id : "";
    formEstimate.elements.cliente.value = e?.cliente || "";
    formEstimate.elements.contato.value = e?.contato || "";
    formEstimate.elements.telefone.value = e?.telefone || "";
    formEstimate.elements.local.value = e?.local || "";
    formEstimate.elements.servico.value = e?.servico || "";
    formEstimate.elements.valor.value = e?.valor ?? "";
    formEstimate.elements.enviadoEm.value = e?.enviadoEm || hojeISO();
    formEstimate.elements.status.value = e?.status || "aberto";
    formEstimate.elements.agendadoEm.value = e?.agendadoEm || "";
    formEstimate.elements.obs.value = e?.obs || "";
    dlgEstimate.showModal();
  }

  formEstimate.addEventListener("submit", (ev) => {
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
      agendadoEm: f.agendadoEm.value || null,
      obs: f.obs.value.trim(),
      contatos: existente?.contatos || [],
      atualizadoEm: new Date().toISOString(),
    };
    if (!e.cliente) return;
    store.upsert(e);
    dlgEstimate.close();
  });

  $("#btn-excluir").addEventListener("click", () => {
    const id = formEstimate.elements.id.value;
    if (id && confirm("Excluir este estimate? Não dá pra desfazer.")) { store.remove(id); dlgEstimate.close(); }
  });

  const dlgContato = $("#dlg-contato");
  const formContato = $("#form-contato");

  function abrirContato(id, tipo = "txt") {
    const e = store.get(id);
    if (!e) return;
    formContato.reset();
    formContato.elements.id.value = id;
    formContato.elements.tipo.value = tipo;
    formContato.elements.data.value = hojeISO();
    formContato.elements.status.value = "";
    formContato.elements.agendadoEm.value = "";
    $("#dlg-contato-cliente").textContent = `${e.cliente}${e.contato ? ` · ${e.contato}` : ""}${e.local ? ` · ${e.local}` : ""}`;
    dlgContato.showModal();
  }

  formContato.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = formContato.elements;
    store.registrarContato(
      f.id.value,
      { data: f.data.value, tipo: f.tipo.value, nota: f.nota.value.trim() },
      f.status.value || null,
      f.agendadoEm.value ? f.agendadoEm.value : undefined,
    );
    dlgContato.close();
  });

  const dlgHistorico = $("#dlg-historico");
  function abrirHistorico(id) {
    const e = store.get(id);
    if (!e) return;
    $("#dlg-historico-titulo").textContent = `Histórico · ${e.cliente}`;
    const ol = $("#lista-historico");
    ol.innerHTML = "";
    const lista = [...(e.contatos || [])].sort((a, b) => (a.data < b.data ? 1 : -1));
    if (!lista.length) ol.innerHTML = `<li><span class="h-data">—</span><span></span><span class="h-nota muted">Nenhum contato registrado.</span></li>`;
    for (const c of lista) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="h-data">${fmtDataLonga(c.data)}</span><span class="pill pill-muted">${esc(c.tipo)}</span><span class="h-nota">${esc(c.nota || "")}</span>`;
      ol.appendChild(li);
    }
    dlgHistorico.showModal();
  }

  $$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

  // ---------------------------------------------------------------- tabs / filtros / import-export
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

  ["#f-aberto", "#f-dias", "#f-ordem", "#f-busca", "#p-status", "#p-busca"].forEach((sel) =>
    $(sel).addEventListener("input", render),
  );

  $("#btn-novo").addEventListener("click", () => abrirEstimate(null));

  $("#btn-exportar").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store.itens, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `estimates-${hojeISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#input-importar").addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const dados = JSON.parse(await file.text());
      if (!Array.isArray(dados)) throw new Error("formato inválido");
      if (confirm(`Importar ${dados.length} estimates? Isso SUBSTITUI os dados atuais.`)) {
        store.itens = dados.map((e) => ({ ...e, id: e.id || uid(), contatos: e.contatos || [], status: e.status || "aberto" }));
        store.save();
      }
    } catch (err) {
      alert("Não consegui ler o arquivo: " + err.message);
    } finally {
      ev.target.value = "";
    }
  });

  // outra aba do navegador alterou os dados → recarrega
  window.addEventListener("storage", (ev) => {
    if (ev.key === STORE_KEY) { store.load(); render(); }
  });

  // ---------------------------------------------------------------- boot
  function render() { renderFollowup(); renderPadrao(); }
  store.load();
  render();
})();
