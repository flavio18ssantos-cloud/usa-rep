# Handoff: Estrutura de Artefatos (modelo de referência)

> **Para quem é este documento:** repasse para o cliente como referência de **o que construir no ambiente Codex / ChatGPT** para ter funcionalidades parecidas com as que existem hoje no ambiente Cloud do Claude. Não é um manual de uso do Claude: é a descrição do *que existe*, *para que serve*, *como filtra* e *o que falta*, e a seção 8 trata da migração.
>
> **Como usar este modelo:** as partes marcadas com `[CLIENTE]` devem ser preenchidas com o contexto real de cada cliente (ver seção 9, Acompanhamento). Antes de repassar, remover da seção 2 os itens marcados 🔒 e qualquer dado pessoal de terceiros.
>
> **Versão:** final, 21/10/2026. Revisar as datas e os itens ⚠️ ao repassar.

---

## 1. Visão geral

Hoje a operação roda em **artefatos**: páginas HTML interativas, publicadas no ambiente Cloud do Claude e compartilháveis por link, que funcionam como mini-sistemas de trabalho. Elas usam quatro recursos que dependem desse ambiente:

| Recurso no Cloud (Claude) | O que faz | Equivalente no Codex / ChatGPT (verificar plano) |
|---|---|---|
| **Página HTML** (interface) | Tela de uso diário: cards, tabelas, filtros, botões | Arquivo HTML/JS no repositório, hospedado em host próprio, ou app com backend |
| **Banco do artefato** (`db`) | Dados compartilhados, em tempo real, entre quem abre a página | Banco com login (Supabase, Firebase, Airtable ou Sheets) |
| **Conectores** | Leitura/escrita em QuickBooks, Gmail, Google Calendar, CRM (LeadConnector) | APIs chamadas pelo servidor, ou Zapier/Make, ou conectores nativos disponíveis no plano |
| **localStorage** | Preferências do próprio navegador (idioma, última aba, progresso pessoal) | `localStorage` no próprio app (igual) |

**Regra de ouro:** dado que precisa ser compartilhado ou durar vai para um banco com login; preferência pessoal fica no navegador. Nada de dado real, token ou chave de API dentro do HTML.

---

## 2. Inventário dos artefatos

Estado: ✅ funcionando · ⚠️ funciona com ressalva · ⛔ vazio ou não legível · 🔒 pessoal (não repassar)

### 2.1 Comercial e leads

**Acompanhamento Semanal de Leads** ⚠️
- **Tem:** 5 cards-resumo (leads, sem contato, follow-up, estimates, fechados); leads agrupados por semana; linha do tempo de 7 etapas; termômetro de temperatura; sugestão de follow-up (SMS e roteiro de ligação gerados por IA); guia de regras de atendimento; modo impressão; pt/es/en.
- **Objetivo:** acompanhar cada lead desde a entrada até o fechamento e priorizar quem precisa de ação hoje.
- **Filtros:** mês, semana, período, status, termômetro, origem, serviço, tags, busca, "Ação imediata", "Necessita follow-up", checagem de duplicado no cadastro.
- **Melhorar:** arquivo muito pesado (~225 KB, imagens em base64, CSS duplicado); separar o guia em outra página; confirmar que quem abre pelo link não dispara sincronizações com as contas.

**Leads de anúncios (lista mobile)** ⚠️ — *versão "Leads USA VIP Floors"*
- **Tem:** cartões de lead com botões Ligar, Copiar e Feito, campo de anotação; resumo (semana, pendentes, feitos, total); agrupamento por dia.
- **Objetivo:** atender leads de anúncios no celular, durante as ligações.
- **Filtros:** Esta semana, Pendentes, Feitos, Todos; busca por nome, telefone, e-mail, CEP e tipo de serviço; ordenação do mais novo para o mais antigo.
- **Melhorar:** o status "Feito" fica só no navegador de quem marcou (a equipe não vê o que o outro já fez); os dados estão embutidos no HTML; não entra lead novo automaticamente; telefones sem código do país.

