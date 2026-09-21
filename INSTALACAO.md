# Ligar o formulário à planilha

Passo a passo para o site gravar inscrições na planilha e o painel se atualizar sozinho.
Ao final, cada inscrição aparece na aba `Inscricoes` e o painel da aba `Vagas` recalcula
`Inscritos` e `Disponíveis` na hora.

## 1. Criar o projeto Apps Script

Na planilha: **Extensões → Apps Script**. O projeto nasce vinculado a ela.

Crie três arquivos com o conteúdo do repositório, mantendo os nomes:

| Arquivo no Apps Script | Origem | Linhas | Quando é necessário |
|---|---|---|---|
| `Planilha.gs` | `apps-script/Planilha.gs` | 58 | sempre |
| `Api.gs` | `apps-script/Api.gs` | 56 | sempre |
| `Painel.gs` | `apps-script/Painel.gs` | 69 | sempre |
| `Monitoramento.gs` | `apps-script/Monitoramento.gs` | 88 | sempre |
| `Menu.gs` | `apps-script/Menu.gs` | 76 | sempre |
| `Core.gs` | `apps-script/Core.js` | 109 | sempre |
| `Catalogo.gs` | `apps-script/Catalogo.gs` | 106 | opcional: semeia as cotas da aba `Funcoes` |
| `Municipios.gs` | `apps-script/Municipios.gs` | 421 | opcional: semeia a aba `MunicipiosNTE` |

Os arquivos são curtos de propósito. Colagens longas chegam truncadas ao editor, com corte
observado em torno da **linha 100** — por isso o código está repartido, e não em um
`Code.gs` único. Todos compartilham o mesmo escopo global; a ordem não importa.

> **Se a colagem truncar** (`SyntaxError: Unexpected end of input`), o problema quase sempre
> está em *de onde* você copiou, não no arquivo. Páginas que rolam — a visualização de
> arquivo do GitHub, um cartão de anexo, um visualizador embutido — renderizam só um pedaço,
> e `Ctrl+A` copia apenas o que está renderizado. Baixe o arquivo e copie de um editor de
> texto, ou abra a URL `raw.githubusercontent.com`, que entrega texto puro sem rolagem
> virtual. Antes de salvar, confira o número da última linha contra a tabela acima.

Copie sempre pelo arquivo **bruto** do GitHub (`raw.githubusercontent.com`), não pela
página com destaque de sintaxe: ela carrega o conteúdo aos poucos e a cópia sai cortada.
Se a colagem truncar, o editor recusa salvar com `SyntaxError: Unexpected end of input` e
o número da linha em que o texto acabou. Confira o total de linhas contra a tabela acima.

`Catalogo.gs` e `Municipios.gs` só são lidos por `prepararPlanilha`, e os dois são
**opcionais**: o projeto funciona com os cinco arquivos do script e o `Core.gs` apenas. Sem eles, as abas
`Funcoes` e `MunicipiosNTE` nascem só com o cabeçalho, e `prepararPlanilha` avisa disso no
registro de execução. Você preenche as cotas colando o `Funcoes.csv` do repositório.

Depois que as abas existem, o site lê tudo da planilha — mudar esses dois arquivos, ou
apagá-los do projeto, não altera nada no que está no ar. **Se a colagem de um deles
insistir em truncar, apague o arquivo do projeto e siga em frente.**

Em **Configurações do projeto**, marque *Mostrar o arquivo de manifesto* e substitua
`appsscript.json` pelo conteúdo de `apps-script/appsscript.json`. Ele fixa o fuso
`America/Bahia`, usado no carimbo de data e na comparação com o prazo.

## 2. Propriedades do script

Ainda em **Configurações do projeto → Propriedades do script**:

| Propriedade | Valor |
|---|---|
| `SPREADSHEET_ID` | o trecho entre `/d/` e `/edit` na URL da planilha |
| `API_SECRET` | um segredo aleatório de 32 caracteres ou mais |

