// Junta: Histórico de Fechamentos (clientes, QuickBooks) + Acompanhamento Semanal (leads) + telefones do GHL
// Saída: out/estimates.json (lista de docs no formato do artefato USA Rep Estimates)
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/tmp/claude-0/-home-user-usa-rep/dbada401-fc24-5b9d-9510-84f641be6e4c/scratchpad";
const HOJE = "2026-10-13";
const readDir = (d) => readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => ({ id: f.replace(/\.json$/, ""), ...JSON.parse(readFileSync(join(d, f), "utf8")) }));

const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const slug = (s) => norm(s).replace(/ /g, "-") || "sem-nome";
const fmtPhone = (p) => {
  const d = (p || "").replace(/\D/g, "");
  const s = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
  return s.length === 10 ? `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}` : (p || "").trim();
};
const cidade = (zip) => { const m = (zip || "").match(/·\s*(.+)$/); return m ? m[1].trim() : ""; };

// ---------- telefones (GHL) ----------
const fones = new Map(); // norm(nome) -> telefone
function addFone(nome, tel) { const k = norm(nome); if (k && tel && !fones.has(k)) fones.set(k, fmtPhone(tel)); }
for (const f of readdirSync(ROOT).filter((x) => x.startsWith("ghl-sales-") && x.endsWith(".json"))) {
  const txt = readFileSync(join(ROOT, f), "utf8");
  const j = JSON.parse(txt.slice(txt.indexOf("{")));
  for (const o of j.data?.opportunities || []) addFone(o.contact?.name || o.name, o.contact?.phone);
}
if (existsSync(join(ROOT, "ghl-active.json"))) for (const o of JSON.parse(readFileSync(join(ROOT, "ghl-active.json"), "utf8"))) addFone(o.name, o.phone);

// ---------- fontes ----------
const clientes = readDir(join(ROOT, "src-historico/clientes")).filter((c) => c.nome);
const leads = readDir(join(ROOT, "src-semanal/leads")).filter((l) => l.nome);

// ---------- merge ----------
/** chave: número do estimate quando existe, senão nome normalizado */
const porChave = new Map();
const chaveDe = (est, nome) => (est ? `est:${String(est).trim()}` : `nome:${norm(nome)}`);

function novo(nome) {
  return { id: null, cliente: nome.trim(), contato: "", telefone: "", email: "", local: "", servico: "", valor: null, estimate: "", origem: "", enviadoEm: "", status: "aberto", agendadoEm: null, obs: "", contatos: [], fontes: [] };
}

// 1) QuickBooks (Histórico de Fechamentos) — base dos estimates
for (const c of clientes) {
  const k = chaveDe(c.estimate, c.nome);
  const e = porChave.get(k) || novo(c.nome);
  e.id = e.id || (c.estimate ? `qb-${c.estimate}` : `qb-${slug(c.nome)}`);
  e.estimate = c.estimate ? String(c.estimate) : e.estimate;
  e.servico = e.servico || c.servico || (c.tipos || []).join(", ");
  e.valor = e.valor ?? (c.valor || null);
  e.enviadoEm = e.enviadoEm || c.data || "";
  e.telefone = e.telefone || c.tel || "";
  e.origem = e.origem || c.origem || "";
  if (c.fechado) e.status = "fechou";
  if (c.obs) e.obs = [e.obs, c.obs].filter(Boolean).join(" ");
  e.fontes.push("historico");
  porChave.set(k, e);
}

