# Verificação da primeira versão

- 18 testes locais aprovados: regras de CPF, inscrição em ambos os eventos, duplicidade no mesmo evento, limite total de 250, cotas compartilhadas, município, NTE, prazos, configurações inválidas, reenvio e proteção da API.
- Os testes da camada Apps Script simulam os serviços Google e verificam releitura/gravação dentro do bloqueio, liberação em erro, texto literal nas células e recuperação de protocolo. Não substituem o teste de integração real após implantação.
- Sintaxe dos arquivos JavaScript/Apps Script verificada e saída do site gerada.
- Prévia aberta no navegador: página inicial e formulários EPT em 07/10/2026 e EJA em 08/10/2026 conferidos, incluindo troca de evento, seleção municipal e funções de NTE. Em largura móvel de 390 px, o formulário mediu 327 px, sem largura excedente do documento.
- Imagem de fundo e assinatura institucional locais conferidas; cores, tipografia e divisão dos painéis preservam a referência.
- Sem a integração configurada, os formulários permanecem exploráveis e o envio fica desabilitado. Nenhuma inscrição real foi enviada.

Pendente de ambiente: publicação Vercel, Apps Script executando na conta final, gravação e leitura reais da nova planilha e concorrência entre requisições reais. Testar com dados fictícios em uma planilha de homologação antes da abertura.
