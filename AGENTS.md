# AGENTS.md

Instruções para agentes (Codex, ChatGPT ou outro) que trabalham neste repositório.

## Contexto

Este projeto reúne os **artefatos** de operação de uma empresa, migrados do ambiente Cloud do Claude para um repositório. Cada artefato era uma página HTML publicada, com banco, conectores e IA embutidos na plataforma. Aqui, cada um vira código versionado, com hospedagem, banco e integrações feitos explicitamente.

A referência funcional está em `docs/handoff-artefatos.md`. Leia antes de mudar qualquer tela.

## Regras obrigatórias

1. **Nenhum dado real no repositório.** Não colocar nomes, telefones, e-mails, endereços, CPF, valores financeiros reais ou patrimônio no código, no HTML ou em arquivos de exemplo. Use dados fictícios marcados como exemplo.
2. **Nenhum segredo no código.** Tokens, chaves de API e senhas vêm de variáveis de ambiente, lidas somente no servidor. Nunca no HTML ou no JavaScript do navegador. Não commitar arquivos `.env`.
3. **Dado compartilhado vai para um banco com login.** Preferência pessoal (idioma, última aba, filtro) pode usar `localStorage`. Status, tarefas, leads e lançamentos não.
4. **Sem acesso aberto.** Nenhuma tela pode depender de "qualquer pessoa com o link". Toda leitura e escrita passa por autenticação e por perfil.
5. **Ações externas só para usuários autorizados.** Envio de e-mail, SMS, sincronização com QuickBooks ou CRM e qualquer escrita em sistema externo exigem permissão explícita e confirmação na interface.
6. **Conteúdo pessoal fica fora.** Itens marcados como pessoais no handoff (agenda individual, bloco de notas, carteira de investimentos) não são migrados para este repositório.
7. **Conteúdo jurídico não é inventado.** Regras de horário e consentimento precisam de revisão humana. Marcar como pendente, nunca apresentar como definitivo.

## Estrutura esperada

```
/                    README.md, AGENTS.md
/docs                handoff e documentação de negócio
/apps/<artefato>     um diretório por artefato (index.html, módulos, testes)
/data-examples       dados fictícios para desenvolvimento e testes
/integrations        clientes de API (QuickBooks, CRM, e-mail), somente no servidor
```

A estrutura é uma sugestão. Ajuste quando o primeiro artefato for implementado e registre a mudança no README.

## Como implementar um artefato

1. Crie `apps/<artefato>/` com a interface em HTML e os scripts ao lado.
2. Separe interface, dados e integração. A interface nunca chama API externa diretamente.
3. Use dados de `data-examples/` nos testes. Nunca dados reais.
4. Trate estados vazios, erro e perda de conexão com mensagem clara para o usuário.
5. Garanta layout em celular (largura de cerca de 400px) sem rolagem horizontal.
6. Respeite o tema claro e o escuro, com cores definidas em variáveis.
7. Registre no README o que foi feito, o que falta e o que depende de credencial ou plano.

## Verificação antes de concluir

- Rode os testes e o lint do projeto, se existirem. Se não existirem, diga isso explicitamente.
- Busque no diff qualquer telefone, e-mail, CPF ou valor com aparência de dado real.
- Confirme que nenhum segredo entrou no diff.
- Teste a tela em largura de celular.
- Relate o que foi verificado e o que não foi, sem afirmar sucesso que não aconteceu.

## Idioma e tom

- Interface e documentação em português do Brasil, a menos que o cliente peça outro idioma.
- Textos da interface escritos do ponto de vista de quem usa a tela, com verbos de ação claros.
- Código, nomes de variáveis e commits em inglês ou português, com consistência dentro do arquivo.

## Limites deste arquivo

Este arquivo descreve como trabalhar, não o que cada artefato faz. O comportamento de cada tela está no handoff. Dúvidas sobre regra de negócio devem ser levadas ao responsável antes de implementar.
