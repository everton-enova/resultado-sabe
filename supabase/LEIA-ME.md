# Supabase — instalação

O site lê as vagas do Supabase (rápido) e cada inscrição é gravada lá antes de aparecer
na planilha. A planilha continua sendo onde a equipe edita Eventos/Vagas.

## 1. Criar a estrutura

No painel do Supabase, abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql`
e execute. Ele cria as tabelas, as funções e as permissões. Pode rodar de novo sem medo.

## 2. Proteger a sincronização

Gere/leia o `API_SECRET` da planilha (menu **Inscrições EPT / EJA → Configurar Supabase**,
ou a função `mostrarSegredo`) e grave o mesmo valor no Supabase:

```sql
update app_config set valor = 'COLE_AQUI_O_API_SECRET' where chave = 'sync_secret';
```

## 3. Variáveis na Vercel

No projeto do EPT e no do EJA (Production e Preview):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://SEU_PROJETO.supabase.co` |
| `SUPABASE_ANON_KEY` | a **publishable key** (Settings → API) |
| `APPS_SCRIPT_URL` | URL `/exec` da implantação (já existia) |
| `APPS_SCRIPT_SECRET` | o mesmo `API_SECRET` (já existia) |
| `EVENTO` | `ept` ou `eja`, por projeto (já existia) |

## 4. Apps Script

1. Cole o arquivo `apps-script/Supabase.gs` no projeto (junto com os demais).
2. Execute `configurarSupabase` uma vez (grava as propriedades).
3. Execute `sincronizarSupabase` uma vez para levar a planilha atual ao Supabase.
4. Execute `criarGatilhosSupabase` para ativar:
   - **onChange** — ao editar a planilha, as vagas vão para o Supabase em segundos;
   - **1 minuto** — rede de segurança e envio das inscrições pendentes.

## Como o fluxo funciona (dois sentidos)

```
Vagas/Eventos:   Planilha ──onChange / 1 min──► Supabase
Inscrições:      Site (Supabase) ──anotação──► Planilha
                 Planilha ──1 min (casa pelo protocolo)──► Supabase
```

- O visitante nunca espera o Apps Script para ter a inscrição confirmada.
- Se a anotação na planilha falhar, o gatilho de 1 minuto busca as pendentes e completa.
- Linhas **criadas à mão** na aba Inscricoes sobem para o Supabase; ajustes de
  **nome/telefone/e-mail/status** também.
- **Apagar a linha cancela a inscrição.** A sincronização manda ao banco os protocolos que a aba
  tem, e o que não está mais lá sai da contagem de vagas (vira `REMOVIDA`, sem destruir o
  histórico). Não é preciso acumular linhas `CANCELADA` na planilha.
- O CPF não é alterado pelo sync da planilha, para não furar a trava de duplicidade.

### Antes de confiar na exclusão: a aba precisa espelhar o banco

A exclusão vale pela **ausência** da linha. Se a aba estiver incompleta, as inscrições que
faltam nela parecem apagadas. Três travas impedem o estrago:

1. **Aba vazia não remove nada.** Renomeada, ilegível ou recém-limpa nunca vira exclusão geral.
2. **Só conta o que já foi escrito na aba.** Uma inscrição feita há segundos, ainda a caminho da
   planilha, não é removida por estar ausente.
3. **Teto de 25 por ciclo.** Acima disso nada é tocado e o número aparece no registro de execução.

Se o registro acusar o teto, **não** insista: rode **Recarregar inscricoes do Supabase**, confira
que a aba voltou a bater, e só então use **Remover inscricoes ausentes da aba**, que pergunta o
número antes de remover.

## Funções de menu

- **Importar inscricoes ja existentes** — uso único, leva a planilha atual ao Supabase.
- **Enviar inscricoes da planilha para o Supabase** — empurra a aba Inscricoes na hora.
- **Sincronizar Supabase agora** — faz os dois sentidos de uma vez.
- **Ativar sincronizacao com Supabase** — liga os gatilhos `onChange` e de 1 minuto.
- **Recarregar inscricoes do Supabase** — traz de volta para a aba as inscrições confirmadas que
  só existem no banco. Não duplica o que já está lá; cada rodada traz até 100.
- **Remover inscricoes ausentes da aba** — escape manual para quando a exclusão em massa é mesmo
  intencional. Mostra quantas serão removidas e espera confirmação.
