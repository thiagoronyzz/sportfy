(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */

  const STORE = {
    order: 'margix:orders:v2',
    legacyOrder: 'margix_order_items_v1',
    theme: 'margix_theme_v1',
    form: 'margix:form:v2'
  };

  const PAY_METHODS = {
    pix: { label: 'Pix / Dinheiro', fee: 0 },
    debito: { label: 'Débito', fee: 1.99 },
    credito: { label: 'Crédito', fee: 4.99 }
  };

  const CREDIT_BASE_FEE = 4.99;
  const CREDIT_STEP_FEE = 1.09;
  const MAX_INSTALLMENTS = 12;
  const MAX_FEE_PCT = 35;
  const MAX_FEE_FIXED = 999;
  const MAX_QTY = 9999;

  const BASE_FIELDS = ['vendaBase', 'descCompra', 'precoCompra'];
  const CARD_ID = {
    vendaBase: 'cardVendaBase',
    descCompra: 'cardDescCompra',
    precoCompra: 'cardPrecoCompra'
  };
  const BADGE_ID = {
    vendaBase: 'badgeVendaBase',
    descCompra: 'badgeDescCompra',
    precoCompra: 'badgePrecoCompra'
  };

  /* ------------------------------------------------------------------ *
   * DOM
   * ------------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  const els = {
    productName: $('productName'),
    quantity: $('quantity'),
    qtyMinus: $('qtyMinus'),
    qtyPlus: $('qtyPlus'),
    vendaBase: $('vendaBase'),
    descCompra: $('descCompra'),
    precoCompra: $('precoCompra'),
    calcModeHint: $('calcModeHint'),
    markupInfo: $('markupInfo'),

    descCliente: $('descCliente'),
    precoFinalCliente: $('precoFinalCliente'),
    sliderDescCliente: $('sliderDescCliente'),
    sliderBreakEvenMark: $('sliderBreakEvenMark'),
    sliderMaxLabel: $('sliderMaxLabel'),
    maxDiscountPill: $('maxDiscountPill'),

    methodChips: $('methodChips'),
    taxaExtraPct: $('taxaExtraPct'),
    custoExtraFixo: $('custoExtraFixo'),
    outroCustoUnit: $('outroCustoUnit'),
    installmentsGroup: $('installmentsGroup'),
    installmentsChips: $('installmentsChips'),
    installmentsHint: $('installmentsHint'),
    feeModeChips: $('feeModeChips'),
    feeModePill: $('feeModePill'),
    feeModeHint: $('feeModeHint'),

    resultTitle: $('resultTitle'),
    healthBadge: $('healthBadge'),
    lossAlert: $('lossAlert'),
    lossAlertText: $('lossAlertText'),

    kpiClientPrice: $('kpiClientPrice'),
    kpiClientSub: $('kpiClientSub'),
    kpiProfitCard: $('kpiProfitCard'),
    kpiNetProfit: $('kpiNetProfit'),
    kpiProfitSub: $('kpiProfitSub'),
    kpiTotalCost: $('kpiTotalCost'),
    kpiCostSub: $('kpiCostSub'),
    kpiClientSaving: $('kpiClientSaving'),
    kpiSavingSub: $('kpiSavingSub'),

    breakdownRefTotal: $('breakdownRefTotal'),
    barCost: $('barCost'),
    barFees: $('barFees'),
    barProfit: $('barProfit'),
    barDiscount: $('barDiscount'),

    legCost: $('legCost'),
    legFeesWrap: $('legFeesWrap'),
    legFees: $('legFees'),
    dotProfit: $('dotProfit'),
    legProfitLabel: $('legProfitLabel'),
    legProfit: $('legProfit'),
    legDiscount: $('legDiscount'),

    metricRoi: $('metricRoi'),
    metricMargin: $('metricMargin'),
    metricBreakEven: $('metricBreakEven'),

    btnAddItem: $('btnAddItem'),
    btnCopyClient: $('btnCopyClient'),
    copyBtnText: $('copyBtnText'),

    scenariosBody: $('scenariosBody'),

    orderSection: $('orderSection'),
    orderCount: $('orderCount'),
    orderBody: $('orderBody'),
    orderTotalQty: $('orderTotalQty'),
    orderTotalCost: $('orderTotalCost'),
    orderTotalSaved: $('orderTotalSaved'),
    orderTotalRevenue: $('orderTotalRevenue'),
    orderTotalProfit: $('orderTotalProfit'),
    btnCopyOrderQuote: $('btnCopyOrderQuote'),
    btnClearOrder: $('btnClearOrder'),

    btnExample: $('btnExample'),
    btnClear: $('btnClear'),
    btnTheme: $('btnTheme'),
    iconMoon: $('iconMoon'),
    iconSun: $('iconSun'),
    toast: $('toast'),
    metaThemeColor: $('metaThemeColor'),

    btnInstall: $('btnInstall'),
    installSheet: $('installSheet'),
    installSheetClose: $('installSheetClose'),
    installSheetBody: $('installSheetBody')
  };

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */

  const state = {
    history: [],
    calculated: null,
    clientMode: 'pct',
    method: 'pix',
    installments: 1,
    feeMode: 'client',
    items: loadItems(),
    current: null,
    toastTimer: null,
    saveTimer: null,
    deferredPrompt: null
  };

  /* ------------------------------------------------------------------ *
   * Formatting helpers
   * ------------------------------------------------------------------ */

  const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function formatBRL(value) {
    return brlFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function formatPct(value, decimals = 1) {
    const v = Number.isFinite(value) ? value : 0;
    return (
      v.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }) + '%'
    );
  }

  function formatNumberInput(value, decimals = 2) {
    if (!Number.isFinite(value)) return '';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function parseDecimal(raw) {
    if (raw === null || raw === undefined) return NaN;
    const str = String(raw).trim();
    if (!str) return NaN;

    let normalized = str.replace(/[^\d.,-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === ',') return NaN;

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    if (hasComma && hasDot) {
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

  function numOr(value, fallback) {
    const n = parseDecimal(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampInt(value, min, max) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return min;
    return clamp(n, min, max);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2800);
  }

  /* ------------------------------------------------------------------ *
   * Base values (two of three)
   * ------------------------------------------------------------------ */

  function isValidBaseValue(key, value) {
    if (!Number.isFinite(value)) return false;
    if (key === 'descCompra') return value >= 0 && value < 100;
    return value > 0;
  }

  function readActivePayment() {
    const feePct = clamp(numOr(els.taxaExtraPct.value, 0), 0, MAX_FEE_PCT);
    const feeFixed = clamp(numOr(els.custoExtraFixo.value, 0), 0, MAX_FEE_FIXED);
    const installments = state.method === 'credito'
      ? clampInt(state.installments, 1, MAX_INSTALLMENTS)
      : 1;

    return {
      method: state.method,
      feePct,
      feeFixed,
      installments,
      passFee: state.feeMode === 'client'
    };
  }

  function suggestedCreditFee(installments) {
    const n = clampInt(installments, 1, MAX_INSTALLMENTS);
    if (n <= 1) return CREDIT_BASE_FEE;
    return Math.min(24.99, CREDIT_BASE_FEE + (n - 1) * CREDIT_STEP_FEE);
  }

  function onBaseFieldEdit(key) {
    const value = parseDecimal(els[key].value);
    const valid = isValidBaseValue(key, value);

    if (state.calculated && state.calculated !== key && !valid) {
      els[state.calculated].value = '';
      state.calculated = null;
    }

    state.history = state.history.filter((k) => k !== key);
    if (valid) {
      state.history.push(key);
      if (state.history.length > 2) state.history = state.history.slice(-2);
    } else if (state.calculated && state.calculated !== key) {
      els[state.calculated].value = '';
      state.calculated = null;
    }

    updateBuyChips();
    recalculate();
  }

  function resolveBaseValues() {
    state.history = state.history.filter((key) =>
      isValidBaseValue(key, parseDecimal(els[key].value))
    );

    BASE_FIELDS.forEach((key) => {
      const card = $(CARD_ID[key]);
      if (card) card.classList.remove('is-calculated');
      const badge = $(BADGE_ID[key]);
      if (badge) badge.hidden = true;
    });

    if (state.history.length < 2) {
      if (state.calculated && !state.history.includes(state.calculated)) {
        els[state.calculated].value = '';
      }
      state.calculated = null;
      els.calcModeHint.textContent =
        state.history.length === 0 ? 'Preencha 2 campos base' : 'Falta 1 campo base';
      return null;
    }

    const target = BASE_FIELDS.find((key) => !state.history.includes(key));
    if (!target) return null;
    state.calculated = target;

    let vendaBase = parseDecimal(els.vendaBase.value);
    let descCompra = parseDecimal(els.descCompra.value);
    let precoCompra = parseDecimal(els.precoCompra.value);

    if (target === 'precoCompra') {
      precoCompra = Math.max(0, vendaBase * (1 - descCompra / 100));
      els.precoCompra.value = formatNumberInput(precoCompra, 2);
      els.calcModeHint.textContent = 'Custo calculado';
    } else if (target === 'vendaBase') {
      const factor = 1 - descCompra / 100;
      if (factor <= 0) return null;
      vendaBase = precoCompra / factor;
      els.vendaBase.value = formatNumberInput(vendaBase, 2);
      els.calcModeHint.textContent = 'Preço de venda calculado';
    } else {
      if (vendaBase <= 0) return null;
      descCompra = ((vendaBase - precoCompra) / vendaBase) * 100;
      els.descCompra.value = formatNumberInput(descCompra, 1);
      els.calcModeHint.textContent = '% de compra calculado';
    }

    $(CARD_ID[target]).classList.add('is-calculated');
    $(BADGE_ID[target]).hidden = false;

    return { vendaBase, descCompra, precoCompra };
  }

  function updateBuyChips() {
    const current = parseDecimal(els.descCompra.value);
    document.querySelectorAll('[data-buy-disc]').forEach((btn) => {
      const chipValue = parseFloat(btn.getAttribute('data-buy-disc'));
      const active = Number.isFinite(current) && Math.abs(current - chipValue) < 0.05;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function updateClientChips(descPct) {
    document.querySelectorAll('[data-client-disc]').forEach((btn) => {
      const chipValue = parseFloat(btn.getAttribute('data-client-disc'));
      const active = Number.isFinite(descPct) && Math.abs(descPct - chipValue) < 0.05;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  /* ------------------------------------------------------------------ *
   * Financial model
   * ------------------------------------------------------------------ */

  function cardFeeFor(baseTotal, pay) {
    if (baseTotal <= 0) return 0;
    if (!pay.passFee) return baseTotal * (pay.feePct / 100) + pay.feeFixed;

    const netFactor = 1 - pay.feePct / 100;
    if (netFactor <= 0.01) return 0;
    return (baseTotal + pay.feeFixed) / netFactor - baseTotal;
  }

  function breakEvenUnit(costUnit, otherUnit, qty, pay, vendaBase) {
    if (pay.passFee) return costUnit + otherUnit;
    const netFactor = 1 - pay.feePct / 100;
    if (netFactor <= 0.01) return vendaBase;
    return (costUnit + otherUnit + pay.feeFixed / qty) / netFactor;
  }

  function recalculate() {
    const base = resolveBaseValues();
    const qty = clampInt(els.quantity.value, 1, MAX_QTY);
    const productName = els.productName.value.trim();

    els.resultTitle.textContent = productName
      ? productName + (qty > 1 ? ` (${qty} un.)` : '')
      : qty > 1
        ? `Análise Financeira (${qty} unidades)`
        : 'Análise Financeira';

    if (!base || !(base.vendaBase > 0) || !Number.isFinite(base.precoCompra)) {
      state.current = null;
      renderEmptyState();
      updateFeeModeHint(0, readActivePayment());
      updateInstallmentsHint(readActivePayment(), null);
      return;
    }

    const { vendaBase, descCompra, precoCompra } = base;
    const pay = readActivePayment();
    const otherUnit = Math.max(0, numOr(els.outroCustoUnit.value, 0));

    if (precoCompra > 0) {
      const baseMarkup = ((vendaBase - precoCompra) / precoCompra) * 100;
      els.markupInfo.textContent =
        `Custo unitário • Markup de tabela: ${baseMarkup >= 0 ? '+' : ''}${formatPct(baseMarkup, 1)}`;
    } else {
      els.markupInfo.textContent = 'Valor unitário pago ao fornecedor / marca';
    }

    const catalogTotal = vendaBase * qty;
    const costTotal = precoCompra * qty;
    const otherTotal = otherUnit * qty;

    let descClientePct;
    let negotiatedUnit;

    if (state.clientMode === 'finalPrice') {
      const typedFinal = parseDecimal(els.precoFinalCliente.value);
      if (Number.isFinite(typedFinal) && typedFinal >= 0) {
        negotiatedUnit = typedFinal;
        descClientePct = ((vendaBase - negotiatedUnit) / vendaBase) * 100;
      } else {
        negotiatedUnit = vendaBase;
        descClientePct = 0;
      }
      els.descCliente.value = formatNumberInput(descClientePct, 1);
    } else {
      const typedPct = parseDecimal(els.descCliente.value);
      descClientePct = Number.isFinite(typedPct) ? clamp(typedPct, -999, 99) : 0;
      negotiatedUnit = Math.max(0, vendaBase * (1 - descClientePct / 100));
      els.precoFinalCliente.value = formatNumberInput(negotiatedUnit, 2);
    }

    const negotiatedTotal = negotiatedUnit * qty;
    const fee = cardFeeFor(negotiatedTotal, pay);
    const clientTotal = pay.passFee ? negotiatedTotal + fee : negotiatedTotal;
    const profit = negotiatedTotal - costTotal - otherTotal - (pay.passFee ? 0 : fee);
    const received = negotiatedTotal - (pay.passFee ? 0 : fee);
    const invested = costTotal + otherTotal;
    const marginPct = negotiatedTotal > 0 ? (profit / negotiatedTotal) * 100 : 0;
    const roiPct = invested > 0 ? (profit / invested) * 100 : 0;
    const discountTotal = catalogTotal - negotiatedTotal;
    const clientSaving = catalogTotal - clientTotal;
    const clientSavingPct = catalogTotal > 0 ? (clientSaving / catalogTotal) * 100 : 0;

    const minUnit = breakEvenUnit(precoCompra, otherUnit, qty, pay, vendaBase);
    const maxDiscountPct = Math.max(0, ((vendaBase - minUnit) / vendaBase) * 100);
    const installmentValue = pay.installments > 1 ? clientTotal / pay.installments : 0;

    const sliderMax = clamp(
      Math.max(50, Math.ceil((Math.max(maxDiscountPct, descClientePct) + 10) / 5) * 5),
      0,
      99
    );
    els.sliderDescCliente.max = String(sliderMax);
    els.sliderMaxLabel.textContent = sliderMax + '%';
    els.sliderBreakEvenMark.textContent = `Máx. s/ prejuízo: ${formatPct(maxDiscountPct, 1)}`;

    const overLimit = descClientePct > maxDiscountPct + 0.1;
    els.maxDiscountPill.textContent = `Limite s/ prejuízo: ${formatPct(maxDiscountPct, 1)}`;
    els.maxDiscountPill.style.color = overLimit ? 'var(--danger)' : '';

    els.sliderDescCliente.value = String(clamp(descClientePct, 0, sliderMax));
    updateClientChips(descClientePct);

    const current = {
      productName: productName || 'Produto',
      productNameRaw: productName,
      qty,
      vendaBase,
      descCompra,
      precoCompra,
      descClientePct,
      negotiatedUnit,
      catalogTotal,
      negotiatedTotal,
      costTotal,
      otherTotal,
      fee,
      clientTotal,
      received,
      profit,
      invested,
      marginPct,
      roiPct,
      discountTotal,
      clientSaving,
      clientSavingPct,
      minUnit,
      maxDiscountPct,
      installmentValue,
      installments: pay.installments,
      pay
    };

    state.current = current;

    updateFeeModeHint(fee, pay);
    updateInstallmentsHint(pay, current);
    renderDashboard(current);
    renderScenarios(current);
  }

  /* ------------------------------------------------------------------ *
   * Rendering — results dashboard (original layout)
   * ------------------------------------------------------------------ */

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
    els.legFees.textContent = 'R$ 0,00 (0%)';
    els.legProfitLabel.textContent = 'Seu Lucro Líquido';
    els.dotProfit.classList.remove('is-loss');
    els.legProfit.textContent = 'R$ 0,00 (0%)';
    els.legDiscount.textContent = 'R$ 0,00 (0%)';

    els.metricRoi.textContent = '0,0%';
    els.metricMargin.textContent = '0,0%';
    els.metricBreakEven.textContent = '0,0% (R$ 0,00)';
    els.maxDiscountPill.textContent = 'Limite s/ prejuízo: —';
    els.maxDiscountPill.style.color = '';
    els.sliderBreakEvenMark.textContent = 'Ponto de equilíbrio';

    els.btnAddItem.disabled = true;
    els.btnCopyClient.disabled = true;

    els.scenariosBody.innerHTML =
      '<tr><td colspan="5" class="empty-table-cell">Preencha os valores base para visualizar os cenários de desconto.</td></tr>';
  }

  function renderDashboard(c) {
    const isLoss = c.profit < -0.005;
    const lowMargin = !isLoss && c.marginPct < 10;
    const absorbedFee = c.pay.passFee ? 0 : c.fee;

    if (isLoss) {
      els.healthBadge.className = 'health-badge health-loss';
      els.healthBadge.textContent = 'Prejuízo na Operação';
      els.lossAlert.hidden = false;
      els.lossAlertText.textContent =
        `Atenção: com ${formatPct(c.descClientePct, 1)} de desconto, você perde ${formatBRL(Math.abs(c.profit))}. ` +
        `O preço mínimo sem prejuízo é ${formatBRL(c.minUnit)}/un (${formatPct(c.maxDiscountPct, 1)} máx.).`;
      els.kpiProfitCard.classList.add('is-loss');
    } else if (lowMargin) {
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

    // Client total
    els.kpiClientPrice.textContent = formatBRL(c.clientTotal);

    const clientSub = [];
    if (c.installments > 1) {
      clientSub.push(`${c.installments}x de ${formatBRL(c.clientTotal / c.installments)}`);
    }
    if (c.fee > 0.005) {
      clientSub.push(
        c.pay.passFee
          ? `taxa ${formatBRL(c.fee)} inclusa`
          : `taxa ${formatBRL(c.fee)} por sua conta`
      );
    }
    if (c.qty > 1) clientSub.push(`${c.qty} un.`);
    if (clientSub.length === 0) {
      clientSub.push(c.qty > 1 ? `Tabela: ${formatBRL(c.catalogTotal)}` : `Tabela: ${formatBRL(c.vendaBase)}`);
    }
    els.kpiClientSub.textContent = clientSub.join(' • ');

    // Profit
    els.kpiNetProfit.textContent =
      (isLoss ? '− ' : '') + formatBRL(Math.abs(c.profit));
    els.kpiProfitSub.textContent =
      c.qty > 1
        ? `${formatBRL(c.profit / c.qty)}/un • Margem: ${formatPct(c.marginPct, 1)}`
        : `Margem líquida real: ${formatPct(c.marginPct, 1)}`;

    // Total cost
    els.kpiTotalCost.textContent = formatBRL(c.invested + absorbedFee);
    const costExtras = [];
    if (c.otherTotal > 0.005) costExtras.push(`Extras ${formatBRL(c.otherTotal)}`);
    if (absorbedFee > 0.005) costExtras.push(`Taxa ${formatBRL(absorbedFee)}`);
    els.kpiCostSub.textContent = costExtras.length
      ? `Compra ${formatBRL(c.costTotal)} + ${costExtras.join(' + ')}`
      : `Desconto compra: ${formatPct(c.descCompra, 1)}`;

    // Client saving vs. table
    const saving = Math.max(0, c.clientSaving);
    els.kpiClientSaving.textContent = formatBRL(saving);
    els.kpiSavingSub.textContent =
      c.clientSavingPct >= -0.05
        ? `${formatPct(Math.max(0, c.clientSavingPct), 1)} de desconto`
        : `Acima da tabela (+${formatPct(Math.abs(c.clientSavingPct), 1)})`;

    // Composition bar
    const costPart = c.costTotal + c.otherTotal;
    const feePart = c.fee;
    const profitPart = c.profit;
    const discountPart = Math.max(0, c.catalogTotal - c.clientTotal);

    let denominator;
    if (profitPart < -0.005) {
      denominator = costPart + feePart + Math.abs(profitPart);
    } else {
      denominator = Math.max(c.catalogTotal, c.clientTotal, costPart + feePart, 0.01);
    }

    const share = (value) => (denominator > 0 ? (value / denominator) * 100 : 0);
    const shownDiscount = profitPart < -0.005 ? 0 : discountPart;

    els.breakdownRefTotal.textContent = `Referência: ${formatBRL(denominator)}`;
    els.barCost.style.width = `${share(costPart).toFixed(2)}%`;
    els.barFees.style.width = `${share(feePart).toFixed(2)}%`;
    els.barProfit.style.width = `${share(profitPart < 0 ? Math.abs(profitPart) : profitPart).toFixed(2)}%`;
    els.barDiscount.style.width = `${share(shownDiscount).toFixed(2)}%`;

    els.barProfit.classList.toggle('is-loss', isLoss);
    els.dotProfit.classList.toggle('is-loss', isLoss);

    els.legCost.textContent = `${formatBRL(costPart)} (${formatPct(share(costPart), 0)})`;
    els.legFeesWrap.hidden = feePart <= 0.005;
    els.legFees.textContent = `${formatBRL(feePart)} (${formatPct(share(feePart), 0)})`;
    els.legProfitLabel.textContent = isLoss ? 'Prejuízo na Venda' : 'Seu Lucro Líquido';
    els.legProfit.textContent =
      `${isLoss ? '−' : ''}${formatBRL(Math.abs(profitPart))} (${formatPct(share(Math.abs(profitPart)), 0)})`;
    els.legDiscount.textContent =
      `${formatBRL(shownDiscount)} (${formatPct(share(shownDiscount), 1)})`;

    // Metrics
    els.metricRoi.textContent = `${c.roiPct >= 0 ? '+' : ''}${formatPct(c.roiPct, 1)}`;
    els.metricMargin.textContent = formatPct(c.marginPct, 1);
    els.metricBreakEven.textContent =
      `${formatPct(c.maxDiscountPct, 1)} (${formatBRL(c.minUnit)})`;

    els.btnAddItem.disabled = false;
    els.btnCopyClient.disabled = false;
  }

  function renderScenarios(c) {
    const steps = [0, 5, 10, 15, 20, 25, 30];

    els.scenariosBody.innerHTML = steps
      .map((pct) => {
        const negotiated = c.catalogTotal * (1 - pct / 100);
        const fee = cardFeeFor(negotiated, c.pay);
        const clientPays = c.pay.passFee ? negotiated + fee : negotiated;
        const profit =
          negotiated - c.costTotal - c.otherTotal - (c.pay.passFee ? 0 : fee);
        const margin = negotiated > 0 ? (profit / negotiated) * 100 : 0;
        const saved = Math.max(0, c.catalogTotal - clientPays);
        const isActive = Math.abs(c.descClientePct - pct) < 0.25;
        const isLoss = profit < -0.005;

        return `
          <tr data-scenario-pct="${pct}" class="${isActive ? 'active-row' : ''} ${isLoss ? 'loss-row' : ''}">
            <td><strong>${pct}%</strong></td>
            <td>${formatBRL(clientPays)}</td>
            <td>${saved > 0.005 ? formatBRL(saved) : '—'}</td>
            <td class="col-profit">${isLoss ? '− ' : ''}${formatBRL(Math.abs(profit))}</td>
            <td>${formatPct(margin, 1)}</td>
          </tr>
        `;
      })
      .join('');
  }

  function updateFeeModeHint(fee, pay) {
    document.querySelectorAll('[data-fee-mode]').forEach((btn) => {
      const active = btn.getAttribute('data-fee-mode') === state.feeMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    els.feeModePill.textContent = pay && pay.passFee
      ? 'Cliente paga a taxa'
      : 'Você absorve a taxa';

    if (!pay || fee <= 0.005) {
      els.feeModeHint.textContent = 'Sem taxa nesta forma de pagamento.';
      return;
    }

    els.feeModeHint.textContent = pay.passFee
      ? `O cliente paga ${formatBRL(fee)} a mais e você recebe o valor combinado.`
      : `Você absorve ${formatBRL(fee)} de taxa — sai do seu lucro.`;
  }

  function updateInstallmentsHint(pay, calc) {
    if (!els.installmentsHint) return;
    if (!pay || state.method !== 'credito') {
      els.installmentsHint.textContent = '';
      return;
    }

    const feeText = `taxa da maquininha: ${formatPct(pay.feePct, 2)}`;
    if (pay.installments <= 1) {
      els.installmentsHint.textContent = `À vista no crédito • ${feeText}.`;
    } else if (calc && calc.clientTotal > 0) {
      els.installmentsHint.textContent =
        `${pay.installments}x de ${formatBRL(calc.clientTotal / pay.installments)} • ${feeText}.`;
    } else {
      els.installmentsHint.textContent = `${pay.installments} parcelas • ${feeText}.`;
    }
  }

  /* ------------------------------------------------------------------ *
   * Payment UI
   * ------------------------------------------------------------------ */

  function applyMethod(method) {
    if (!PAY_METHODS[method]) method = 'pix';

    state.method = method;
    if (method !== 'credito') state.installments = 1;

    const fee = method === 'credito'
      ? suggestedCreditFee(state.installments)
      : PAY_METHODS[method].fee;
    els.taxaExtraPct.value = fee ? formatNumberInput(fee, 2) : '';

    syncPaymentUI();
    recalculate();
    scheduleSave();
  }

  function selectInstallments(count) {
    state.method = 'credito';
    state.installments = clampInt(count, 1, MAX_INSTALLMENTS);
    els.taxaExtraPct.value = formatNumberInput(suggestedCreditFee(state.installments), 2);

    syncPaymentUI();
    recalculate();
    scheduleSave();
  }

  function selectFeeMode(mode) {
    state.feeMode = mode === 'seller' ? 'seller' : 'client';
    syncPaymentUI();
    recalculate();
    scheduleSave();
  }

  function buildInstallmentChips() {
    if (!els.installmentsChips) return;
    els.installmentsChips.innerHTML = Array.from(
      { length: MAX_INSTALLMENTS },
      (_, index) => {
        const n = index + 1;
        return `<button type="button" class="chip" data-installments="${n}" aria-pressed="false">${n}x</button>`;
      }
    ).join('');
  }

  function updateInstallmentChips() {
    if (!els.installmentsChips) return;
    els.installmentsChips.querySelectorAll('[data-installments]').forEach((btn) => {
      const n = parseInt(btn.getAttribute('data-installments'), 10);
      const active = state.method === 'credito' && n === state.installments;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function syncPaymentUI() {
    document.querySelectorAll('[data-method]').forEach((btn) => {
      const active = btn.getAttribute('data-method') === state.method;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    els.installmentsGroup.hidden = state.method !== 'credito';
    updateInstallmentChips();

    document.querySelectorAll('[data-fee-mode]').forEach((btn) => {
      const active = btn.getAttribute('data-fee-mode') === state.feeMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  /* ------------------------------------------------------------------ *
   * Order simulator
   * ------------------------------------------------------------------ */

  function loadItems() {
    try {
      const stored = localStorage.getItem(STORE.order);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
      const legacy = localStorage.getItem(STORE.legacyOrder);
      const parsedLegacy = legacy ? JSON.parse(legacy) : [];
      return Array.isArray(parsedLegacy) ? parsedLegacy : [];
    } catch (_) {
      return [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORE.order, JSON.stringify(state.items));
    } catch (_) {}
  }

  function renderOrder() {
    if (state.items.length === 0) {
      els.orderSection.hidden = true;
      return;
    }

    els.orderSection.hidden = false;
    els.orderCount.textContent = String(state.items.length);

    let totalQty = 0;
    let totalCost = 0;
    let totalSaved = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    els.orderBody.innerHTML = state.items
      .map((item, index) => {
        totalQty += item.qty;
        totalCost += item.totalCost;
        totalSaved += item.totalSaved;
        totalRevenue += item.totalRevenue;
        totalProfit += item.totalProfit;

        const loss = item.totalProfit < 0;
        const installments = item.installments || 1;
        const subline = installments > 1
          ? `<span class="order-sub">${installments}x de ${formatBRL(item.totalRevenue / installments)}</span>`
          : '';

        return `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong>${subline}</td>
            <td>${item.qty}</td>
            <td>${formatBRL(item.totalCost)}</td>
            <td>${item.descClientePct > 0 ? `${formatPct(item.descClientePct, 1)} (${formatBRL(item.totalSaved)})` : 'Sem desc.'}</td>
            <td class="highlight-client">${formatBRL(item.totalRevenue)}</td>
            <td class="${loss ? 'col-loss' : 'col-profit'}">${loss ? '− ' : ''}${formatBRL(Math.abs(item.totalProfit))}</td>
            <td>
              <button type="button" class="btn-remove-row" data-remove-idx="${index}" title="Remover item" aria-label="Remover item">✕</button>
            </td>
          </tr>
        `;
      })
      .join('');

    els.orderTotalQty.textContent = String(totalQty);
    els.orderTotalCost.textContent = formatBRL(totalCost);
    els.orderTotalSaved.textContent = formatBRL(totalSaved);
    els.orderTotalRevenue.textContent = formatBRL(totalRevenue);
    els.orderTotalProfit.textContent =
      (totalProfit < 0 ? '− ' : '') + formatBRL(Math.abs(totalProfit));
  }

  function addCurrentToOrder() {
    const c = state.current;
    if (!c) return;

    const name = c.productNameRaw || `Item #${state.items.length + 1}`;
    const absorbedFee = c.pay.passFee ? 0 : c.fee;

    state.items.push({
      name,
      qty: c.qty,
      descClientePct: c.descClientePct,
      installments: c.installments,
      fee: c.fee,
      passFee: c.pay.passFee,
      totalCost: c.invested + absorbedFee,
      totalSaved: Math.max(0, c.clientSaving),
      totalRevenue: c.clientTotal,
      totalProfit: c.profit
    });

    saveItems();
    renderOrder();
    showToast(`"${name}" adicionado à simulação de pedido.`);
  }

  /* ------------------------------------------------------------------ *
   * Clipboard / quotes
   * ------------------------------------------------------------------ */

  function copyText(text, successMessage) {
    const done = () => showToast(successMessage);
    const fallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        done();
      } catch (_) {
        showToast('Não foi possível copiar automaticamente.');
      }
      document.body.removeChild(textarea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function buildClientQuote() {
    const c = state.current;
    if (!c) return '';

    const lines = [];
    if (c.productNameRaw) {
      lines.push(`Produto: ${c.productNameRaw}${c.qty > 1 ? ` (${c.qty} un.)` : ''}`);
    } else if (c.qty > 1) {
      lines.push(`Quantidade: ${c.qty} unidades`);
    }

    if (c.descClientePct > 0.01) {
      lines.push(`Valor de tabela: ${formatBRL(c.catalogTotal)}`);
      lines.push(`Desconto especial (${formatPct(c.descClientePct, 1)}): -${formatBRL(c.discountTotal)}`);
    }

    if (c.fee > 0.005 && c.pay.passFee) {
      const feeLabel = c.pay.feePct > 0.0001 ? ` (${formatPct(c.pay.feePct, 2)})` : '';
      lines.push(`Acréscimo da maquininha${feeLabel}: +${formatBRL(c.fee)}`);
    }

    lines.push(`Valor final: ${formatBRL(c.clientTotal)}`);

    if (c.installments > 1) {
      lines.push(`ou ${c.installments}x de ${formatBRL(c.clientTotal / c.installments)} no cartão`);
    }

    if (c.fee > 0.005 && c.pay.passFee) {
      lines.push('Taxa da maquininha já incluída no total.');
    }

    return lines.join('\n');
  }

  function buildOrderQuote() {
    if (state.items.length === 0) return '';

    let totalRevenue = 0;
    let totalSaved = 0;
    let totalFee = 0;

    const lines = ['ORÇAMENTO DE PEDIDO', '------------------------'];
    state.items.forEach((item) => {
      totalRevenue += item.totalRevenue;
      totalSaved += item.totalSaved;
      if (item.passFee) totalFee += item.fee || 0;

      lines.push(`• ${item.qty}x ${item.name}: ${formatBRL(item.totalRevenue)}`);
    });

    lines.push('------------------------');
    if (totalFee > 0.01) {
      lines.push(`Taxa da maquininha incluída: ${formatBRL(totalFee)}`);
    }
    if (totalSaved > 0.01) {
      lines.push(`Economia total aplicada: ${formatBRL(totalSaved)}`);
    }
    lines.push(`TOTAL A PAGAR: ${formatBRL(totalRevenue)}`);

    const list = state.items.map((item) => item.installments || 1);
    const sameInstallments = list.every((n) => n === list[0]) ? list[0] : 0;
    if (sameInstallments > 1) {
      lines.push(`ou ${sameInstallments}x de ${formatBRL(totalRevenue / sameInstallments)} no cartão`);
    }

    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Example / reset
   * ------------------------------------------------------------------ */

  function loadExample() {
    els.productName.value = 'Kit Hidratante + Body Splash';
    els.quantity.value = '1';
    els.vendaBase.value = '150,00';
    els.descCompra.value = '30';
    els.precoCompra.value = '';
    els.descCliente.value = '10';
    els.precoFinalCliente.value = '';
    els.outroCustoUnit.value = '';
    els.sliderDescCliente.value = '0';

    state.history = ['vendaBase', 'descCompra'];
    state.calculated = null;
    state.clientMode = 'pct';
    state.method = 'pix';
    state.installments = 1;
    state.feeMode = 'client';
    els.taxaExtraPct.value = '';
    els.custoExtraFixo.value = '';

    syncPaymentUI();
    updateBuyChips();
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
    els.outroCustoUnit.value = '';
    els.calcModeHint.textContent = 'Preencha 2 campos base';

    state.history = [];
    state.calculated = null;
    state.clientMode = 'pct';
    state.method = 'pix';
    state.installments = 1;
    state.feeMode = 'client';

    try {
      localStorage.removeItem(STORE.form);
    } catch (_) {}

    syncPaymentUI();
    updateBuyChips();
    updateClientChips(0);
    recalculate();
    els.vendaBase.focus();
  }

  /* ------------------------------------------------------------------ *
   * Persistence
   * ------------------------------------------------------------------ */

  function saveForm() {
    try {
      const payload = {
        fields: {
          productName: els.productName.value,
          quantity: els.quantity.value,
          vendaBase: els.vendaBase.value,
          descCompra: els.descCompra.value,
          precoCompra: els.precoCompra.value,
          descCliente: els.descCliente.value,
          precoFinalCliente: els.precoFinalCliente.value,
          taxaExtraPct: els.taxaExtraPct.value,
          custoExtraFixo: els.custoExtraFixo.value,
          outroCustoUnit: els.outroCustoUnit.value
        },
        history: state.history,
        calculated: state.calculated,
        clientMode: state.clientMode,
        method: state.method,
        installments: state.installments,
        feeMode: state.feeMode
      };
      localStorage.setItem(STORE.form, JSON.stringify(payload));
    } catch (_) {}
  }

  function scheduleSave() {
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveForm, 350);
  }

  function restoreForm() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORE.form) || 'null');
    } catch (_) {
      saved = null;
    }
    if (!saved || !saved.fields) return false;

    const f = saved.fields;
    const assign = (el, value) => {
      if (typeof value === 'string' && el) el.value = value;
    };

    assign(els.productName, f.productName);
    assign(els.quantity, f.quantity);
    assign(els.vendaBase, f.vendaBase);
    assign(els.descCompra, f.descCompra);
    assign(els.precoCompra, f.precoCompra);
    assign(els.descCliente, f.descCliente);
    assign(els.precoFinalCliente, f.precoFinalCliente);
    assign(els.taxaExtraPct, f.taxaExtraPct);
    assign(els.custoExtraFixo, f.custoExtraFixo);
    assign(els.outroCustoUnit, f.outroCustoUnit || f.otherCostUnit);

    if (['pix', 'debito', 'credito', 'parcelado'].includes(saved.method)) {
      state.method = saved.method === 'parcelado' ? 'credito' : saved.method;
    }

    const savedInstallments = clampInt(
      saved.installments !== undefined ? saved.installments : f.installments,
      1,
      MAX_INSTALLMENTS
    );
    state.installments = state.method === 'credito' ? savedInstallments : 1;

    if (saved.feeMode === 'client' || saved.feeMode === 'seller') {
      state.feeMode = saved.feeMode;
    } else if (saved.passFee === false) {
      state.feeMode = 'seller';
    }

    state.clientMode = saved.clientMode === 'finalPrice' ? 'finalPrice' : 'pct';
    state.history = Array.isArray(saved.history)
      ? saved.history.filter((k) => BASE_FIELDS.includes(k)).slice(-2)
      : [];
    state.calculated = BASE_FIELDS.includes(saved.calculated) ? saved.calculated : null;

    if (state.history.length === 0) {
      BASE_FIELDS.forEach((k) => {
        if (isValidBaseValue(k, parseDecimal(els[k].value))) state.history.push(k);
      });
      state.history = state.history.slice(-2);
    }

    syncPaymentUI();
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Theme
   * ------------------------------------------------------------------ */

  const prefersDark = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  function applyTheme(theme, persist) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (els.iconMoon) els.iconMoon.hidden = isDark;
    if (els.iconSun) els.iconSun.hidden = !isDark;
    if (els.metaThemeColor) {
      els.metaThemeColor.setAttribute('content', isDark ? '#0B1120' : '#FFFFFF');
    }
    if (persist) {
      try {
        localStorage.setItem(STORE.theme, theme);
      } catch (_) {}
    }
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORE.theme);
    } catch (_) {}
    applyTheme(saved || (prefersDark && prefersDark.matches ? 'dark' : 'light'), false);
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark', true);
  }

  /* ------------------------------------------------------------------ *
   * PWA: install + service worker
   * ------------------------------------------------------------------ */

  const isStandalone = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  function installSheetContent() {
    const ua = window.navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    if (isIOS) {
      return `
        <ol>
          <li>Abra o Margix no <strong>Safari</strong>.</li>
          <li>Toque no botão <strong>Compartilhar</strong> (quadrado com a seta para cima).</li>
          <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Toque em <strong>Adicionar</strong>.</li>
        </ol>
        <p class="sheet-note">No iPhone, a instalação precisa ser feita pelo Safari. O app abre em tela cheia e funciona offline.</p>
      `;
    }
    if (isAndroid) {
      return `
        <ol>
          <li>Toque no menu do navegador (<strong>⋮</strong>).</li>
          <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
          <li>Confirme. O Margix abre em tela cheia e funciona offline.</li>
        </ol>
      `;
    }
    return `
      <ol>
        <li>No <strong>Chrome</strong> ou <strong>Edge</strong>, use o ícone de instalação na barra de endereço.</li>
        <li>Clique em <strong>Instalar</strong> e confirme.</li>
        <li>O Margix abre em uma janela própria e funciona offline.</li>
      </ol>
      <p class="sheet-note">Para usar no celular, abra este site no navegador do aparelho e use “Adicionar à tela inicial”.</p>
    `;
  }

  function openInstallSheet() {
    if (!els.installSheet || typeof els.installSheet.showModal !== 'function') {
      showToast('Use o menu do navegador e escolha "Instalar app".');
      return;
    }
    els.installSheetBody.innerHTML = installSheetContent();
    if (!els.installSheet.open) els.installSheet.showModal();
  }

  function setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js', { scope: './', updateViaCache: 'none' })
          .catch(() => {});
      });
    }

    els.btnInstall.hidden = isStandalone();

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
      els.btnInstall.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      state.deferredPrompt = null;
      els.btnInstall.hidden = true;
      showToast('Margix instalado no seu celular!');
    });
  }

  async function handleInstallClick() {
    if (state.deferredPrompt) {
      const prompt = state.deferredPrompt;
      state.deferredPrompt = null;
      prompt.prompt();
      try {
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          els.btnInstall.hidden = true;
          showToast('Instalando o Margix…');
        }
      } catch (_) {}
      return;
    }
    openInstallSheet();
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */

  function bindEvents() {
    BASE_FIELDS.forEach((key) => {
      els[key].addEventListener('input', () => onBaseFieldEdit(key));
    });

    document.querySelectorAll('[data-buy-disc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        els.descCompra.value = btn.getAttribute('data-buy-disc');
        onBaseFieldEdit('descCompra');
      });
    });

    els.descCliente.addEventListener('input', () => {
      state.clientMode = 'pct';
      recalculate();
    });

    els.precoFinalCliente.addEventListener('input', () => {
      state.clientMode = 'finalPrice';
      recalculate();
    });

    els.sliderDescCliente.addEventListener('input', () => {
      state.clientMode = 'pct';
      const value = parseFloat(els.sliderDescCliente.value);
      els.descCliente.value = Number.isInteger(value)
        ? String(value)
        : formatNumberInput(value, 1);
      recalculate();
    });

    document.querySelectorAll('[data-client-disc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.clientMode = 'pct';
        els.descCliente.value = btn.getAttribute('data-client-disc');
        recalculate();
      });
    });

    els.productName.addEventListener('input', recalculate);
    els.quantity.addEventListener('input', recalculate);

    els.qtyMinus.addEventListener('click', () => {
      const current = clampInt(els.quantity.value, 1, MAX_QTY);
      if (current > 1) {
        els.quantity.value = String(current - 1);
        recalculate();
      }
    });

    els.qtyPlus.addEventListener('click', () => {
      const current = clampInt(els.quantity.value, 1, MAX_QTY);
      els.quantity.value = String(current + 1);
      recalculate();
    });

    els.methodChips.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-method]');
      if (!btn) return;
      applyMethod(btn.getAttribute('data-method'));
    });

    els.installmentsChips.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-installments]');
      if (!btn) return;
      selectInstallments(parseInt(btn.getAttribute('data-installments'), 10));
    });

    els.feeModeChips.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-fee-mode]');
      if (!btn) return;
      selectFeeMode(btn.getAttribute('data-fee-mode'));
    });

    els.taxaExtraPct.addEventListener('input', recalculate);
    els.taxaExtraPct.addEventListener('blur', () => {
      const value = parseDecimal(els.taxaExtraPct.value);
      if (!Number.isFinite(value)) return;
      const clamped = clamp(value, 0, MAX_FEE_PCT);
      if (clamped !== value) {
        els.taxaExtraPct.value = formatNumberInput(clamped, 2);
        recalculate();
        showToast(`Taxa limitada a ${formatPct(MAX_FEE_PCT, 0)}.`);
      }
    });

    els.custoExtraFixo.addEventListener('input', recalculate);
    els.custoExtraFixo.addEventListener('blur', () => {
      const value = parseDecimal(els.custoExtraFixo.value);
      if (!Number.isFinite(value)) return;
      const clamped = clamp(value, 0, MAX_FEE_FIXED);
      if (clamped !== value) {
        els.custoExtraFixo.value = formatNumberInput(clamped, 2);
        recalculate();
      }
    });

    els.outroCustoUnit.addEventListener('input', recalculate);

    els.quantity.addEventListener('blur', () => {
      const qty = clampInt(els.quantity.value, 1, MAX_QTY);
      if (String(qty) !== els.quantity.value) {
        els.quantity.value = String(qty);
        recalculate();
      }
    });

    els.scenariosBody.addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-scenario-pct]');
      if (!row) return;
      state.clientMode = 'pct';
      els.descCliente.value = row.getAttribute('data-scenario-pct');
      recalculate();
    });

    els.btnAddItem.addEventListener('click', addCurrentToOrder);

    els.btnCopyClient.addEventListener('click', () => {
      const quote = buildClientQuote();
      if (quote) copyText(quote, 'Resumo para o cliente copiado!');
    });

    els.orderBody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-remove-idx]');
      if (!btn) return;
      const index = parseInt(btn.getAttribute('data-remove-idx'), 10);
      if (Number.isInteger(index) && index >= 0 && index < state.items.length) {
        state.items.splice(index, 1);
        saveItems();
        renderOrder();
      }
    });

    els.btnClearOrder.addEventListener('click', () => {
      if (state.items.length === 0) return;
      state.items = [];
      saveItems();
      renderOrder();
      showToast('Lista de pedido limpa.');
    });

    els.btnCopyOrderQuote.addEventListener('click', () => {
      const quote = buildOrderQuote();
      if (quote) copyText(quote, 'Orçamento completo copiado para enviar ao cliente!');
    });

    els.btnExample.addEventListener('click', () => {
      loadExample();
      showToast('Exemplo carregado.');
    });

    els.btnClear.addEventListener('click', clearAll);
    els.btnTheme.addEventListener('click', toggleTheme);

    els.btnInstall.addEventListener('click', handleInstallClick);
    els.installSheetClose.addEventListener('click', () => els.installSheet.close());
    els.installSheet.addEventListener('click', (event) => {
      if (event.target === els.installSheet) els.installSheet.close();
    });

    ['input', 'change'].forEach((evt) => {
      document
        .querySelectorAll(
          '#productName, #quantity, #vendaBase, #descCompra, #precoCompra, #descCliente, #precoFinalCliente, #taxaExtraPct, #custoExtraFixo, #outroCustoUnit'
        )
        .forEach((el) => el.addEventListener(evt, scheduleSave));
    });

    window.addEventListener('beforeunload', saveForm);

    if (prefersDark && typeof prefersDark.addEventListener === 'function') {
      prefersDark.addEventListener('change', (event) => {
        let saved = null;
        try {
          saved = localStorage.getItem(STORE.theme);
        } catch (_) {}
        if (!saved) applyTheme(event.matches ? 'dark' : 'light', false);
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  function init() {
    initTheme();
    buildInstallmentChips();
    bindEvents();
    setupPWA();

    const restored = restoreForm();
    if (!restored) loadExample();

    updateBuyChips();
    renderOrder();
    recalculate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