**USA Rep Estimates** ⚠️
- **Tem:** duas abas (Follow-up e Padrão); faixas de severidade (em dia, 3–6 dias, 7+ dias, agendado); botões de ação rápida (txt, ligação, visita, fechou, necessita follow-up); modais para criar, editar, registrar contato com mensagem sugerida, agendar e ver histórico; exportar e importar JSON.
- **Objetivo:** controlar estimates enviados, cobrar follow-up e registrar o resultado.
- **Filtros:** só em aberto, só com follow-up pendente, janela de dias, origem, status, busca, ordenação.
- **Melhorar:** falta resumo de conversão; o modo sem banco usa dados de exemplo fictícios que podem confundir; importação no modo banco remove registros que não estão no arquivo, sem confirmação visível; "copiar JSON" exporta telefones e valores.

**Histórico de Fechamentos** ⚠️
- **Tem:** 4 cards (clientes, fechados, não fechados, conversão); lista de clientes com botão de status; modo "Editar lista" (telefone, origem, remover com confirmação).
- **Objetivo:** medir quais estimates viraram trabalho e a taxa de conversão, por quantidade e por valor.
- **Filtros:** ano, mês, período (7/15/30 dias), status, serviço (gerado dos dados), origem.
- **Melhorar:** busca por nome; ordenação; exportação; data de fechamento; explicar a origem "Protec" na interface. Atenção: alternar status grava um ajuste manual que sobrepõe a lógica automática.

**Melhores Práticas Comerciais** ✅ (guia estático)
- **Tem:** cartões de regras: situação e ação, cadência (lead novo em 14 dias, pós-estimate em 30 dias), o que funciona e o que não funciona, horário e consentimento, fontes classificadas por tipo.
- **Objetivo:** referência de atendimento para a equipe.
- **Filtros:** só troca de idioma e abrir/fechar o guia.
- **Melhorar:** datar o conteúdo; vincular cada regra à fonte; o título interno ainda herda o nome do painel de leads. Regras jurídicas (horário, consentimento) precisam de revisão antes de uso.

### 2.2 Operação do dia a dia

**Painel do Dia** ⚠️
- **Tem:** seletor "Eu sou" (duas pessoas); 6 indicadores (hoje, atrasadas, em andamento, aguardando, feitas, compromissos); resumo automático do dia; "Nova tarefa" com linguagem natural; tarefas por dia com estágio, prioridade, tags, notas, comentários e subtarefas; alarmes sonoros; envio de e-mail e SMS.
- **Objetivo:** painel operacional compartilhado entre sócios: tarefas, agenda, leads, e-mails e financeiro do dia.
- **Filtros:** busca livre, responsável, estágio.
- **Melhorar:** a rotina automática pode não estar gravando (aparece "ainda não rodou"); sem tratamento de edição simultânea; **restringir o acesso** porque a página pode enviar e-mails e alterar o CRM.

**Painel do Dia COWORK** ⚠️ (versão para coordenação de obra)
- **Tem:** timeline do dia com alerta de conflito de horário; "Top 3" de prioridades; tarefas rápidas; alertas; barra fixa "Próxima ação".
- **Objetivo:** visão do dia de quem coordena as equipes em campo: quem vai a qual endereço, conflitos e o que confirmar antes de sair.
- **Filtros:** só marcar/desmarcar. Sem busca.
- **Melhorar:** conteúdo montado à mão e desatualizado; deveria gerar a agenda a partir de uma fonte viva (banco ou conector de calendário) com data automática.

**Agenda pessoal** 🔒 ⚠️ — *cópia estática de agenda individual*
- **Tem:** lista cronológica por dia, legenda de 5 tipos de evento, destaque de "hoje" e "amanhã".
- **Melhorar:** é uma cópia de uma data específica (fica defasada); faltam atualização automática e vínculo com o calendário; sinalizar "horário a confirmar".

**Bloco de Notas** 🔒 ✅ — *uso pessoal*
- **Tem:** lista de notas com busca; editor com salvamento automático; excluir em duas etapas.
- **Melhorar:** sem pastas, tags, exportação ou desfazer.

### 2.3 Financeiro

**Financeiro (livro-caixa)** ⚠️
- **Tem:** 9 abas: Relatório (dia/semana/mês), Análise, QuickBooks, Entradas, Saídas, Mês a mês (matriz parâmetros × meses), A receber, Estimates, Parâmetros. Cards, tabelas, formulários de lançamento.
- **Objetivo:** controlar entradas e saídas, com previsto versus realizado, e cruzar com o QuickBooks.
- **Filtros:** mês/ano, saldo inicial, competência ou data, "com previsto" ou "só realizado", parâmetro, tipo. Edição direta nas células da matriz.
- **Melhorar:** a aba Análise é texto fixo com data antiga; precisa ser gerada a partir dos dados.