`SPREADSHEET_ID` você preenche à mão. O `API_SECRET` **não precisa de terminal**: no
editor do Apps Script, escolha a função `mostrarSegredo` na barra de cima e clique em
**Executar**. Ela gera um segredo de 64 caracteres, já grava na propriedade `API_SECRET`
e mostra o valor no **registro de execução**, embaixo. Copie de lá para a Vercel no
passo 5.

Rodar de novo não troca o segredo: se já existir um válido, ela apenas mostra o mesmo
valor. Para trocar de propósito, apague a propriedade `API_SECRET` antes e rode outra vez
— lembrando de atualizar a Vercel junto, senão os dois lados deixam de se reconhecer.

Se preferir gerar por fora: no PowerShell do Windows,
`-join ((48..57)+(97..102) | Get-Random -Count 48 | % {[char]$_})`; no Mac ou Linux,
`openssl rand -hex 24`.

Esse segredo é o que autoriza o site a gravar na planilha. Não reaproveite senha de
outro sistema, não coloque no repositório e não mande por mensagem.

> **Antes de rodar:** a planilha está compartilhada como *qualquer pessoa com o link pode
> editar*. Nessa configuração, qualquer um que tenha o link abre o editor do Apps Script e
> lê o segredo — além de já poder ver os CPFs das abas de assinatura. Restrinja o
> compartilhamento a pessoas específicas antes de seguir.

## 3. Criar as abas

Recarregue a planilha e use o menu **Inscrições EPT / EJA → Preparar estrutura**.
Autorize o acesso quando o Google pedir.

A função cria `Eventos`, `Funcoes`, `MunicipiosNTE` e `Inscricoes` já preenchidas com
as cotas e o prazo, e **nunca sobrescreve aba que já tenha conteúdo** — inclusive a
sua aba `Vagas`, que ela não toca em momento algum.

Se alguma dessas quatro abas já existir com conteúdo antigo, renomeie a antiga antes
(`Inscricoes 2025`, por exemplo), senão ela será considerada já configurada.

## 4. Ligar a atualização automática

Menu **Inscrições EPT / EJA → Ativar atualização automática**. Isso instala um gatilho
de cinco minutos que recalcula o painel.

O painel também é recalculado imediatamente a cada inscrição confirmada, dentro do
mesmo bloqueio que grava a linha — essa é a atualização que importa. O gatilho é rede
de segurança, para o caso de edição manual na planilha, e por isso é espaçado: de minuto
em minuto ele competia com o site pelas execuções do Apps Script.

### As duas visões

O script mantém duas coisas atualizadas:

**Aba `Monitoramento`** — montada e formatada por ele. Um bloco por evento, lado a lado,
com EJA em vermelho e EPT em azul, as mesmas cores do site. Cada bloco traz
`Função / Instituição`, `Limite`, `Inscritos`, `Disponíveis` e `Ocupação` em porcentagem,
com a célula de ocupação colorida: verde até 80%, âmbar a partir de 80% e vermelho quando
lota. A última linha é o `TOTAL` do evento, em negrito. As funções de NTE aparecem
agregadas por papel — "Diretores dos NTE", 27 vagas — como no seu painel impresso.
No topo fica a hora da última atualização.

Para criar a aba na primeira vez, use o menu **Montar painel de monitoramento**.

**Aba `Vagas`** — a sua, montada à mão. O script escreve **apenas** as colunas
`Inscritos` e `Disponíveis` de cada bloco do seu painel. Rótulo, limite, cores e mesclagens continuam seus. Ele localiza os blocos pelo
cabeçalho `Função / Instituição` e descobre o evento pelo título acima (`EJA` ou `EPT`),
então mover os blocos de coluna não quebra nada; renomear o cabeçalho, sim.

## 5. Publicar como aplicativo da Web

**Implantar → Nova implantação → Tipo: App da Web**:

- Executar como: **Eu**
- Quem tem acesso: **Qualquer pessoa**

