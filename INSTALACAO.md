# Ligar o formulário à planilha

Passo a passo para o site gravar inscrições na planilha e o painel se atualizar sozinho.
Ao final, cada inscrição aparece na aba `Inscricoes` e o painel da aba `Vagas` recalcula
`Inscritos` e `Disponíveis` na hora.

## 1. Criar o projeto Apps Script

Na planilha: **Extensões → Apps Script**. O projeto nasce vinculado a ela.

Crie três arquivos com o conteúdo do repositório, mantendo os nomes:

| Arquivo no Apps Script | Origem |
|---|---|
| `Code.gs` | `apps-script/Code.gs` |
| `Core.gs` | `apps-script/Core.js` |
| `Catalogo.gs` | `apps-script/Catalogo.gs` |

Em **Configurações do projeto**, marque *Mostrar o arquivo de manifesto* e substitua
`appsscript.json` pelo conteúdo de `apps-script/appsscript.json`. Ele fixa o fuso
`America/Bahia`, usado no carimbo de data e na comparação com o prazo.

## 2. Propriedades do script

Ainda em **Configurações do projeto → Propriedades do script**:

| Propriedade | Valor |
|---|---|
| `SPREADSHEET_ID` | o trecho entre `/d/` e `/edit` na URL da planilha |
| `API_SECRET` | um segredo aleatório de 32 caracteres ou mais |

Para gerar o segredo, rode no terminal `openssl rand -hex 24`. Guarde-o: o mesmo
valor vai para a Vercel no passo 5. Não reaproveite senha de outro sistema e não
comite esse valor no repositório.

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
de um minuto que recalcula o painel.

O painel também é recalculado imediatamente a cada inscrição confirmada, dentro do
mesmo bloqueio que grava a linha. O gatilho é rede de segurança, para o caso de uma
edição manual na planilha.

O script escreve **apenas** as colunas `Inscritos` e `Disponíveis` de cada bloco do seu
painel. Rótulo, limite, cores e mesclagens continuam seus. Ele localiza os blocos pelo
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

## 6. Abrir as inscrições

Na aba `Eventos`, preencha `Abertura` no mesmo formato de `Encerramento`
(`AAAA-MM-DDTHH:mm:ss-03:00`) e troque `Status` de `RASCUNHO` para `ABERTO`.
Mantenha as duas colunas como **texto simples**.

Enquanto `Abertura` estiver vazia ou o `Status` não for `ABERTO`, o site mostra o
formulário mas bloqueia o envio — de propósito, para dar para conferir tudo antes.

## 7. Conferir

1. Abra o site: o aviso de indisponibilidade deve sumir e o contador aparecer.
2. Faça uma inscrição de teste.
3. A linha deve aparecer na aba `Inscricoes` com `Evento` preenchido.
4. O painel da aba `Vagas` deve somar 1 em `Inscritos` e descontar 1 em `Disponíveis`,
   na linha da função escolhida e na linha `TOTAL`.
5. Apague a linha de teste e rode **Atualizar painel de vagas** para zerar.

Se o site continuar dizendo que as inscrições estão em preparação, o problema está entre
a Vercel e o Apps Script: confira se a URL termina em `/exec`, se o segredo é idêntico
dos dois lados e se a implantação está como *Qualquer pessoa*.
