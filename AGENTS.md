# Instruções para agentes de código

## Commit e push

**Sempre** faça commit e push das alterações ao final de cada tarefa. Não espere o usuário pedir.

- Use mensagens de commit claras e descritivas em português
- Faça push para o branch principal (main) ao final do trabalho
- Se houver alterações não commitadas, faça commit antes de finalizar

## Convenções do projeto

- Código e mensagens em português (Brasil)
- Testes: `npm test`
- Build: `npm run build` (gera o diretório `dist/`)
- O site é dividido em dois eventos: EPT e EJA
- A planilha Google é a fonte da verdade para configurações (Eventos, Funções, Municípios)
- O Supabase é o banco de dados que alimenta o site
- O Apps Script sincroniza a planilha com o Supabase
