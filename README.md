# MARGIX — Calculadora Comercial para Revendedores

Ferramenta web de precificação, cálculo de descontos e análise de margem líquida desenvolvida para revendedores.

## Funcionalidades

- **Cálculo Bidirecional Inteligente**: preencha quaisquer dois valores entre **Preço de Venda / Tabela**, **% de Desconto na Compra** e **Preço de Compra (Custo)** para calcular automaticamente o terceiro em tempo real.
- **Desconto para o Cliente**: informe a porcentagem de desconto concedida ao cliente (ou digite diretamente o preço final negociado em R$) e acompanhe instantaneamente o impacto no lucro líquido.
- **Visualização Financeira Clara**:
  - Cards executivos com **Valor a Cobrar do Cliente**, **Lucro Líquido Real**, **Custo Total** e **Economia do Cliente**.
  - **Barra de Composição do Preço** proporcional (Custo, Taxas, Lucro e Desconto).
  - Indicador automático do **Desconto Máximo sem Prejuízo (Ponto de Equilíbrio)** e alerta imediato caso o desconto gere prejuízo.
- **Simulador Rápido de Negociação**: tabela comparativa de cenários de desconto (0% a 30%) clicável.
- **Simulação de Pedido / Kit**: adicione múltiplos itens e copie o orçamento limpo para enviar ao cliente (sem exibir seus custos ou margem).

## Como executar localmente

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```
Acesse `http://localhost:8000` no navegador.
