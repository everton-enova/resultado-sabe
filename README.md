# Inscrições EPT e EJA — 2026

Projeto independente para inscrição nos eventos de resultados das avaliações:

| Evento | Data | Limite inicial |
|---|---|---|
| EPT | 07/10/2026 | 250 |
| EJA | 08/10/2026 | 250 |

Uma pessoa pode se inscrever nos dois eventos, uma vez em cada. O site preserva o formulário, as cores, a imagem de fundo e a identidade visual da referência fornecida: [formulario_credenciamento](https://github.com/everton-web/formulario_credenciamento).

## O que está pronto

- Página única com seleção de EPT/EJA, formulário compartilhado e confirmação com protocolo.
- Campos de nome, CPF, telefone, e-mail, função/instituição e campos condicionais de município/NTE.
- Catálogo de 417 municípios e 80 opções de função (incluindo as combinações de 27 NTEs), extraído da referência.
- Vagas independentes por evento, função, grupo compartilhado e município; limite total aplicado junto às cotas.
- Validação de CPF no navegador e no servidor; duplicidade por evento; bloqueio de concorrência no Apps Script.
- Reenvio da mesma solicitação recupera o protocolo sem nova gravação enquanto a página é mantida aberta.
- API para Vercel, Apps Script e função que cria a estrutura da planilha sem sobrescrever abas existentes.
- Painel de vagas atualizado manualmente pelo menu da planilha. A disponibilidade do site é calculada diretamente das inscrições, independentemente do painel.

Não há gravação em planilha até configurar a integração. Sem conexão, é possível conhecer os formulários, com envio desabilitado. Não há simulação de inscrição confirmada na interface de produção.

## Ver a prévia no computador

Requisito: Node.js 22 ou superior. O projeto não exige pacotes externos.

```sh
node scripts/dev.cjs
```

Abra `http://127.0.0.1:4173`. Para conectar uma planilha de testes, copie `.env.example` para `.env` e preencha as duas variáveis. Sem `.env`, o site permanece em preparação.

## 1. Criar a nova planilha e o Apps Script

1. Crie uma planilha Google Sheets vazia na conta responsável.
2. Abra **Extensões → Apps Script** nessa planilha.
3. Crie três arquivos de script: `Code`, `Core` e `Catalogo`. Cole, respectivamente, o conteúdo de `apps-script/Code.gs`, `apps-script/Core.js` e `apps-script/Catalogo.gs`. No editor Google, `Core` aparecerá como `.gs`; isso é esperado.
4. Nas configurações do projeto, use o fuso `America/Bahia`. O arquivo `apps-script/appsscript.json` contém o manifesto de referência.
5. Em **Propriedades do script**, configure `SPREADSHEET_ID` com o ID da NOVA planilha e `API_SECRET` com um segredo aleatório de pelo menos 32 caracteres. Não cole o segredo no código nem o publique no GitHub.
6. Execute `prepararPlanilha` e conceda acesso à nova planilha pela conta responsável. A função cria `Eventos`, `Funcoes`, `MunicipiosNTE`, `Inscricoes` e `Vagas`.
7. Execute novamente se necessário: abas preenchidas são preservadas.

O código não usa IDs, endpoints nem gatilhos do projeto antigo. Não há migração de inscrições anteriores.

## 2. Configurar eventos e vagas

Na aba **Eventos**, já serão criadas as linhas `ept` e `eja`, ambas com 250 no campo `LimiteTotal` e status `RASCUNHO`.

| Campo | Como preencher |
|---|---|
| EventoID | Preserve `ept` e `eja` |
| Nome | EPT / EJA |
| Data | Texto `2026-10-07` / `2026-10-08` |
| Local / Horario | Informações reais do evento; vazios aparecem como “A divulgar” |
| Abertura / Encerramento | Texto no formato `AAAA-MM-DDTHH:mm:ss-03:00`, com datas escolhidas pela organização |
| Status | `RASCUNHO` até concluir os testes; depois `ABERTO`. Qualquer outro valor impede novas inscrições |
| LimiteTotal | Inicialmente 250 por evento; editável |
| LimitePorMunicipio | Inicialmente 1, herdado da referência para representantes municipais; editável por evento |

Mantenha as colunas de datas como **texto simples**. Abertura e encerramento precisam ter fuso explícito, e encerramento deve ser posterior à abertura. As datas do evento não são automaticamente usadas como prazo de inscrição.

Na aba **Funcoes**, cada evento possui suas próprias linhas:

- `Limite`: quantidade permitida. Todas as cotas começam em **0**, aguardando sua distribuição; zero fecha a opção. Campo vazio/inválido fecha a configuração do evento.
- `Ativa`: use `SIM` para disponibilizar uma função; `NAO` para removê-la das opções.
- `GrupoVagas`: funções com o mesmo grupo compartilham a mesma cota. As duas funções municipais usam `representantes-municipais`; preencha o mesmo limite em ambas. Exemplo: 30 nas duas linhas significa **30 vagas compartilhadas**, não 60.
- Funções de NTE têm linhas por número e função, permitindo exceções próprias. A exceção antiga do NTE 19 não é aplicada automaticamente.
- O limite total do evento prevalece mesmo se a soma de cotas for maior que 250. Diminuir uma cota abaixo dos inscritos não cancela inscrições existentes; apenas impede novas entradas.
- Não renomeie `EventoID`, `FuncaoID` ou `GrupoVagas` após inscrições, pois são chaves para contagem. Alterações estruturais precisam de migração explícita.
- Não crie linhas duplicadas para a mesma função/evento. Valores desconhecidos não são aceitos no envio.

Na aba **MunicipiosNTE**, revise o catálogo herdado. NTE de representante municipal é derivado do município; funções de NTE usam o NTE da linha da função.

Não editar a aba **Inscricoes** durante o recebimento de envios: o bloqueio protege rotinas do Apps Script, não edições humanas. A primeira versão não inclui fluxo administrativo de cancelamento, substituição ou lista de espera.

## 3. Publicar o Apps Script

1. **Implantar → Nova implantação → Aplicativo da Web**.
2. Executar como a conta responsável; acesso para **Qualquer pessoa**, se permitido pelo domínio. A planilha continua privada e o código exige o segredo para cada chamada.
3. Copie a URL terminada em `/exec`.
4. Se a política da organização impedir web apps acessíveis sem login, será necessário adequar a integração antes da publicação; não tornar a planilha pública.
5. Ao alterar código posteriormente, edite a implantação e escolha uma **nova versão**. Editar apenas a planilha não exige nova implantação.

Referência oficial: [Web Apps do Google Apps Script](https://developers.google.com/apps-script/guides/web).

## 4. Novo GitHub e Vercel

1. Crie um repositório vazio na outra conta e envie o conteúdo desta pasta como raiz do repositório. Não inclua a pasta `reference/`, `.env`, dados de inscrições ou credenciais.
2. Na Vercel, importe esse repositório. Framework: **Other**. Build: `npm run build`. Pasta de saída: `dist`. O arquivo `vercel.json` já define build e saída; preserve a pasta `api/` na raiz.
3. Configure as variáveis da Vercel:
   - `APPS_SCRIPT_URL`: URL `/exec` da nova implantação.
   - `APPS_SCRIPT_SECRET`: exatamente o mesmo valor da propriedade `API_SECRET` do Apps Script.
4. Escolha Node.js 22 ou superior suportado pela Vercel. Publique novamente após alterar variáveis.
5. Use uma planilha de testes e um Apps Script separados nos ambientes Preview. Não conecte prévias de teste à planilha oficial.

Referência oficial: [Funções Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js).

## Verificações

```sh
node --test --test-isolation=none tests/*.test.cjs
node scripts/check.cjs
node scripts/build.cjs
```

Os testes locais cobrem regras de CPF, isolamento por evento, limite total, cotas, prazos, reenvio, API e uso do bloqueio/gravação com serviços Google simulados. O teste real de concorrência e a confirmação de gravação em Google Sheets precisam ser feitos após configurar o novo Apps Script. A função de gravação trata todo valor como texto literal para evitar fórmulas e preservar zeros do CPF.

Antes de abrir inscrições: testar duas solicitações para a última vaga na planilha de testes, verificar reenvio após perda de resposta, conferir eventos e cotas, revisar informações de privacidade/contato e preencher os prazos. Só então mudar o evento para `ABERTO`.

## Escopo e pendências

O projeto está gerado localmente, sem publicação externa. Faltam a nova planilha e implantação do Apps Script, repositório na nova conta, projeto Vercel, distribuição de cotas, períodos de inscrição, local e horário.

Declarações, envio de e-mails, exportação automática de pendentes e gestão de presença não foram ativados: são módulos opcionais da referência, sem definição para EPT/EJA. A primeira versão confirma a inscrição na tela e fornece protocolo.

`ARQUITETURA.md` preserva a proposta original e as decisões recebidas; este README descreve o escopo efetivamente implementado.