// 2) Acompanhamento Semanal (leads) — contatos, datas, parecer
const PARECER_TIPO = [["textoEnviado", "txt"], ["ligacaoNaoAtendeu", "lig"], ["naoAtendeu", "lig"], ["primeiroContato", "lig"]];
for (const l of leads) {
  let k = chaveDe(l.estimate, l.nome);
  if (!porChave.has(k) && l.estimate) k = chaveDe("", l.nome); // tenta por nome
  if (!porChave.has(k)) k = chaveDe(l.estimate, l.nome);
  // também tenta casar por nome quando a chave por estimate não existe
  let e = porChave.get(k);
  if (!e) { for (const [kk, v] of porChave) if (kk.startsWith("nome:") ? kk === `nome:${norm(l.nome)}` : norm(v.cliente) === norm(l.nome)) { e = v; break; } }
  if (!e) { e = novo(l.nome); e.id = `lead-${slug(l.nome)}`; porChave.set(k, e); }

  e.telefone = e.telefone || l.tel || "";
  e.email = e.email || l.email || "";
  e.local = e.local || cidade(l.zip) || (l.zip ? `ZIP ${l.zip}` : "");
  e.servico = e.servico || l.servico || "";
  e.valor = e.valor ?? (l.valor || null);
  e.estimate = e.estimate || (l.estimate ? String(l.estimate) : "");
  e.enviadoEm = l.dataEstimate || e.enviadoEm || l.data || "";
  e.origem = e.origem && e.origem !== "QuickBooks" ? e.origem : (l.origem && l.origem !== "QuickBooks" ? l.origem : e.origem);
  const p = l.parecer || {};
  if (p.fechou) e.status = "fechou";
  else if (p.perdeu) e.status = "fechou_outro";
  else if (p.descartado) e.status = "desistiu";
  // contatos
  const tipoUlt = (PARECER_TIPO.find(([kk]) => p[kk]) || [null, "lig"])[1];
  const datas = new Set();
  if (l.dataVisita && l.dataVisita <= HOJE) { e.contatos.push({ data: l.dataVisita, tipo: "vis", nota: "Visita / medição" }); datas.add(l.dataVisita); }
  if (l.ultimoContato && !datas.has(l.ultimoContato)) { e.contatos.push({ data: l.ultimoContato, tipo: tipoUlt, nota: p.primeiroContato ? "Falou com o cliente" : "" }); datas.add(l.ultimoContato); }
  else if (l.ultimaTentativa && !datas.has(l.ultimaTentativa)) { e.contatos.push({ data: l.ultimaTentativa, tipo: tipoUlt, nota: "Tentativa, sem resposta" }); datas.add(l.ultimaTentativa); }
  if (l.dataResposta && !datas.has(l.dataResposta)) { e.contatos.push({ data: l.dataResposta, tipo: "txt", nota: "Cliente respondeu ao estimate" }); datas.add(l.dataResposta); }
  if (l.dataFollowUpEst && !datas.has(l.dataFollowUpEst)) { e.contatos.push({ data: l.dataFollowUpEst, tipo: "txt", nota: "Follow-up do estimate" }); datas.add(l.dataFollowUpEst); }
  // agendamento
  if (l.dataVisita && l.dataVisita > HOJE && e.status === "aberto") e.agendadoEm = l.dataVisita;
  if (!e.agendadoEm && l.proxFollowUp && l.proxFollowUp > HOJE && e.status === "aberto") e.proxFollowUp = l.proxFollowUp;
  const obsL = (l.obs || "").replace(/\s*Importado do QuickBooks: data de entrada = data do estimate\.?/, "").trim();
  if (obsL) e.obs = [e.obs, obsL].filter(Boolean).join(" ");
  if (l.prazo) e.obs = [e.obs, `Prazo: ${l.prazo}.`].filter(Boolean).join(" ");
  if (l.crm) e.crm = l.crm;
  e.fontes.push("semanal");
}

// 3) telefones do GHL para quem ficou sem
for (const e of porChave.values()) {
  if (!e.telefone) { const t = fones.get(norm(e.cliente)); if (t) e.telefone = t; }
  e.telefone = fmtPhone(e.telefone);
  e.contatos.sort((a, b) => (a.data < b.data ? -1 : 1));
  e.enviadoEm = e.enviadoEm || HOJE;
  if (e.status !== "aberto") e.agendadoEm = null;
  e.atualizadoEm = new Date().toISOString();
  e.fontes = [...new Set(e.fontes)];
}

const out = [...porChave.values()].sort((a, b) => (a.enviadoEm < b.enviadoEm ? 1 : -1));
mkdirSync(join(ROOT, "out"), { recursive: true });
writeFileSync(join(ROOT, "out/estimates.json"), JSON.stringify(out, null, 2));
const resumo = {
  total: out.length,
  porStatus: out.reduce((m, e) => ((m[e.status] = (m[e.status] || 0) + 1), m), {}),
  comTelefone: out.filter((e) => e.telefone).length,
  comContato: out.filter((e) => e.contatos.length).length,
  agendados: out.filter((e) => e.agendadoEm).map((e) => `${e.cliente} ${e.agendadoEm}`),
  ultimos20dias: out.filter((e) => e.enviadoEm >= "2026-09-23").length,
  fonesGHL: fones.size,
};
console.log(JSON.stringify(resumo, null, 2));