**Rotina do Caixa** ⚠️
- **Tem:** programa de 4 semanas com uma ação por dia (20 lições); checklists diário, semanal e mensal; metas para o ano seguinte com barra de progresso; contador de sequência.
- **Objetivo:** organizar as finanças da empresa em rotina.
- **Melhorar:** o progresso é compartilhado (todos alteram o mesmo estado), o que não funciona para checklist pessoal; falta botão de reiniciar; metas não deveriam ter acesso aberto.

**Radar de Investimentos** 🔒 ⚠️ — *contém dados financeiros pessoais; não repassar*
- **Tem:** 7 abas (Hoje, Carteira, Simulador, Cripto, Agenda, Aprender, Fontes); indicadores com explicação; simulador de efeito por ativo.
- **Melhorar:** a edição é antiga, os números estão desatualizados; falta data de coleta por indicador e mecanismo de atualização.

### 2.4 Gestão de obras e clientes

**USA Floors Control** ⚠️
- **Tem:** bloco "Hoje" (follow-ups, conflitos de equipe, cobranças atrasadas, jobs do dia); listas de Leads (pipeline), Semana (jobs), Cobranças e Marketing; seletor de status; data de follow-up com atalhos (+3d, fechou, perdido); sinal de lead "esfriando" após 5 dias; alerta de conflito quando duas obras usam a mesma equipe no mesmo dia.
- **Objetivo:** gestão operacional de vendas, agenda de obras e cobranças.
- **Filtros:** não tem busca nem filtro por status ou cidade.
- **Melhorar:** não é possível editar nome, valor ou data (só status e follow-up); faltam relatórios de faturamento e conversão.

**Sala de Aprovação de Vídeos** ⚠️ — *exemplo de aprovação com cliente externo*
- **Tem:** um cartão por vídeo com player, descrição (para quê, para quem, onde), roteiro, texto do post com botão copiar, decisão "Aprovar" ou "Pedir mudança", comentário e atalho de WhatsApp.
- **Objetivo:** o cliente aprova conteúdo antes de publicar.
- **Melhorar:** há só um vídeo apesar de o título falar em vários; link de WhatsApp sem número; não registra quem respondeu. **Atenção:** um vídeo mostra o nome de uma pessoa real, pendente de confirmação. Não publicar sem essa confirmação.

**Modelo Base de Estimate** ⛔ — *documento no Claude Docs*
- Conteúdo não verificado nesta revisão. Confirmar o que ele traz antes de replicar.

### 2.5 Marketing e conhecimento

**Painel SEO Local** ⛔
- Estrutura criada, sem dados nem fontes. Definir a origem dos dados (Search Console, Google Business Profile ou equivalente) antes de usar.

**Ideias de Implementação (documento estático)** ⚠️
- **Tem:** seis seções (apresentação de venda, presença online, presença nos trabalhos, organização, promoções de fim de ano, prioridades); status em emoji; tabela de calendário de campanhas.
- **Melhorar:** sem índice; status só muda regenerando a página. Migrar para uma tabela com responsável, prazo e status. Alguns fatos estão marcados para confirmação.

**Guia Rápido de IA** ✅
- **Tem:** 5 abas (começar, glossário de 28 termos com busca e filtro, plano de 4 semanas com critério de reprovação, regras antes de enviar, tabela "peça assim" com botão copiar).
- **Melhorar:** citar apenas ferramentas que o cliente realmente tem; os textos ainda não foram testados na conta de quem vai usar.

**Untitled** ⛔ — documento em branco no Claude Docs. Dar propósito ou apagar.

---

## 3. Padrões comuns (o que todo artefato tem)

- **Cards-resumo no topo** com contadores clicáveis que aplicam filtro.
- **Busca livre** (nem todos têm; é a melhoria mais pedida).
- **Filtros por status, responsável, período e origem.**
- **Botões de ação rápida** por linha (ligar, copiar, marcar como feito, fechou/perdido).
- **Estado persistido** em banco com sincronização ao vivo, ou em navegador quando é preferência pessoal.
- **Modo sem banco** com aviso explícito (boa prática, manter).
- **Export/import JSON ou CSV** em poucos casos (falta padronizar).

