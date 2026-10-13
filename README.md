# usa-rep · Estimates

Acompanhamento de estimates em duas telas que usam o **mesmo** armazenamento:

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

## Onde ficam os dados

- **Publicado como artefato (claude.ai):** no banco compartilhado do artefato. Quem abrir a página vê as mesmas informações, ao vivo. O selo no topo mostra "compartilhado · ao vivo".
- **Aberto direto do repositório:** no localStorage do navegador (selo "só neste navegador"). Na primeira abertura entram exemplos marcados como "Exemplo"; apague-os ou importe os seus.
- **Copiar JSON** copia todos os estimates; **Importar** substitui pelos de um arquivo JSON.

## Rodar / publicar

Sem build para uso local: abra `index.html` ou sirva a pasta (`python3 -m http.server 8080`).

Para gerar o arquivo único usado na publicação como artefato:

```
node scripts/build-artifact.mjs   # gera dist/artifact.html
```
