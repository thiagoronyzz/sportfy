(function () {
  'use strict';

  const STORAGE_ORDER_KEY = 'margix_order_items_v1';
  const STORAGE_THEME_KEY = 'margix_theme_v1';

  // DOM Elements
  const els = {
    productName: document.getElementById('productName'),
    quantity: document.getElementById('quantity'),
    qtyMinus: document.getElementById('qtyMinus'),
    qtyPlus: document.getElementById('qtyPlus'),

    vendaBase: document.getElementById('vendaBase'),
    descCompra: document.getElementById('descCompra'),
    precoCompra: document.getElementById('precoCompra'),

    cardVendaBase: document.getElementById('cardVendaBase'),
    cardDescCompra: document.getElementById('cardDescCompra'),
    cardPrecoCompra: document.getElementById('cardPrecoCompra'),

    badgeVendaBase: document.getElementById('badgeVendaBase'),
    badgeDescCompra: document.getElementById('badgeDescCompra'),
    badgePrecoCompra: document.getElementById('badgePrecoCompra'),

    calcModeHint: document.getElementById('calcModeHint'),
    markupInfo: document.getElementById('markupInfo'),

    descCliente: document.getElementById('descCliente'),
    precoFinalCliente: document.getElementById('precoFinalCliente'),
    sliderDescCliente: document.getElementById('sliderDescCliente'),
    sliderBreakEvenMark: document.getElementById('sliderBreakEvenMark'),
    sliderMaxLabel: document.getElementById('sliderMaxLabel'),
    maxDiscountPill: document.getElementById('maxDiscountPill'),

    taxaExtraPct: document.getElementById('taxaExtraPct'),
    custoExtraFixo: document.getElementById('custoExtraFixo'),

    healthBadge: document.getElementById('healthBadge'),
    resultTitle: document.getElementById('resultTitle'),
    lossAlert: document.getElementById('lossAlert'),
    lossAlertText: document.getElementById('lossAlertText'),

    kpiClientPrice: document.getElementById('kpiClientPrice'),
    kpiClientSub: document.getElementById('kpiClientSub'),
    kpiProfitCard: document.getElementById('kpiProfitCard'),
    kpiNetProfit: document.getElementById('kpiNetProfit'),
    kpiProfitSub: document.getElementById('kpiProfitSub'),
    kpiTotalCost: document.getElementById('kpiTotalCost'),
    kpiCostSub: document.getElementById('kpiCostSub'),
    kpiClientSaving: document.getElementById('kpiClientSaving'),
    kpiSavingSub: document.getElementById('kpiSavingSub'),

    breakdownRefTotal: document.getElementById('breakdownRefTotal'),
    barCost: document.getElementById('barCost'),
    barFees: document.getElementById('barFees'),
    barProfit: document.getElementById('barProfit'),
    barDiscount: document.getElementById('barDiscount'),

    legCost: document.getElementById('legCost'),
    legFeesWrap: document.getElementById('legFeesWrap'),
    legFees: document.getElementById('legFees'),
    dotProfit: document.getElementById('dotProfit'),
    legProfitLabel: document.getElementById('legProfitLabel'),
    legProfit: document.getElementById('legProfit'),
    legDiscount: document.getElementById('legDiscount'),

    metricRoi: document.getElementById('metricRoi'),
    metricMargin: document.getElementById('metricMargin'),
    metricBreakEven: document.getElementById('metricBreakEven'),

    btnAddItem: document.getElementById('btnAddItem'),
    btnCopyClient: document.getElementById('btnCopyClient'),
    copyBtnText: document.getElementById('copyBtnText'),

    scenariosBody: document.getElementById('scenariosBody'),

    orderSection: document.getElementById('orderSection'),
    orderCount: document.getElementById('orderCount'),
    orderBody: document.getElementById('orderBody'),
    orderTotalQty: document.getElementById('orderTotalQty'),
    orderTotalCost: document.getElementById('orderTotalCost'),
    orderTotalSaved: document.getElementById('orderTotalSaved'),
    orderTotalRevenue: document.getElementById('orderTotalRevenue'),
    orderTotalProfit: document.getElementById('orderTotalProfit'),
    btnCopyOrderQuote: document.getElementById('btnCopyOrderQuote'),
    btnClearOrder: document.getElementById('btnClearOrder'),

    btnExample: document.getElementById('btnExample'),
    btnClear: document.getElementById('btnClear'),
    btnTheme: document.getElementById('btnTheme'),
    iconMoon: document.getElementById('iconMoon'),
    iconSun: document.getElementById('iconSun'),
    toast: document.getElementById('toast')
  };

  const BASE_FIELDS = ['vendaBase', 'descCompra', 'precoCompra'];

  // Tracks the last 2 user-edited fields among BASE_FIELDS
  let editHistory = [];
  let calculatedField = null;
  // Tracks whether client price was set via '%' or 'finalPrice'
  let clientEditMode = 'pct';
  let currentCalc = null;
  let orderItems = loadOrderItems();
  let toastTimer = null;

  // Formatters
  const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  function formatBRL(val) {
    if (!Number.isFinite(val)) return 'R$ 0,00';
    return brlFormatter.format(val);
  }

  function formatNumberInput(val, decimals = 2) {
    if (!Number.isFinite(val)) return '';
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatPct(val, decimals = 1) {
    if (!Number.isFinite(val)) return '0,0%';
    return (
      val.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + '%'
    );
  }

  function parseDecimal(raw) {
    if (raw === null || raw === undefined) return NaN;
    const str = String(raw).trim();
    if (!str) return NaN;
    // Support both "1.250,50" and "1250.50" or "89,90"
    let normalized = str.replace(/[^\d.,-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === ',') return NaN;

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    if (hasComma && hasDot) {
      // Assume last separator is the decimal separator
      if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = normalized.replace(/,/g, '');
      }
    } else if (hasComma) {
      normalized = normalized.replace(',', '.');
    }
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : NaN;
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2600);
  }

  // Record user edit on one of the 3 base fields
  function onBaseFieldEdit(fieldKey) {
    const val = parseDecimal(els[fieldKey].value);
    const isValid =
      fieldKey === 'descCompra'
        ? Number.isFinite(val) && val < 100
        : Number.isFinite(val) && val > 0;

    // If user starts typing in the field that was previously auto-calculated, it becomes manual
    if (calculatedField && calculatedField !== fieldKey && !isValid) {
      // Clear previously calculated value if fewer than 2 valid inputs remain
      els[calculatedField].value = '';
      calculatedField = null;
    }

    editHistory = editHistory.filter((k) => k !== fieldKey);
    if (isValid) {
      editHistory.push(fieldKey);
      if (editHistory.length > 2) {
        editHistory = editHistory.slice(-2);
      }
    } else if (calculatedField && calculatedField !== fieldKey) {
      els[calculatedField].value = '';
      calculatedField = null;
    }

    updateBuyDiscountChips();
    recalculate();
  }

  function resolveBaseValues() {
    // Prune any invalid fields from editHistory
    editHistory = editHistory.filter((k) => {
      const v = parseDecimal(els[k].value);
      return k === 'descCompra' ? Number.isFinite(v) && v < 100 : Number.isFinite(v) && v > 0;
    });

    // Reset badges
    BASE_FIELDS.forEach((k) => {
      const cap = k.charAt(0).toUpperCase() + k.slice(1);
      els['card' + cap].classList.remove('is-calculated');
      els['badge' + cap].hidden = true;
    });

    if (editHistory.length < 2) {
      if (calculatedField && !editHistory.includes(calculatedField)) {
        els[calculatedField].value = '';
      }
      calculatedField = null;
      els.calcModeHint.textContent =
        editHistory.length === 0 ? 'Preencha 2 campos base' : 'Falta 1 campo base';
      return null;
    }

    // Determine target field to compute
    const target = BASE_FIELDS.find((k) => !editHistory.includes(k));
    calculatedField = target;

    let vendaBase = parseDecimal(els.vendaBase.value);
    let descCompra = parseDecimal(els.descCompra.value);
    let precoCompra = parseDecimal(els.precoCompra.value);

    if (target === 'precoCompra') {
      precoCompra = vendaBase * (1 - descCompra / 100);
      if (precoCompra < 0) precoCompra = 0;
      els.precoCompra.value = formatNumberInput(precoCompra, 2);
      els.calcModeHint.textContent = 'Custo calculado';
    } else if (target === 'vendaBase') {
      const factor = 1 - descCompra / 100;
      if (factor <= 0) return null;
      vendaBase = precoCompra / factor;
      els.vendaBase.value = formatNumberInput(vendaBase, 2);
      els.calcModeHint.textContent = 'Preço de venda calculado';
    } else if (target === 'descCompra') {
      descCompra = ((vendaBase - precoCompra) / vendaBase) * 100;
      els.descCompra.value = formatNumberInput(descCompra, 1);
      els.calcModeHint.textContent = '% de compra calculado';
    }

    const capTarget = target.charAt(0).toUpperCase() + target.slice(1);
    els['card' + capTarget].classList.add('is-calculated');
    els['badge' + capTarget].hidden = false;

    updateBuyDiscountChips();

    return { vendaBase, descCompra, precoCompra };
  }

  function updateBuyDiscountChips() {
    const val = parseDecimal(els.descCompra.value);
    document.querySelectorAll('[data-buy-disc]').forEach((btn) => {
      const chipVal = parseFloat(btn.getAttribute('data-buy-disc'));
      btn.classList.toggle('active', Number.isFinite(val) && Math.abs(val - chipVal) < 0.05);
    });
  }

  function updateClientDiscountChips(descPct) {
    document.querySelectorAll('[data-client-disc]').forEach((btn) => {
      const chipVal = parseFloat(btn.getAttribute('data-client-disc'));
      btn.classList.toggle('active', Number.isFinite(descPct) && Math.abs(descPct - chipVal) < 0.05);
    });
  }

  function recalculate() {
    const base = resolveBaseValues();
    const qty = Math.max(1, parseInt(els.quantity.value, 10) || 1);
    const prodName = els.productName.value.trim();

    els.resultTitle.textContent = prodName
      ? `${prodName}${qty > 1 ? ` (${qty} un.)` : ''}`
      : qty > 1
        ? `Análise Financeira (${qty} unidades)`
        : 'Análise Financeira';

    if (!base || base.vendaBase <= 0) {
      currentCalc = null;
      renderEmptyState();
      return;
    }

    const { vendaBase, descCompra, precoCompra } = base;

    // Markup on base selling price
    if (precoCompra > 0) {
      const baseMarkup = ((vendaBase - precoCompra) / precoCompra) * 100;
      els.markupInfo.textContent = `Custo unitário • Markup de tabela: ${baseMarkup >= 0 ? '+' : ''}${formatPct(baseMarkup, 1)}`;
    } else {
      els.markupInfo.textContent = 'Valor unitário pago ao fornecedor / marca';
    }

    // Extra fees
    const taxaPctRaw = parseDecimal(els.taxaExtraPct.value);
    const taxaPct = Number.isFinite(taxaPctRaw) && taxaPctRaw > 0 ? Math.min(taxaPctRaw, 99) : 0;
    const fixoRaw = parseDecimal(els.custoExtraFixo.value);
    const custoFixoUnit = Number.isFinite(fixoRaw) && fixoRaw > 0 ? fixoRaw : 0;

    // Break-even unit selling price:
    // precoMin * (1 - taxaPct/100) = precoCompra + custoFixoUnit
    const netFactor = 1 - taxaPct / 100;
    const breakEvenUnit = netFactor > 0 ? (precoCompra + custoFixoUnit) / netFactor : vendaBase;
    const maxDiscountPct = Math.max(0, ((vendaBase - breakEvenUnit) / vendaBase) * 100);

    // Update slider dynamic max so user can test around break-even comfortably
    const sliderMax = Math.max(50, Math.ceil((maxDiscountPct + 10) / 5) * 5);
    els.sliderDescCliente.max = String(Math.min(95, sliderMax));
    els.sliderMaxLabel.textContent = `${els.sliderDescCliente.max}%`;
    els.sliderBreakEvenMark.textContent = `Máx. s/ prejuízo: ${formatPct(maxDiscountPct, 1)}`;
    els.maxDiscountPill.textContent = `Limite s/ prejuízo: ${formatPct(maxDiscountPct, 1)}`;

    // Sync client discount % <-> final unit price
    let descClientePct = 0;
    let precoFinalUnit = vendaBase;

    if (clientEditMode === 'finalPrice') {
      const typedFinal = parseDecimal(els.precoFinalCliente.value);
      if (Number.isFinite(typedFinal) && typedFinal >= 0) {
        precoFinalUnit = typedFinal;
        descClientePct = ((vendaBase - precoFinalUnit) / vendaBase) * 100;
      } else {
        precoFinalUnit = vendaBase;
        descClientePct = 0;
      }
      els.descCliente.value = formatNumberInput(descClientePct, 1);
    } else {
      const typedPct = parseDecimal(els.descCliente.value);
      descClientePct = Number.isFinite(typedPct) ? Math.min(100, typedPct) : 0;
      precoFinalUnit = vendaBase * (1 - descClientePct / 100);
      if (precoFinalUnit < 0) precoFinalUnit = 0;
      els.precoFinalCliente.value = formatNumberInput(precoFinalUnit, 2);
    }

    els.sliderDescCliente.value = String(Math.max(0, Math.min(parseFloat(els.sliderDescCliente.max), descClientePct)));
    updateClientDiscountChips(descClientePct);

    // Per-unit & total financial breakdown
    const feeVarUnit = precoFinalUnit * (taxaPct / 100);
    const totalFeesUnit = feeVarUnit + custoFixoUnit;
    const netProfitUnit = precoFinalUnit - precoCompra - totalFeesUnit;
    const clientSavingUnit = Math.max(0, vendaBase - precoFinalUnit);

    const totalCatalog = vendaBase * qty;
    const totalClientPrice = precoFinalUnit * qty;
    const totalPurchaseCost = precoCompra * qty;
    const totalFees = totalFeesUnit * qty;
    const totalNetProfit = netProfitUnit * qty;
    const totalClientSaving = clientSavingUnit * qty;

    const realMarginPct = precoFinalUnit > 0 ? (netProfitUnit / precoFinalUnit) * 100 : 0;
    const totalOutlayUnit = precoCompra + totalFeesUnit;
    const roiPct = totalOutlayUnit > 0 ? (netProfitUnit / totalOutlayUnit) * 100 : 0;

    currentCalc = {
      productName: prodName || 'Produto sem nome',
      qty,
      vendaBase,
      descCompra,
      precoCompra,
      descClientePct,
      precoFinalUnit,
      totalCatalog,
      totalClientPrice,
      totalPurchaseCost,
      totalFees,
      totalNetProfit,
      totalClientSaving,
      realMarginPct,
      roiPct,
      maxDiscountPct,
      breakEvenUnit,
      taxaPct,
      custoFixoUnit
    };

    renderDashboard(currentCalc);
    renderScenariosTable(currentCalc);
  }

  function renderEmptyState() {
    els.healthBadge.className = 'health-badge health-neutral';
    els.healthBadge.textContent = 'Aguardando valores';
    els.lossAlert.hidden = true;
    els.kpiProfitCard.classList.remove('is-loss');

    els.kpiClientPrice.textContent = 'R$ 0,00';
    els.kpiClientSub.textContent = 'Tabela: R$ 0,00';
    els.kpiNetProfit.textContent = 'R$ 0,00';
    els.kpiProfitSub.textContent = 'Margem real: 0,0%';
    els.kpiTotalCost.textContent = 'R$ 0,00';
    els.kpiCostSub.textContent = 'Desconto compra: 0,0%';
    els.kpiClientSaving.textContent = 'R$ 0,00';
    els.kpiSavingSub.textContent = '0,0% de desconto';

    els.breakdownRefTotal.textContent = 'Referência: R$ 0,00';
    els.barCost.style.width = '50%';
    els.barFees.style.width = '0%';
    els.barProfit.style.width = '50%';
    els.barProfit.classList.remove('is-loss');
    els.barDiscount.style.width = '0%';

    els.legCost.textContent = 'R$ 0,00 (0%)';
    els.legFeesWrap.hidden = true;
    els.legProfitLabel.textContent = 'Seu Lucro Líquido';
    els.dotProfit.classList.remove('is-loss');
    els.legProfit.textContent = 'R$ 0,00 (0%)';
    els.legDiscount.textContent = 'R$ 0,00 (0%)';

    els.metricRoi.textContent = '0,0%';
    els.metricMargin.textContent = '0,0%';
    els.metricBreakEven.textContent = '0,0% (R$ 0,00)';
    els.maxDiscountPill.textContent = 'Limite s/ prejuízo: —';

    els.btnAddItem.disabled = true;
    els.btnCopyClient.disabled = true;

    els.scenariosBody.innerHTML =
      '<tr><td colspan="5" class="empty-table-cell">Preencha os valores base para visualizar os cenários de desconto.</td></tr>';
  }

  function renderDashboard(c) {
    const isLoss = c.totalNetProfit < -0.005;
    const isLowMargin = !isLoss && c.realMarginPct < 10;

    // Health badge & alert
    if (isLoss) {
      els.healthBadge.className = 'health-badge health-loss';
      els.healthBadge.textContent = 'Prejuízo na Operação';
      els.lossAlert.hidden = false;
      els.lossAlertText.textContent = `Atenção: com ${formatPct(c.descClientePct, 1)} de desconto, você perde ${formatBRL(Math.abs(c.totalNetProfit))}. O preço mínimo sem prejuízo é ${formatBRL(c.breakEvenUnit)}/un (${formatPct(c.maxDiscountPct, 1)} máx.).`;
      els.kpiProfitCard.classList.add('is-loss');
    } else if (isLowMargin) {
      els.healthBadge.className = 'health-badge health-warn';
      els.healthBadge.textContent = 'Margem Apertada';
      els.lossAlert.hidden = true;
      els.kpiProfitCard.classList.remove('is-loss');
    } else {
      els.healthBadge.className = 'health-badge health-good';
      els.healthBadge.textContent = 'Lucro Saudável';
      els.lossAlert.hidden = true;
      els.kpiProfitCard.classList.remove('is-loss');
    }

    // KPI Cards
    els.kpiClientPrice.textContent = formatBRL(c.totalClientPrice);
    els.kpiClientSub.textContent =
      c.qty > 1
        ? `${formatBRL(c.precoFinalUnit)}/un • Tabela: ${formatBRL(c.totalCatalog)}`
        : `Preço de tabela: ${formatBRL(c.vendaBase)}`;

    els.kpiNetProfit.textContent =
      (isLoss ? '− ' : '') + formatBRL(Math.abs(c.totalNetProfit));
    els.kpiProfitSub.textContent =
      c.qty > 1
        ? `${formatBRL(c.totalNetProfit / c.qty)}/un • Margem: ${formatPct(c.realMarginPct, 1)}`
        : `Margem líquida real: ${formatPct(c.realMarginPct, 1)}`;

    els.kpiTotalCost.textContent = formatBRL(c.totalPurchaseCost + c.totalFees);
    els.kpiCostSub.textContent =
      c.totalFees > 0
        ? `Compra ${formatBRL(c.totalPurchaseCost)} + Taxas ${formatBRL(c.totalFees)}`
        : `Desc. na compra: ${formatPct(c.descCompra, 1)}`;

    els.kpiClientSaving.textContent = formatBRL(c.totalClientSaving);
    els.kpiSavingSub.textContent =
      c.descClientePct >= 0
        ? `${formatPct(c.descClientePct, 1)} de desconto aplicado`
        : `Acima da tabela (+${formatPct(Math.abs(c.descClientePct), 1)})`;

    // Visual Stacked Composition Bar
    const refBase = Math.max(c.totalCatalog, c.totalClientPrice, c.totalPurchaseCost + c.totalFees);
    els.breakdownRefTotal.textContent = `Referência: ${formatBRL(refBase)}`;

    let costPct = 0;
    let feesPct = 0;
    let profitPct = 0;
    let discPct = 0;

    if (refBase > 0) {
      if (!isLoss) {
        costPct = (c.totalPurchaseCost / refBase) * 100;
        feesPct = (c.totalFees / refBase) * 100;
        profitPct = Math.max(0, (c.totalNetProfit / refBase) * 100);
        discPct = Math.max(0, (c.totalClientSaving / refBase) * 100);
      } else {
        // In loss scenario, show revenue vs deficit vs discount clearly
        const totalOut = c.totalPurchaseCost + c.totalFees + c.totalClientSaving;
        costPct = (c.totalPurchaseCost / totalOut) * 100;
        feesPct = (c.totalFees / totalOut) * 100;
        profitPct = (Math.abs(c.totalNetProfit) / totalOut) * 100;
        discPct = Math.max(0, (c.totalClientSaving / totalOut) * 100);
      }
    }

    els.barCost.style.width = `${costPct.toFixed(2)}%`;
    els.barFees.style.width = `${feesPct.toFixed(2)}%`;
    els.barProfit.style.width = `${profitPct.toFixed(2)}%`;
    els.barDiscount.style.width = `${discPct.toFixed(2)}%`;

    els.barProfit.classList.toggle('is-loss', isLoss);
    els.dotProfit.classList.toggle('is-loss', isLoss);

    els.legCost.textContent = `${formatBRL(c.totalPurchaseCost)} (${formatPct((c.totalPurchaseCost / refBase) * 100, 0)})`;

    if (c.totalFees > 0) {
      els.legFeesWrap.hidden = false;
      els.legFees.textContent = `${formatBRL(c.totalFees)} (${formatPct((c.totalFees / refBase) * 100, 0)})`;
    } else {
      els.legFeesWrap.hidden = true;
    }

    els.legProfitLabel.textContent = isLoss ? 'Prejuízo na Venda' : 'Seu Lucro Líquido';
    els.legProfit.textContent = `${isLoss ? '−' : ''}${formatBRL(Math.abs(c.totalNetProfit))} (${formatPct((Math.abs(c.totalNetProfit) / refBase) * 100, 0)})`;
    els.legDiscount.textContent = `${formatBRL(c.totalClientSaving)} (${formatPct(Math.max(0, c.descClientePct), 1)})`;

    // Detailed metrics
    els.metricRoi.textContent = `${c.roiPct >= 0 ? '+' : ''}${formatPct(c.roiPct, 1)}`;
    els.metricMargin.textContent = formatPct(c.realMarginPct, 1);
    els.metricBreakEven.textContent = `${formatPct(c.maxDiscountPct, 1)} (${formatBRL(c.breakEvenUnit)})`;

    els.btnAddItem.disabled = false;
    els.btnCopyClient.disabled = false;
  }

  function renderScenariosTable(c) {
    // Generate intelligent discount steps: 0%, 5%, 10%, 15%, 20%, 25%, plus exact break-even if distinct
    const steps = [0, 5, 10, 15, 20, 25, 30];
    const rowsHtml = steps
      .map((pct) => {
        const unitPrice = c.vendaBase * (1 - pct / 100);
        const totalPrice = unitPrice * c.qty;
        const totalSaved = Math.max(0, c.vendaBase - unitPrice) * c.qty;
        const fees = (unitPrice * (c.taxaPct / 100) + c.custoFixoUnit) * c.qty;
        const profit = totalPrice - c.totalPurchaseCost - fees;
        const margin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;
        const isActive = Math.abs(c.descClientePct - pct) < 0.25;
        const isLossRow = profit < -0.005;

        return `
          <tr data-scenario-pct="${pct}" class="${isActive ? 'active-row' : ''} ${isLossRow ? 'loss-row' : ''}">
            <td><strong>${pct}%</strong></td>
            <td>${formatBRL(totalPrice)}</td>
            <td>${pct === 0 ? '—' : formatBRL(totalSaved)}</td>
            <td class="col-profit">${isLossRow ? '− ' : ''}${formatBRL(Math.abs(profit))}</td>
            <td>${formatPct(margin, 1)}</td>
          </tr>
        `;
      })
      .join('');

    els.scenariosBody.innerHTML = rowsHtml;
  }

  // ORDER LIST MANAGEMENT
  function loadOrderItems() {
    try {
      const raw = localStorage.getItem(STORAGE_ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveOrderItems() {
    try {
      localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(orderItems));
    } catch (_) {}
  }

  function renderOrderSection() {
    if (orderItems.length === 0) {
      els.orderSection.hidden = true;
      return;
    }

    els.orderSection.hidden = false;
    els.orderCount.textContent = String(orderItems.length);

    let sumQty = 0;
    let sumCost = 0;
    let sumSaved = 0;
    let sumRevenue = 0;
    let sumProfit = 0;

    els.orderBody.innerHTML = orderItems
      .map((item, idx) => {
        sumQty += item.qty;
        sumCost += item.totalCost;
        sumSaved += item.totalSaved;
        sumRevenue += item.totalRevenue;
        sumProfit += item.totalProfit;

        const lossClass = item.totalProfit < 0 ? 'style="color: var(--danger); font-weight:700;"' : 'class="col-profit"';

        return `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${item.qty}</td>
            <td>${formatBRL(item.totalCost)}</td>
            <td>${item.descClientePct > 0 ? `${formatPct(item.descClientePct, 1)} (${formatBRL(item.totalSaved)})` : 'Sem desc.'}</td>
            <td class="highlight-client">${formatBRL(item.totalRevenue)}</td>
            <td ${lossClass}>${item.totalProfit < 0 ? '− ' : ''}${formatBRL(Math.abs(item.totalProfit))}</td>
            <td>
              <button type="button" class="btn-remove-row" data-remove-idx="${idx}" title="Remover item" aria-label="Remover item">✕</button>
            </td>
          </tr>
        `;
      })
      .join('');

    els.orderTotalQty.textContent = String(sumQty);
    els.orderTotalCost.textContent = formatBRL(sumCost);
    els.orderTotalSaved.textContent = formatBRL(sumSaved);
    els.orderTotalRevenue.textContent = formatBRL(sumRevenue);
    els.orderTotalProfit.textContent =
      (sumProfit < 0 ? '− ' : '') + formatBRL(Math.abs(sumProfit));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function copyText(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(successMsg),
        () => fallbackCopy(text, successMsg)
      );
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg);
    } catch (_) {}
    document.body.removeChild(ta);
  }

  // Load practical example
  function loadExample() {
    els.productName.value = 'Kit Hidratante + Body Splash';
    els.quantity.value = '1';
    els.vendaBase.value = '150,00';
    els.descCompra.value = '30';
    els.precoCompra.value = '';
    els.descCliente.value = '10';
    els.taxaExtraPct.value = '';
    els.custoExtraFixo.value = '';

    editHistory = ['vendaBase', 'descCompra'];
    calculatedField = null;
    clientEditMode = 'pct';
    recalculate();
  }

  function clearAll() {
    els.productName.value = '';
    els.quantity.value = '1';
    els.vendaBase.value = '';
    els.descCompra.value = '';
    els.precoCompra.value = '';
    els.descCliente.value = '0';
    els.precoFinalCliente.value = '';
    els.sliderDescCliente.value = '0';
    els.taxaExtraPct.value = '';
    els.custoExtraFixo.value = '';

    editHistory = [];
    calculatedField = null;
    clientEditMode = 'pct';
    updateBuyDiscountChips();
    updateClientDiscountChips(0);
    recalculate();
    els.vendaBase.focus();
  }

  // Theme management
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      els.iconMoon.hidden = true;
      els.iconSun.hidden = false;
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_THEME_KEY, 'light');
      els.iconMoon.hidden = false;
      els.iconSun.hidden = true;
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
      els.iconMoon.hidden = true;
      els.iconSun.hidden = false;
    }
  }

  // Event Listeners
  BASE_FIELDS.forEach((fieldKey) => {
    els[fieldKey].addEventListener('input', () => onBaseFieldEdit(fieldKey));
  });

  // Buy discount quick chips
  document.querySelectorAll('[data-buy-disc]').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.descCompra.value = btn.getAttribute('data-buy-disc');
      onBaseFieldEdit('descCompra');
    });
  });

  // Client discount % input
  els.descCliente.addEventListener('input', () => {
    clientEditMode = 'pct';
    recalculate();
  });

  // Client final price R$ input
  els.precoFinalCliente.addEventListener('input', () => {
    clientEditMode = 'finalPrice';
    recalculate();
  });

  // Slider
  els.sliderDescCliente.addEventListener('input', () => {
    clientEditMode = 'pct';
    const v = parseFloat(els.sliderDescCliente.value);
    els.descCliente.value = Number.isInteger(v) ? String(v) : formatNumberInput(v, 1);
    recalculate();
  });

  // Client discount chips
  document.querySelectorAll('[data-client-disc]').forEach((btn) => {
    btn.addEventListener('click', () => {
      clientEditMode = 'pct';
      els.descCliente.value = btn.getAttribute('data-client-disc');
      recalculate();
    });
  });

  // Product & Qty & Extra costs
  els.productName.addEventListener('input', recalculate);
  els.quantity.addEventListener('input', recalculate);
  els.taxaExtraPct.addEventListener('input', recalculate);
  els.custoExtraFixo.addEventListener('input', recalculate);

  els.qtyMinus.addEventListener('click', () => {
    const cur = parseInt(els.quantity.value, 10) || 1;
    if (cur > 1) {
      els.quantity.value = String(cur - 1);
      recalculate();
    }
  });

  els.qtyPlus.addEventListener('click', () => {
    const cur = parseInt(els.quantity.value, 10) || 1;
    els.quantity.value = String(cur + 1);
    recalculate();
  });

  // Click row in negotiation table to apply discount
  els.scenariosBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-scenario-pct]');
    if (!row) return;
    clientEditMode = 'pct';
    els.descCliente.value = row.getAttribute('data-scenario-pct');
    recalculate();
  });

  // Add item to order simulator
  els.btnAddItem.addEventListener('click', () => {
    if (!currentCalc) return;
    const itemName = els.productName.value.trim() || `Item #${orderItems.length + 1}`;
    orderItems.push({
      name: itemName,
      qty: currentCalc.qty,
      descClientePct: currentCalc.descClientePct,
      totalCost: currentCalc.totalPurchaseCost + currentCalc.totalFees,
      totalSaved: currentCalc.totalClientSaving,
      totalRevenue: currentCalc.totalClientPrice,
      totalProfit: currentCalc.totalNetProfit
    });
    saveOrderItems();
    renderOrderSection();
    showToast(`"${itemName}" adicionado à simulação de pedido.`);
  });

  // Copy client quote (only client-safe info, never reseller cost/profit!)
  els.btnCopyClient.addEventListener('click', () => {
    if (!currentCalc) return;
    const c = currentCalc;
    const lines = [];
    if (els.productName.value.trim()) {
      lines.push(`Produto: ${els.productName.value.trim()}${c.qty > 1 ? ` (${c.qty} un.)` : ''}`);
    } else if (c.qty > 1) {
      lines.push(`Quantidade: ${c.qty} unidades`);
    }
    if (c.descClientePct > 0.04) {
      lines.push(`Valor de tabela: ${formatBRL(c.totalCatalog)}`);
      lines.push(`Desconto especial (${formatPct(c.descClientePct, 1)}): -${formatBRL(c.totalClientSaving)}`);
    }
    lines.push(`Valor final: ${formatBRL(c.totalClientPrice)}`);
    copyText(lines.join('\n'), 'Resumo para o cliente copiado!');
  });

  // Order table actions
  els.orderBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-idx]');
    if (!btn) return;
    const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
    if (idx >= 0 && idx < orderItems.length) {
      orderItems.splice(idx, 1);
      saveOrderItems();
      renderOrderSection();
    }
  });

  els.btnClearOrder.addEventListener('click', () => {
    orderItems = [];
    saveOrderItems();
    renderOrderSection();
    showToast('Lista de pedido limpa.');
  });

  els.btnCopyOrderQuote.addEventListener('click', () => {
    if (orderItems.length === 0) return;
    let totalRev = 0;
    let totalSav = 0;
    const lines = ['ORÇAMENTO DE PEDIDO', '------------------------'];
    orderItems.forEach((it) => {
      totalRev += it.totalRevenue;
      totalSav += it.totalSaved;
      lines.push(`• ${it.qty}x ${it.name}: ${formatBRL(it.totalRevenue)}`);
    });
    lines.push('------------------------');
    if (totalSav > 0.01) {
      lines.push(`Economia total aplicada: ${formatBRL(totalSav)}`);
    }
    lines.push(`TOTAL A PAGAR: ${formatBRL(totalRev)}`);
    copyText(lines.join('\n'), 'Orçamento completo copiado para enviar ao cliente!');
  });

  els.btnExample.addEventListener('click', loadExample);
  els.btnClear.addEventListener('click', clearAll);
  els.btnTheme.addEventListener('click', toggleTheme);

  // Initialize
  initTheme();
  renderOrderSection();
  loadExample();
})();