Copie a URL terminada em `/exec`.

Na Vercel, em *Settings → Environment Variables* do projeto:

| Variável | Valor |
|---|---|
| `APPS_SCRIPT_URL` | a URL `/exec` copiada |
| `APPS_SCRIPT_SECRET` | exatamente o mesmo valor de `API_SECRET` |

Publique novamente o projeto para as variáveis entrarem em vigor.

O segredo é conferido no servidor a cada requisição e nunca sai para o navegador; o
site fala com o Apps Script pela função em `api/inscricoes.js`, não direto do browser.

## 5b. Os dois sites na Vercel

São **dois projetos** apontando para o mesmo repositório, a mesma planilha e o mesmo
Apps Script. O que os diferencia é uma variável.

| Projeto | Domínio | `EVENTO` |
|---|---|---|
| Seminário SABE EPT | `seminariosabeept.vercel.app` | `ept` |
| Seminário SABE EJA | `seminariosabeeja.vercel.app` | `eja` |

Em cada projeto, *Add New → Project → Import* do repositório `everton-enova/resultado-sabe`,
branch `main`, Framework **Other**, Build Command `npm run build`, Output Directory `dist`.

Em *Settings → Environment Variables*, os três valores:

| Variável | EPT | EJA |
|---|---|---|
| `EVENTO` | `ept` | `eja` |
| `APPS_SCRIPT_URL` | a mesma URL `/exec` | a mesma URL `/exec` |
| `APPS_SCRIPT_SECRET` | o mesmo segredo | o mesmo segredo |

`EVENTO` é lido durante a build e gravado na página: o `<html>` sai com `data-evento` e
`data-theme` já corretos, então o visitante nunca vê a cor do outro evento piscando antes
do JavaScript rodar. Título, sigla, subtítulo e rodapé também são gravados aí.

**Defina `EVENTO` antes do primeiro deploy.** Na Vercel, a build falha de propósito se a
variável estiver ausente (`EVENTO ausente`) ou com valor desconhecido (`EVENTO invalido`).
É melhor o deploy parar do que publicar o site do EPT no domínio do EJA sem ninguém notar.
Fora da Vercel, rodando na sua máquina, o padrão é `ept`.

Em *Settings → Domains*, defina o domínio de cada projeto. O `.vercel.app` sai do nome do
projeto, então nomeie os projetos como os domínios acima.

As inscrições dos dois caem na mesma aba `Inscricoes`, cada uma com seu `Evento`, e o
painel continua separando EJA e EPT. A regra de CPF único é por evento: a mesma pessoa
pode se inscrever nos dois, usando um site de cada vez.

## 6. Abrir as inscrições

Na aba `Eventos`, preencha `Abertura` no mesmo formato de `Encerramento`
(`AAAA-MM-DDTHH:mm:ss-03:00`) e troque `Status` de `RASCUNHO` para `ABERTO`.
Mantenha as duas colunas como **texto simples**.

Enquanto `Abertura` estiver vazia ou o `Status` não for `ABERTO`, o site mostra o
formulário mas bloqueia o envio — de propósito, para dar para conferir tudo antes.

## 7. Conferir

1. Abra **cada um dos dois sites**: o aviso de indisponibilidade deve sumir e o contador aparecer.
2. Faça uma inscrição de teste.
3. A linha deve aparecer na aba `Inscricoes` com `Evento` preenchido — `EPT` ou `EJA`, conforme o site usado.
4. O painel da aba `Vagas` deve somar 1 em `Inscritos` e descontar 1 em `Disponíveis`,
   na linha da função escolhida e na linha `TOTAL`.
5. Apague a linha de teste e rode **Atualizar painel de vagas** para zerar.

Se o site continuar dizendo que as inscrições estão em preparação, o problema está entre
a Vercel e o Apps Script: confira se a URL termina em `/exec`, se o segredo é idêntico
dos dois lados e se a implantação está como *Qualquer pessoa*.
