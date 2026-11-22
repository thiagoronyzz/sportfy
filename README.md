# Margix — Calculadora de margem para revendedores

Ferramenta de precificação para quem revende: calcula custo, desconto para o cliente,
**taxa da maquininha** (repassada ou não) e o lucro líquido real da venda.

Funciona como **PWA**: pode ser instalada no celular, abre em tela cheia e funciona offline.

## Funcionalidades

### Precificação em tempo real
- **Cálculo bidirecional**: preencha dois entre **Preço de tabela**, **% de desconto na compra**
  e **Preço de compra (custo)** e o terceiro é calculado automaticamente.
- Produto (opcional) e quantidade com seletor rápido.
- Atalhos de desconto de compra (15% a 40%).

### Desconto para o cliente
- Ajuste por **porcentagem** ou pelo **preço final por unidade**, com controle deslizante e atalhos.
- Indicador do **desconto máximo sem prejuízo** (ponto de equilíbrio).
- Alerta imediato quando a negociação gera prejuízo.

### Taxa da maquininha (novo)
- Formas de pagamento: **Pix/Dinheiro, Débito e Crédito**, com taxas médias de mercado já
  sugeridas — todas editáveis.
- **Parcelamento para o cliente**: escolha de 1x a 12x; a taxa estimada da maquininha cresce
  com o número de parcelas e o valor de cada parcela aparece na hora.
- Taxa percentual + taxa fixa da maquininha.
- Escolha **quem paga a taxa**: em “Cliente paga a taxa” o valor é embutido no total pago
  pelo cliente (cálculo por dentro), de modo que você recebe exatamente o valor combinado;
  em “Eu absorvo” a taxa sai do seu lucro.
- O acréscimo entra no **valor geral da compra** do cliente, no resumo do pedido e no
  orçamento copiado, incluindo o valor de cada parcela.

### Resultado da venda
- **Total para o cliente** em destaque, com subtotal, acréscimo da maquininha, valor líquido
  recebido e parcelamento.
- Lucro líquido, margem real, markup, custo total e economia do cliente.
- **Composição visual** do valor pago (custo, taxa e lucro).
- **Simulador de negociação** com cenários de desconto (0% a 30%) aplicáveis com um toque.
- Cópia do resumo para o cliente (sem exibir custo ou lucro).

### Pedido / orçamento
- Adicione vários produtos e veja o total do pedido, o lucro acumulado e a taxa incluída.
- Copie um orçamento limpo para enviar ao cliente.

## App no celular (PWA)
- `manifest.webmanifest` com ícones 192/512 + maskable e abertura em tela cheia.
- **Service worker** (`sw.js`) com cache do app shell: depois da primeira visita, abre offline.
- Botão **Instalar** no topo quando o navegador permitir; no iPhone, um guia explica
  “Adicionar à Tela de Início”.
- **Desktop preservado**: painel de entradas à esquerda e resultados à direita, sem mudanças.
- **Versão de celular (app)**: abas fixas **Calcular / Resultado / Pedido**, barra de resumo
  com o total do cliente e o lucro, atalhos em ícone no topo e botão **Instalar** visível.
  O mesmo conteúdo do desktop, dividido por aba e com alvos de toque maiores.
- Identidade visual original: fonte **Inter**, logo tipográfica **MARGIX** e paleta esmeralda.
- Tema claro/escuro, com preferência do sistema e persistência local.

## Como executar localmente

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Acesse `http://localhost:8000`. O service worker e a instalação exigem `https://`
ou `localhost`.

## Estrutura

```
index.html            interface
styles.css            design system e responsividade
app.js                cálculos, interações, parcelamento, instalação
manifest.webmanifest  configuração do PWA
sw.js                 service worker (offline)
icons/                ícones do app (SVG + PNGs)
```