---

## 4. Riscos a tratar antes de repassar

1. **Links abertos a "qualquer pessoa com o link"** com dados de clientes, telefones, valores e patrimônio pessoal (Histórico de Fechamentos, Acompanhamento de Leads, USA Rep Estimates, Melhores Práticas, Agenda, Leads USA VIP, Financeiro, Radar, Painel do Dia). Revisar e restringir.
2. **Dados embutidos no HTML** (Agenda, Leads USA VIP, Painel do Dia COWORK): quem abre o código vê tudo.
3. **Escrita sem regra definida** no banco (Financeiro, Rotina do Caixa, Sala de Aprovação): qualquer pessoa com acesso pode alterar.
4. **Ações externas a partir da página** (Gmail, LeadConnector, QuickBooks, SMS): confirmar que só quem é autorizado dispara.
5. **Conteúdo jurídico sem revisão** (horário e consentimento em Melhores Práticas).

---

## 5. Sugestões de novas funcionalidades (para o dia a dia do cliente)

**Prioridade alta**
- **Busca global** entre leads, estimates, jobs e clientes.
- **Resumo diário automático** (manhã) por e-mail ou WhatsApp: o que vence hoje, o que atrasou, quem ligar.
- **Alerta de follow-up vencido** com lembrete no celular.
- **Permissões por pessoa** (quem vê, quem edita, quem dispara ações externas).
- **Histórico de alterações** (quem mudou o quê e quando), principalmente em status e valores.
- **Importação por planilha** (CSV) para não digitar leads um a um.

**Prioridade média**
- **Relatório semanal automático** de conversão, receita prevista e cobranças em aberto.
- **Lembrete de cobrança** com tom ajustado ao atraso.
- **Alocação de equipe e obra** com aviso de conflito antes de confirmar a data.
- **Assinatura digital ou aprovação formal** de estimate (hoje o aceite é um clique).
- **Fonte viva para agenda** (conector de calendário) em vez de cópia manual.
- **Metas com progresso** atualizado pelos dados reais, não por digitação.

**Prioridade baixa / a avaliar**
- Modo offline para uso em obra sem sinal.
- Exportação para PDF de estimates e relatórios financeiros.
- Atribuição de origem de lead (qual anúncio gerou qual contato) com custo por lead.

---

## 6. Ordem sugerida de implantação para o cliente

1. Começar por **um** fluxo que dói hoje (em geral: leads e follow-up).
2. Depois, o **resumo diário** para dar visibilidade.
3. Só então **financeiro e metas**, que exigem mais cuidado com acesso.
4. Revisar permissões e links **antes** de compartilhar com a equipe.

---

## 7. Checklist de segurança para qualquer artefato compartilhado

- [ ] Link restrito a quem precisa (não "qualquer pessoa com o link").
- [ ] Nenhum telefone, CPF, endereço ou valor financeiro embutido no HTML.
- [ ] Dados sensíveis no banco com regra de escrita definida.
- [ ] Ações externas (e-mail, SMS, sincronização) só para usuários autorizados.
- [ ] Conteúdo pessoal fora da versão repassada ao cliente.
- [ ] Dados com data de atualização visível.

---

## 8. Migração: do ambiente Cloud (Claude) para Codex / ChatGPT

### 8.1 O que muda de fundo

- **Hoje:** o artefato é o próprio produto. Ele é publicado no claude.ai, tem banco e conectores embutidos na plataforma, gera texto com IA dentro da página e é compartilhado por link.
- **No Codex/ChatGPT:** essa camada não vem junto. Não existe "publicar artefato" nem banco automático. O projeto vira um **repositório** (código, documentação e configuração) em que o agente trabalha em um sandbox. Cada artefato passa a ser código versionado, com hospedagem, banco, login e integrações feitos explicitamente.

### 8.2 Mapeamento

