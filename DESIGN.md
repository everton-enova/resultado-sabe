# Referência visual e decisões

Fonte principal: `index.html`, `background.webp` e `brasao_estado.png` do repositório indicado pelo usuário. A solicitação expressa é preservar a mesma proposta visual para EPT e EJA; não há exploração de nova identidade.

| Decisão | Fonte | Aplicação |
|---|---|---|
| Painel azul com fotografia e formulário branco | CSS original | Mantido no desktop; painéis empilhados abaixo de 900 px |
| Inter, azul #1a3a8a, vermelho #d42b2b, raio de 8 px | Tokens originais | Azul para títulos/rótulos e vermelho para ação principal |
| Fotografia e assinatura institucional | Arquivos do repositório | Recursos locais, sem URL temporária de imagem |
| Escolha EPT/EJA antes do formulário | Pedido do usuário | Dois botões com sigla, data e estado da inscrição |
| Contador regressivo até o prazo | Pedido do usuário | Os dois eventos até 05/10, 23:59: contador na tela de escolha e acima do formulário, prazo no cartão, dígitos em vermelho nas últimas 24 h |
| Página inicial em tons de preto | Pedido do usuário | Estado sem `data-theme`: painel grafite e fotografia dessaturada por `background-blend-mode:saturation` |
| Cor por evento: EPT azul, EJA vermelho | Pedido do usuário | Tokens trocados por `data-theme` no `<html>`: painel esquerdo, títulos, rótulos, avisos, foco e botão de ação |
| Tela de escolha: neutra com cor só nos cartões | Decorrência | Sobre o preto, cada cartão mostra a sigla e a seta na cor do seu evento, antecipando o tema |
| Campos condicionais de município e NTE | Formulário original | Mesma sequência, opções carregadas por evento |
| Setor com unidades: SGINF → DAI/DIE/DIROE | Pedido do usuário | Mesma mecânica dos campos condicionais: o setor é uma opção só e abre o campo de unidade |
| Monitoramento visual na planilha | Pedido do usuário | Aba própria com EJA e EPT lado a lado, nas cores do site, ocupação em porcentagem colorida; a aba Vagas do usuário recebe só Inscritos e Disponíveis |
| Cotas da aba Vagas da planilha base | Planilha do usuário | 250 por evento; SUPROT e SUPED diferem entre EJA e EPT; NTE com uma vaga por NTE em cada função, sem campo de município |
| Página 404 na identidade do site | Pedido do usuário | Painel preto com a fotografia dessaturada, botão para a inscrição e redirecionamento automático por `meta refresh` |
| Foco visível, rótulos e erros vinculados | Refero Design, craft-details | Navegação com teclado, erros por campo e anúncio de status |
| Vermelho de erro independente do tema | Acessibilidade | `--red` permanece fixo em campos inválidos, separado do vermelho do tema EJA |

O botão de troca de evento é uma pílula com contorno e cor do tema, não mais um link discreto.

Não preservar títulos/datas antigas do SABE 2025, prazos antigos ou cotas presumidas. Manter a identidade institucional do exemplo e a distinção entre os dois eventos. As opções locais são apenas prévia quando a API está indisponível, com envio bloqueado.
