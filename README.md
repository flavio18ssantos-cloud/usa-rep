# usa-rep · Estimates

Acompanhamento de estimates em duas telas que usam o **mesmo** armazenamento (localStorage do navegador):

| Tela | Pra quê |
|---|---|
| **Follow-up** (slim) | Lista reta e objetiva: nome, quem, onde, valor, status, dias sem contato, como foi o último contato (txt / ligação / visita) e data agendada. Ações rápidas na própria linha. |
| **Padrão** (completo) | Tabela com todas as informações, observações, histórico de contatos, edição e exclusão. |

Marcar "fechou", "fechou com outro" ou "desistiu" em qualquer tela reflete na outra na hora.

## Follow-up

- Filtro **Só em aberto** (ligado por padrão) e janela de **últimos 20 dias** (7 / 30 / 60 / todos).
- Ordenação padrão: contato mais recente → mais antigo. Também: mais tempo sem contato primeiro, maior valor.
- Destaque por dias sem contato (estimates em aberto):
  - verde: até 2 dias
  - amarelo: 3 a 6 dias
  - vermelho: 7+ dias, ou agendamento cuja data já passou sem atualização
  - azul: tem visita/estimate **agendado** pra frente (mostra a data e não entra em alerta)
- Botões por linha: `txt`, `lig` (registra o contato de hoje), `✓ fechou`, `⋯` (visita, agendar data, fechou com outro, desistiu, reabrir, histórico, editar).

## Dados

- Ficam no navegador (localStorage). **Exportar** baixa um JSON; **Importar** restaura/substitui.
- Na primeira abertura sem dados salvos, entram alguns exemplos para visualizar a tela. Apague-os ou importe os seus.

## Rodar

É estático, sem build. Abra `index.html` direto no navegador ou sirva a pasta:

```
python3 -m http.server 8080
```