| Hoje (Cloud Claude) | No Codex / ChatGPT | Cuidado |
|---|---|---|
| Artefato HTML publicado | Arquivo HTML/JS no repositório, em host estático ou app com backend | "Qualquer pessoa com o link" não deve ser replicado: usar login e perfis |
| Banco do artefato (`db`, tempo real) | Banco real com autenticação (Postgres/Supabase, Firebase, Airtable ou Sheets) | Regra de escrita por usuário, nunca aberta |
| Conectores (QuickBooks, Gmail, Calendar, LeadConnector) | APIs chamadas pelo servidor, ou Zapier/Make, ou conector nativo do plano | Tokens só em variáveis de ambiente; nunca no HTML |
| IA dentro da página (gerar SMS, roteiro de ligação) | Chamada à API do modelo feita pelo backend | A chave fica no servidor; definir limite de custo |
| Documentos no Claude Docs (Untitled, Modelo Base de Estimate) | Markdown no repositório ou Google Docs | Migrar o conteúdo, não o link |
| Rotina automática (ex.: Painel do Dia) | Job agendado: GitHub Actions, cron ou automação disponível na ferramenta do cliente | Confirmar o que o plano suporta antes de prometer |
| Aprovação com comentário (Sala de Aprovação) | Tabela de decisões com identificação de quem decidiu | Hoje qualquer pessoa com acesso sobrescreve a decisão anterior |
| Preferências no navegador (`localStorage`) | `localStorage` do próprio app | Igual |
| Instruções do agente e regras de negócio (CLAUDE.md, skills) | `AGENTS.md` no repositório (lido pelo Codex) e instruções fixas no GPT | Regras escritas no arquivo, não só na memória da conversa |

### 8.3 Ordem de migração sugerida

1. Criar o repositório com **um HTML por artefato** e dados de exemplo fictícios, com README.
2. Separar as três camadas: interface (HTML), dados (banco) e integrações (servidor).
3. Escolher banco e autenticação **antes** de copiar dados reais.
4. Reimplementar as integrações uma a uma, começando pela que mais dói (em geral, leads e follow-up).
5. Trazer os dados reais por importação (CSV), com o checklist da seção 7.
6. Escrever o `AGENTS.md` com regras de negócio, papéis e o que o agente pode ou não alterar.
7. Validar com o cliente e só então desligar o artefato original.

### 8.4 O que não migra sozinho

- **Dados atuais do banco do artefato:** exportar e reimportar; não há migração automática garantida.
- **Histórico, versões e comentários** guardados no Cloud: verificar o que é exportável antes de contar com isso.
- **Contas, tokens e permissões:** o cliente cria as próprias contas; nada é reaproveitado dos conectores atuais.
- **Custos e limites:** de IA, de automações e de hospedagem, definidos com o cliente antes do go-live.
- **Recursos de plano:** conectores, agendamentos e skills variam por plano e por ferramenta. Confirmar com o cliente antes de desenhar a solução.

---

## 9. Acompanhamento do cliente  `[CLIENTE]`

> Preencher uma vez por cliente. Esta seção é o que torna o modelo específico.

**Perfil**
- Nome do cliente / empresa: `[CLIENTE]`
- Segmento: `[CLIENTE]`
- Pessoas que usam o sistema e seus papéis: `[CLIENTE]`
- Ferramentas que ele já usa (CRM, planilha, agenda, financeiro, e-mail, WhatsApp): `[CLIENTE]`

**Artefatos escolhidos para replicar** (marcar)
- [ ] Acompanhamento de leads
- [ ] Follow-up de estimates
- [ ] Histórico de fechamentos
- [ ] Painel do dia
- [ ] Agenda e obras
- [ ] Financeiro (livro-caixa)
- [ ] Rotina do caixa
- [ ] Guia de boas práticas
- [ ] Sala de aprovação
- [ ] Outros: `[CLIENTE]`

**Dores atuais** (o que mais perde tempo ou dinheiro hoje): `[CLIENTE]`

**Dados de partida** (quantos leads, estimates ou jobs por mês; formato dos dados atuais): `[CLIENTE]`

**Regras de negócio próprias** (status, prazos de follow-up, cadência, horários, políticas de cobrança): `[CLIENTE]`

**Acesso e segurança**
- Quem vê, quem edita, quem dispara ações externas: `[CLIENTE]`
- Checklist da seção 7 concluído: ☐ sim ☐ não

**Acompanhamento**

| Data | O que foi feito | Próximo passo | Responsável | Status |
|---|---|---|---|---|
| `[DATA]` | `[CLIENTE]` | `[CLIENTE]` | `[CLIENTE]` | `[CLIENTE]` |

**Métricas de sucesso acordadas** (ex.: tempo médio de primeiro contato, taxa de conversão, cobranças em atraso): `[CLIENTE]`

**Próxima revisão:** `[DATA]`
