(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */

  const STORE = {
    order: 'margix:orders:v2',
    theme: 'margix:theme:v1',
    form: 'margix:form:v2'
  };

  const PAY_METHODS = {
    pix: { label: 'Pix / Dinheiro', fee: 0 },
    debito: { label: 'Débito', fee: 1.99 },
    credito: { label: 'Crédito', fee: 4.99 }
  };

  // Estimated market fee for credit, growing with the number of installments.
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
    // operation
    productName: $('productName'),
    quantity: $('quantity'),
    qtyMinus: $('qtyMinus'),
    qtyPlus: $('qtyPlus'),
    vendaBase: $('vendaBase'),
    descCompra: $('descCompra'),
    precoCompra: $('precoCompra'),
    calcModeHint: $('calcModeHint'),
    markupInfo: $('markupInfo'),

    // client discount
    descCliente: $('descCliente'),
    precoFinalCliente: $('precoFinalCliente'),
    sliderDescCliente: $('sliderDescCliente'),
    sliderBreakEvenMark: $('sliderBreakEvenMark'),
    sliderMaxLabel: $('sliderMaxLabel'),
    maxDiscountPill: $('maxDiscountPill'),

    // payment
    methodGrid: $('methodGrid'),
    feePct: $('feePct'),
    feeFixed: $('feeFixed'),
    installmentsField: $('installmentsField'),
    installmentsChips: $('installmentsChips'),
    installmentsHint: $('installmentsHint'),
    passFee: $('passFee'),
    passFeeHint: $('passFeeHint'),
    otherCostUnit: $('otherCostUnit'),

    // hero
    resultTitle: $('resultTitle'),
    healthBadge: $('healthBadge'),
    kpiClientPrice: $('kpiClientPrice'),
    heroLines: $('heroLines'),
    heroSubtotal: $('heroSubtotal'),
    heroSubtotalRow: $('heroSubtotalRow'),
    heroFeeRow: $('heroFeeRow'),
    heroFeeLabel: $('heroFeeLabel'),
    heroFee: $('heroFee'),
    heroReceivesRow: $('heroReceivesRow'),
    heroReceives: $('heroReceives'),
    heroInstallmentsRow: $('heroInstallmentsRow'),
    heroInstallments: $('heroInstallments'),
    lossAlert: $('lossAlert'),
    lossAlertText: $('lossAlertText'),
    legProfitLabel: $('legProfitLabel'),
    kpiNetProfit: $('kpiNetProfit'),
    kpiProfitSub: $('kpiProfitSub'),
    kpiReceiveSub: $('kpiReceiveSub'),
    btnAddItem: $('btnAddItem'),
    btnCopyClient: $('btnCopyClient'),

    // details
    barCost: $('barCost'),
    barFees: $('barFees'),
    barProfit: $('barProfit'),
    barLoss: $('barLoss'),
    legCost: $('legCost'),
    legFeesWrap: $('legFeesWrap'),
    legFees: $('legFees'),
    legProfitName: $('legProfitName'),
    legProfit: $('legProfit'),
    dotProfit: $('dotProfit'),
    savingNote: $('savingNote'),
    metricCost: $('metricCost'),
    metricReceive: $('metricReceive'),
    metricSaving: $('metricSaving'),
    metricMarkup: $('metricMarkup'),
    metricMargin: $('metricMargin'),
    metricBreakEven: $('metricBreakEven'),

    scenariosBody: $('scenariosBody'),

    // order
    orderSection: $('orderSection'),
    orderCount: $('orderCount'),
    orderEmpty: $('orderEmpty'),
    orderTableWrap: $('orderTableWrap'),
    orderBody: $('orderBody'),
    orderTotalQty: $('orderTotalQty'),
    orderTotalClient: $('orderTotalClient'),
    orderTotalProfit: $('orderTotalProfit'),
    orderFeeNote: $('orderFeeNote'),
    btnCopyOrderQuote: $('btnCopyOrderQuote'),
    btnClearOrder: $('btnClearOrder'),
    tabOrderBadge: $('tabOrderBadge'),

    // chrome
    btnExample: $('btnExample'),
    btnClear: $('btnClear'),
    btnTheme: $('btnTheme'),
    iconMoon: $('iconMoon'),
    iconSun: $('iconSun'),
    toast: $('toast'),
    mobileSummary: $('mobileSummary'),
    mobileSummaryValue: $('mobileSummaryValue'),
    metaThemeColor: $('metaThemeColor'),

    // install
    btnInstall: $('btnInstall'),
    btnInstallFooter: $('btnInstallFooter'),
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
    current: null,
    items: loadItems(),
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
    const v = Number.isFinite(value) ? value : 0;
    return brlFormatter.format(v);
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
   * Base values (two of three: sale price, purchase discount, cost)
   * ------------------------------------------------------------------ */

  function isValidBaseValue(key, value) {
    if (!Number.isFinite(value)) return false;
    if (key === 'descCompra') return value >= 0 && value < 100;
    return value > 0;
  }

  function readActivePayment() {
    const feePctRaw = numOr(els.feePct.value, 0);
    const feePct = clamp(feePctRaw, 0, MAX_FEE_PCT);
    const feeFixed = clamp(numOr(els.feeFixed.value, 0), 0, MAX_FEE_FIXED);
    const installments = state.method === 'credito'
      ? clampInt(state.installments, 1, MAX_INSTALLMENTS)
      : 1;

    return {
      method: state.method,
      feePct,
      feeFixed,
      installments,
      passFee: els.passFee.checked
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
      $(CARD_ID[key]).classList.remove('is-calculated');
      $(BADGE_ID[key]).hidden = true;
    });

    if (state.history.length < 2) {
      if (state.calculated && !state.history.includes(state.calculated)) {
        els[state.calculated].value = '';
      }
      state.calculated = null;
      els.calcModeHint.textContent =
        state.history.length === 0 ? 'Preencha 2 campos' : 'Falta 1 campo';
      return null;
    }

    const target = BASE_FIELDS.find((key) => !state.history.includes(key));
    if (!target) return null;
    state.calculated = target;

    let vendaBase = parseDecimal(els.vendaBase.value);
    let descCompra = parseDecimal(els.descCompra.value);
    let precoCompra = parseDecimal(els.precoCompra.value);

    if (target === 'precoCompra') {
      const factor = 1 - descCompra / 100;
      precoCompra = Math.max(0, vendaBase * factor);
      els.precoCompra.value = formatNumberInput(precoCompra, 2);
      els.calcModeHint.textContent = 'Custo calculado';
    } else if (target === 'vendaBase') {
      const factor = 1 - descCompra / 100;
      if (factor <= 0) return null;
      vendaBase = precoCompra / factor;
      els.vendaBase.value = formatNumberInput(vendaBase, 2);
      els.calcModeHint.textContent = 'Tabela calculada';
    } else {
      if (vendaBase <= 0) return null;
      descCompra = ((vendaBase - precoCompra) / vendaBase) * 100;
      els.descCompra.value = formatNumberInput(descCompra, 1);
      els.calcModeHint.textContent = 'Desconto calculado';
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

  /**
   * Fee charged by the card machine for a given negotiated amount.
   * - passFee = true: gross-up, so the seller still receives `baseTotal`.
   * - passFee = false: the fee is simply discounted from the seller.
   */
  function cardFeeFor(baseTotal, pay) {
    if (baseTotal <= 0) return 0;

    if (!pay.passFee) {
      return baseTotal * (pay.feePct / 100) + pay.feeFixed;
    }

    const netFactor = 1 - pay.feePct / 100;
    if (netFactor <= 0.01) return 0;
    return (baseTotal + pay.feeFixed) / netFactor - baseTotal;
  }

  function breakEvenUnit(costUnit, otherUnit, qty, pay, vendaBase) {
    if (pay.passFee) {
      // The fee is neutralised, so break-even is simply cost + extras.
      return costUnit + otherUnit;
    }
    const netFactor = 1 - pay.feePct / 100;
    if (netFactor <= 0.01) return vendaBase;
    return (costUnit + otherUnit + pay.feeFixed / qty) / netFactor;
  }

  function recalculate() {
    const base = resolveBaseValues();
    const qty = clampInt(els.quantity.value, 1, MAX_QTY);
    const productName = els.productName.value.trim();

    els.resultTitle.textContent = productName
      ? productName + (qty > 1 ? ` · ${qty} un.` : '')
      : qty > 1
        ? `Análise da venda · ${qty} un.`
        : 'Análise da venda';

    if (!base || !(base.vendaBase > 0) || !Number.isFinite(base.precoCompra)) {
      state.current = null;
      renderEmptyState();
      updatePassFeeHint(0, null);
      updateInstallmentsHint(readActivePayment(), null);
      return;
    }

    const { vendaBase, descCompra, precoCompra } = base;
    const pay = readActivePayment();
    const otherUnit = Math.max(0, numOr(els.otherCostUnit.value, 0));

    if (precoCompra > 0) {
      const baseMarkup = ((vendaBase - precoCompra) / precoCompra) * 100;
      els.markupInfo.textContent =
        `Custo unitário · markup de tabela: ${baseMarkup >= 0 ? '+' : ''}${formatPct(baseMarkup, 1)}`;
    } else {
      els.markupInfo.textContent = 'Valor unitário pago ao fornecedor.';
    }

    const catalogTotal = vendaBase * qty;
    const costTotal = precoCompra * qty;
    const otherTotal = otherUnit * qty;

    // --- client discount (percentage <-> final unit price) ---
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
    const discountPct = catalogTotal > 0 ? (discountTotal / catalogTotal) * 100 : 0;
    const clientSaving = catalogTotal - clientTotal;
    const clientSavingPct = catalogTotal > 0 ? (clientSaving / catalogTotal) * 100 : 0;

    const minUnit = breakEvenUnit(precoCompra, otherUnit, qty, pay, vendaBase);
    const maxDiscountPct = Math.max(0, ((vendaBase - minUnit) / vendaBase) * 100);
    const installmentValue = pay.installments > 1 ? clientTotal / pay.installments : 0;

    // --- slider & limit pill ---
    const sliderMax = clamp(
      Math.max(50, Math.ceil((Math.max(maxDiscountPct, descClientePct) + 10) / 5) * 5),
      0,
      99
    );
    els.sliderDescCliente.max = String(sliderMax);
    els.sliderDescCliente.value = String(clamp(Number(els.sliderDescCliente.value) || 0, 0, sliderMax));
    els.sliderMaxLabel.textContent = sliderMax + '%';
    els.sliderBreakEvenMark.textContent = `Sem prejuízo: ${formatPct(maxDiscountPct, 1)}`;

    const overLimit = descClientePct > maxDiscountPct + 0.1;
    els.maxDiscountPill.textContent = `Limite: ${formatPct(maxDiscountPct, 1)}`;
    els.maxDiscountPill.className = 'pill ' + (overLimit ? 'is-danger' : 'pill-accent');

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
      discountPct,
      clientSaving,
      clientSavingPct,
      minUnit,
      maxDiscountPct,
      installmentValue,
      installments: pay.installments,
      pay
    };

    state.current = current;

    updatePassFeeHint(fee, pay);
    updateInstallmentsHint(pay, current);
    renderDashboard(current);
    renderScenarios(current);
    updateMobileSummary(current);
  }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  function renderEmptyState() {
    els.healthBadge.className = 'health-badge health-neutral';
    els.healthBadge.textContent = 'Aguardando';

    els.kpiClientPrice.textContent = 'R$ 0,00';
    els.heroSubtotal.textContent = 'R$ 0,00';
    els.heroLines.hidden = true;
    els.heroFeeRow.hidden = true;
    els.heroReceivesRow.hidden = true;
    els.heroInstallmentsRow.hidden = true;
    els.lossAlert.hidden = true;

    els.kpiNetProfit.textContent = 'R$ 0,00';
    els.kpiProfitSub.textContent = 'Margem líquida: 0,0%';
    els.kpiReceiveSub.textContent = 'Sobre o custo: 0,0%';
    els.legProfitLabel.textContent = 'Seu lucro líquido';
    setHeroLoss(false);

    els.barCost.style.width = '60%';
    els.barFees.style.width = '0%';
    els.barProfit.style.width = '40%';
    els.barLoss.style.width = '0%';
    els.barProfit.classList.remove('is-loss');
    els.dotProfit.classList.remove('is-loss');

    els.legCost.textContent = 'R$ 0,00';
    els.legFeesWrap.hidden = true;
    els.legProfitName.textContent = 'Lucro';
    els.legProfit.textContent = 'R$ 0,00';

    els.savingNote.textContent = 'Preencha custo e preço de venda para ver o resultado.';

    els.metricCost.textContent = 'R$ 0,00';
    els.metricReceive.textContent = 'R$ 0,00';
    els.metricSaving.textContent = 'R$ 0,00';
    els.metricMarkup.textContent = '0,0%';
    els.metricMargin.textContent = '0,0%';
    els.metricBreakEven.textContent = '—';
    els.metricCost.classList.remove('is-loss');

    els.maxDiscountPill.textContent = 'Limite: —';
    els.maxDiscountPill.className = 'pill pill-accent';
    els.sliderBreakEvenMark.textContent = 'Sem prejuízo: —';

    els.btnAddItem.disabled = true;
    els.btnCopyClient.disabled = true;

    els.scenariosBody.innerHTML =
      '<tr><td colspan="5" class="empty-cell">Preencha os valores base para ver os cenários.</td></tr>';

    updateMobileSummary(null);
  }

  function setHeroLoss(isLoss) {
    const block = els.kpiNetProfit.closest('.hero-profit');
    if (block) block.classList.toggle('is-loss', !!isLoss);
  }

  function renderDashboard(c) {
    const isLoss = c.profit < -0.005;
    const lowMargin = !isLoss && c.marginPct < 10;

    if (isLoss) {
      els.healthBadge.className = 'health-badge health-loss';
      els.healthBadge.textContent = 'Prejuízo';
      els.lossAlert.hidden = false;
      els.lossAlertText.textContent =
        `Com ${formatPct(c.descClientePct, 1)} de desconto você perde ${formatBRL(Math.abs(c.profit))}. ` +
        `Preço mínimo sem prejuízo: ${formatBRL(c.minUnit)}/un.`;
    } else if (lowMargin) {
      els.healthBadge.className = 'health-badge health-warn';
      els.healthBadge.textContent = 'Margem baixa';
      els.lossAlert.hidden = true;
    } else {
      els.healthBadge.className = 'health-badge health-good';
      els.healthBadge.textContent = 'Lucro saudável';
      els.lossAlert.hidden = true;
    }

    // client total
    els.kpiClientPrice.textContent = formatBRL(c.clientTotal);
    els.heroSubtotal.textContent = formatBRL(c.negotiatedTotal);
    els.heroSubtotalRow.hidden = c.fee <= 0.005;
    els.heroLines.hidden = c.fee <= 0.005 && c.installments <= 1;

    if (c.fee > 0.005) {
      els.heroFeeRow.hidden = false;
      els.heroFeeRow.classList.toggle('is-absorbed', !c.pay.passFee);
      const feeLabel = c.pay.feePct > 0.0001
        ? `(${formatPct(c.pay.feePct, 2)})`
        : '(taxa fixa)';
      els.heroFeeLabel.textContent = c.pay.passFee
        ? `Acréscimo da maquininha ${feeLabel}`
        : `Maquininha por sua conta ${feeLabel}`;
      els.heroFee.textContent = (c.pay.passFee ? '+ ' : '− ') + formatBRL(c.fee);

      els.heroReceivesRow.hidden = false;
      els.heroReceives.textContent = formatBRL(c.received);
    } else {
      els.heroFeeRow.hidden = true;
      els.heroReceivesRow.hidden = true;
    }

    if (c.installments > 1) {
      els.heroInstallmentsRow.hidden = false;
      els.heroInstallments.textContent = `${c.installments}x de ${formatBRL(c.installmentValue)}`;
    } else {
      els.heroInstallmentsRow.hidden = true;
    }

    // profit block
    els.kpiNetProfit.textContent = (isLoss ? '− ' : '') + formatBRL(Math.abs(c.profit));
    els.kpiProfitSub.textContent = `Margem líquida: ${formatPct(c.marginPct, 1)}`;
    els.kpiReceiveSub.textContent = `Sobre o custo: ${c.roiPct >= 0 ? '+' : ''}${formatPct(c.roiPct, 1)}`;
    els.legProfitLabel.textContent = isLoss ? 'Prejuízo nesta venda' : 'Seu lucro líquido';
    if (!isLoss && c.profit < 0.005) els.legProfitLabel.textContent = 'Empatado';
    setHeroLoss(isLoss);

    // composition bar
    let denominator = c.clientTotal;
    const costPart = c.costTotal + c.otherTotal;
    const feePart = c.fee > 0.005 ? c.fee : 0;
    let profitPart = Math.max(0, c.profit);
    let lossPart = c.profit < -0.005 ? Math.abs(c.profit) : 0;

    if (lossPart > 0) {
      denominator = costPart + feePart + lossPart;
    }
    if (denominator <= 0) denominator = 1;

    els.barCost.style.width = `${((costPart / denominator) * 100).toFixed(2)}%`;
    els.barFees.style.width = `${((feePart / denominator) * 100).toFixed(2)}%`;
    els.barProfit.style.width = `${((profitPart / denominator) * 100).toFixed(2)}%`;
    els.barLoss.style.width = `${((lossPart / denominator) * 100).toFixed(2)}%`;
    els.barProfit.classList.toggle('is-loss', isLoss);
    els.dotProfit.classList.toggle('is-loss', isLoss);

    els.legCost.textContent = formatBRL(costPart);
    els.legFeesWrap.hidden = feePart <= 0.005;
    els.legFees.textContent = formatBRL(feePart);
    els.legProfitName.textContent = isLoss ? 'Prejuízo' : 'Lucro';
    els.legProfit.textContent = formatBRL(Math.abs(c.profit));

    if (c.clientSaving > 0.005) {
      els.savingNote.textContent =
        `Economia do cliente: ${formatBRL(c.clientSaving)} (${formatPct(c.clientSavingPct, 1)} abaixo da tabela)`;
    } else if (c.clientSaving < -0.005) {
      els.savingNote.textContent =
        `Cliente paga ${formatBRL(Math.abs(c.clientSaving))} acima do preço de tabela — taxa incluída.`;
    } else {
      els.savingNote.textContent = 'Cliente paga exatamente o preço de tabela.';
    }

    // metrics
    const absorbedFee = c.pay.passFee ? 0 : c.fee;
    els.metricCost.textContent = formatBRL(c.invested + absorbedFee);
    els.metricCost.classList.toggle('is-loss', isLoss);
    els.metricReceive.textContent = formatBRL(c.received);
    els.metricSaving.textContent = c.clientSaving > 0.005 ? formatBRL(c.clientSaving) : '—';
    els.metricMarkup.textContent = c.invested > 0 ? formatPct(c.roiPct, 1) : '—';
    els.metricMargin.textContent = formatPct(c.marginPct, 1);
    els.metricMargin.classList.toggle('is-loss', isLoss);
    els.metricBreakEven.textContent = formatBRL(c.minUnit);
    els.metricBreakEven.title =
      `Desconto máximo sem prejuízo: ${formatPct(c.maxDiscountPct, 1)}`;

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
        const isActive = Math.abs(c.descClientePct - pct) < 0.25;
        const isLoss = profit < -0.005;

        return `
          <tr data-scenario-pct="${pct}" class="${isActive ? 'active-row' : ''} ${isLoss ? 'loss-row' : ''}">
            <td><strong>${pct}%</strong></td>
            <td><strong>${formatBRL(clientPays)}</strong></td>
            <td class="col-fee">${fee > 0.005 ? (c.pay.passFee ? '+' : '−') + formatBRL(fee) : '—'}</td>
            <td class="col-profit">${isLoss ? '− ' : ''}${formatBRL(Math.abs(profit))}</td>
            <td>${formatPct(margin, 1)}</td>
          </tr>
        `;
      })
      .join('');
  }

  function updatePassFeeHint(fee, pay) {
    const card = els.passFee.closest('.switch-card');
    if (card) card.classList.toggle('is-off', !els.passFee.checked);

    if (!pay || fee <= 0.005) {
      els.passFeeHint.textContent = els.passFee.checked
        ? 'Sem taxa nesta forma de pagamento.'
        : 'Você recebe o valor combinado, sem desconto de taxa.';
      return;
    }

    if (pay.passFee) {
      els.passFeeHint.textContent =
        `O cliente paga ${formatBRL(fee)} a mais e você recebe o valor combinado.`;
    } else {
      els.passFeeHint.textContent =
        `Você absorve ${formatBRL(fee)} de taxa — sai do seu lucro.`;
    }
  }

  function updateMobileSummary(c) {
    if (!c) {
      els.mobileSummary.hidden = true;
      return;
    }
    els.mobileSummary.hidden = false;
    els.mobileSummaryValue.textContent = formatBRL(c.clientTotal);
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
    els.feePct.value = fee ? formatNumberInput(fee, 2) : '';

    syncPaymentUI();
    recalculate();
    scheduleSave();
  }

  function selectInstallments(count) {
    state.method = 'credito';
    state.installments = clampInt(count, 1, MAX_INSTALLMENTS);
    els.feePct.value = formatNumberInput(suggestedCreditFee(state.installments), 2);

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
        return `<button type="button" class="chip chip-installment" data-installments="${n}" aria-pressed="false">${n}x</button>`;
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

  function updateInstallmentsHint(pay, calc) {
    if (!els.installmentsHint) return;
    if (!pay || state.method !== 'credito') {
      els.installmentsHint.textContent = '';
      return;
    }

    const feeText = `taxa da maquininha: ${formatPct(pay.feePct, 2)}`;
    if (pay.installments <= 1) {
      els.installmentsHint.textContent = `À vista no crédito · ${feeText}.`;
    } else if (calc && calc.clientTotal > 0) {
      els.installmentsHint.textContent =
        `${pay.installments}x de ${formatBRL(calc.clientTotal / pay.installments)} · ${feeText}.`;
    } else {
      els.installmentsHint.textContent = `${pay.installments} parcelas · ${feeText}.`;
    }
  }

  function syncPaymentUI() {
    document.querySelectorAll('[data-method]').forEach((btn) => {
      const isActive = btn.getAttribute('data-method') === state.method;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    els.installmentsField.hidden = state.method !== 'credito';
    updateInstallmentChips();
  }

  /* ------------------------------------------------------------------ *
   * Order simulator
   * ------------------------------------------------------------------ */

  function loadItems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE.order) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORE.order, JSON.stringify(state.items));
    } catch (_) {
      /* storage unavailable */
    }
  }

  function renderOrder() {
    const count = state.items.length;
    const hasItems = count > 0;
    const totalQty = state.items.reduce((sum, item) => sum + item.qty, 0);

    els.orderSection.classList.toggle('has-items', hasItems);
    els.orderEmpty.hidden = hasItems;
    els.orderTableWrap.hidden = !hasItems;
    els.orderCount.textContent = String(count);
    els.tabOrderBadge.hidden = !hasItems;
    els.tabOrderBadge.textContent = String(count);

    if (!hasItems) {
      els.orderBody.innerHTML = '';
      els.orderTotalQty.textContent = '0';
      els.orderTotalClient.textContent = formatBRL(0);
      els.orderTotalProfit.textContent = formatBRL(0);
      els.orderFeeNote.hidden = true;
      return;
    }

    let totalClient = 0;
    let totalProfit = 0;
    let totalFee = 0;

    els.orderBody.innerHTML = state.items
      .map((item, index) => {
        totalClient += item.clientTotal;
        totalProfit += item.profit;
        if (item.passFee) totalFee += item.fee;

        const loss = item.profit < -0.005;
        const sub = [
          `${item.qty}× ${formatBRL(item.unitPrice)}`,
          item.descPct > 0.01 ? `${formatPct(item.descPct, 1)} off` : null,
          item.installments > 1
            ? `${item.installments}x de ${formatBRL(item.clientTotal / item.installments)}`
            : null
        ].filter(Boolean).join(' · ');

        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name)}</strong>
              <span class="order-sub">${sub}</span>
            </td>
            <td class="col-qty">${item.qty}</td>
            <td class="cell-client">${formatBRL(item.clientTotal)}</td>
            <td class="cell-profit ${loss ? 'is-loss' : ''}">${loss ? '− ' : ''}${formatBRL(Math.abs(item.profit))}</td>
            <td>
              <button type="button" class="remove-btn" data-remove-index="${index}" aria-label="Remover ${escapeHtml(item.name)}">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    els.orderTotalQty.textContent = String(totalQty);
    els.orderTotalClient.textContent = formatBRL(totalClient);
    els.orderTotalProfit.textContent = (totalProfit < 0 ? '− ' : '') + formatBRL(Math.abs(totalProfit));
    els.orderTotalProfit.classList.toggle('is-loss', totalProfit < 0);

    if (totalFee > 0.005) {
      els.orderFeeNote.hidden = false;
      els.orderFeeNote.textContent = `Taxa da maquininha repassada ao cliente, já incluída nos valores: ${formatBRL(totalFee)}.`;
    } else {
      els.orderFeeNote.hidden = true;
    }
  }

  function addCurrentToOrder() {
    const c = state.current;
    if (!c) return;

    const name = c.productNameRaw || `Item #${state.items.length + 1}`;

    state.items.push({
      name,
      qty: c.qty,
      unitPrice: c.negotiatedUnit,
      descPct: c.descClientePct,
      fee: c.fee,
      passFee: c.pay.passFee,
      installments: c.installments,
      clientTotal: c.clientTotal,
      catalogTotal: c.catalogTotal,
      saving: Math.max(0, c.discountTotal),
      cost: c.invested,
      profit: c.profit
    });

    saveItems();
    renderOrder();
    showToast(`"${name}" adicionado ao pedido.`);
  }

  /* ------------------------------------------------------------------ *
   * Clipboard
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

    const lines = ['ORÇAMENTO DE VENDA', ''];

    if (c.productNameRaw) {
      lines.push(`${c.productNameRaw}${c.qty > 1 ? ` (${c.qty} un.)` : ''}`);
    } else if (c.qty > 1) {
      lines.push(`${c.qty} unidades`);
    } else {
      lines.push('Produto');
    }

    lines.push('------------------------------');
    lines.push(`Subtotal: ${formatBRL(c.negotiatedTotal)}`);

    if (c.descClientePct > 0.01) {
      lines.push(`Desconto (${formatPct(c.descClientePct, 1)}): −${formatBRL(c.discountTotal)}`);
      lines.push(`De ${formatBRL(c.catalogTotal)} por ${formatBRL(c.negotiatedTotal)}`);
    }

    if (c.fee > 0.005 && c.pay.passFee) {
      const feeLabel = c.pay.feePct > 0 ? ` (${formatPct(c.pay.feePct, 2)})` : '';
      lines.push(`Acréscimo da maquininha${feeLabel}: +${formatBRL(c.fee)}`);
    }

    lines.push(`TOTAL: ${formatBRL(c.clientTotal)}`);

    if (c.installments > 1) {
      lines.push(`ou ${c.installments}x de ${formatBRL(c.installmentValue)} no cartão`);
    }

    if (c.fee > 0.005 && c.pay.passFee) {
      lines.push('');
      lines.push('Taxa da maquininha já incluída no total.');
    }

    return lines.join('\n');
  }

  function buildOrderQuote() {
    if (state.items.length === 0) return '';

    let totalClient = 0;
    let totalSaving = 0;
    let totalFee = 0;

    const lines = ['ORÇAMENTO DE PEDIDO', '------------------------------'];

    state.items.forEach((item) => {
      totalClient += item.clientTotal;
      if (item.passFee) totalFee += item.fee;
      totalSaving += Number.isFinite(item.saving) ? item.saving : 0;

      const qtyLabel = item.qty > 1 ? ` (${item.qty} un.)` : '';
      lines.push(`• ${item.name}${qtyLabel} — ${formatBRL(item.clientTotal)}`);

      if (item.descPct > 0.01) {
        lines.push(`   ${formatPct(item.descPct, 1)} de desconto aplicado`);
      }
    });

    lines.push('------------------------------');
    if (totalSaving > 0.01) {
      lines.push(`Economia total: ${formatBRL(totalSaving)}`);
    }
    if (totalFee > 0.01) {
      lines.push(`Taxa da maquininha incluída: ${formatBRL(totalFee)}`);
    }
    lines.push(`TOTAL A PAGAR: ${formatBRL(totalClient)}`);

    const installmentsList = state.items.map((item) => item.installments || 1);
    const uniformInstallments = installmentsList.every((n) => n === installmentsList[0])
      ? installmentsList[0]
      : 0;
    if (uniformInstallments > 1) {
      lines.push(`ou ${uniformInstallments}x de ${formatBRL(totalClient / uniformInstallments)} no cartão`);
    }

    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Example / reset
   * ------------------------------------------------------------------ */

  function loadExample() {
    els.productName.value = 'Kit hidratante + body splash';
    els.quantity.value = '1';
    els.vendaBase.value = '150,00';
    els.descCompra.value = '30';
    els.precoCompra.value = '';
    els.descCliente.value = '10';
    els.precoFinalCliente.value = '';
    els.otherCostUnit.value = '';
    els.sliderDescCliente.value = '0';

    state.history = ['vendaBase', 'descCompra'];
    state.calculated = null;
    state.clientMode = 'pct';
    state.method = 'credito';
    state.installments = 3;
    els.feePct.value = formatNumberInput(suggestedCreditFee(3), 2);
    els.feeFixed.value = '';
    els.passFee.checked = true;

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
    els.otherCostUnit.value = '';
    els.feeFixed.value = '';
    els.feePct.value = '';
    els.passFee.checked = true;
    els.calcModeHint.textContent = 'Preencha 2 campos';

    state.history = [];
    state.calculated = null;
    state.clientMode = 'pct';
    state.method = 'pix';
    state.installments = 1;

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
          feePct: els.feePct.value,
          feeFixed: els.feeFixed.value,
          otherCostUnit: els.otherCostUnit.value
        },
        history: state.history,
        calculated: state.calculated,
        clientMode: state.clientMode,
        method: state.method,
        installments: state.installments,
        passFee: els.passFee.checked
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
    assign(els.feePct, f.feePct);
    assign(els.feeFixed, f.feeFixed);
    assign(els.otherCostUnit, f.otherCostUnit);

    if (['pix', 'debito', 'credito', 'parcelado'].includes(saved.method)) {
      state.method = saved.method === 'parcelado' ? 'credito' : saved.method;
    }

    const savedInstallments = clampInt(
      saved.installments !== undefined ? saved.installments : f.installments,
      1,
      MAX_INSTALLMENTS
    );
    state.installments = state.method === 'credito' ? savedInstallments : 1;

    state.clientMode = saved.clientMode === 'finalPrice' ? 'finalPrice' : 'pct';
    els.passFee.checked = saved.passFee !== false;

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
      els.metaThemeColor.setAttribute('content', isDark ? '#0F1622' : '#FFFFFF');
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
    const theme = saved || (prefersDark && prefersDark.matches ? 'dark' : 'light');
    applyTheme(theme, false);
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark', true);
  }

  /* ------------------------------------------------------------------ *
   * Mobile tabs
   * ------------------------------------------------------------------ */

  function setView(view, shouldScroll) {
    const allowed = ['calc', 'result', 'order'];
    const target = allowed.includes(view) ? view : 'calc';
    document.body.setAttribute('data-view', target);

    document.querySelectorAll('.tab[data-view]').forEach((tab) => {
      const active = tab.getAttribute('data-view') === target;
      tab.classList.toggle('active', active);
      if (active) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    if (shouldScroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ------------------------------------------------------------------ *
   * PWA: install + service worker
   * ------------------------------------------------------------------ */

  const isStandalone = () => {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  };

  const isIOS = () => {
    const ua = window.navigator.userAgent || '';
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
    );
  };

  function installSheetContent() {
    const ua = window.navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

    if (isIOS()) {
      return `
        <ol>
          <li>Abra o Margix no <strong>Safari</strong>.</li>
          <li>Toque no botão <strong>Compartilhar</strong> (quadrado com a seta para cima).</li>
          <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Toque em <strong>Adicionar</strong>. Pronto: o Margix vira um app no seu celular.</li>
        </ol>
        <p class="sheet-note">No iPhone, a instalação precisa ser feita pelo Safari. O app abre em tela cheia e funciona offline.</p>
      `;
    }

    if (isAndroid) {
      return `
        <ol>
          <li>Toque no menu do navegador (<strong>⋮</strong> no canto superior).</li>
          <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
          <li>Confirme. O Margix abre em tela cheia e funciona offline.</li>
        </ol>
        <p class="sheet-note">No Chrome, também aparece um botão de instalação na barra de endereço.</p>
      `;
    }

    if (isMobile) {
      return `
        <ol>
          <li>Abra o menu do navegador.</li>
          <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
          <li>Confirme. O Margix abre em tela cheia e funciona offline.</li>
        </ol>
      `;
    }

    return `
      <ol>
        <li>No <strong>Chrome</strong> ou <strong>Edge</strong>, procure o ícone de instalação na barra de endereço (à direita da URL).</li>
        <li>Clique em <strong>Instalar</strong> e confirme.</li>
        <li>O Margix abre em uma janela própria e funciona offline.</li>
      </ol>
      <p class="sheet-note">Para levar para o celular, abra este site no navegador do aparelho e use “Adicionar à tela inicial”.</p>
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
          .catch(() => {
            /* offline support unavailable */
          });
      });
    }

    // Always offer the install affordance until the app is installed.
    const installed = isStandalone();
    els.btnInstall.hidden = installed;
    els.btnInstallFooter.hidden = installed;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
      els.btnInstall.hidden = false;
      els.btnInstall.dataset.mode = 'prompt';
    });

    window.addEventListener('appinstalled', () => {
      state.deferredPrompt = null;
      els.btnInstall.hidden = true;
      els.btnInstallFooter.hidden = true;
      showToast('Margix instalado no seu celular!');
      scheduleSave();
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
          els.btnInstallFooter.hidden = true;
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

    els.productName.addEventListener('input', scheduleSave);
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

    els.methodGrid.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-method]');
      if (!btn) return;
      applyMethod(btn.getAttribute('data-method'));
    });

    els.installmentsChips.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-installments]');
      if (!btn) return;
      selectInstallments(parseInt(btn.getAttribute('data-installments'), 10));
    });

    els.feePct.addEventListener('input', recalculate);

    els.feePct.addEventListener('blur', () => {
      const value = parseDecimal(els.feePct.value);
      if (!Number.isFinite(value)) return;
      const clamped = clamp(value, 0, MAX_FEE_PCT);
      if (clamped !== value) {
        els.feePct.value = formatNumberInput(clamped, 2);
        recalculate();
        showToast(`Taxa limitada a ${formatPct(MAX_FEE_PCT, 0)}.`);
      }
    });

    els.feeFixed.addEventListener('blur', () => {
      const value = parseDecimal(els.feeFixed.value);
      if (!Number.isFinite(value)) return;
      const clamped = clamp(value, 0, MAX_FEE_FIXED);
      if (clamped !== value) {
        els.feeFixed.value = formatNumberInput(clamped, 2);
        recalculate();
      }
    });

    els.quantity.addEventListener('blur', () => {
      const qty = clampInt(els.quantity.value, 1, MAX_QTY);
      if (String(qty) !== els.quantity.value) {
        els.quantity.value = String(qty);
        recalculate();
      }
    });

    els.feeFixed.addEventListener('input', recalculate);

    els.passFee.addEventListener('change', recalculate);

    els.otherCostUnit.addEventListener('input', recalculate);

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
      if (quote) copyText(quote, 'Resumo do cliente copiado.');
    });

    els.orderBody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-remove-index]');
      if (!btn) return;
      const index = parseInt(btn.getAttribute('data-remove-index'), 10);
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
      showToast('Pedido limpo.');
    });

    els.btnCopyOrderQuote.addEventListener('click', () => {
      const quote = buildOrderQuote();
      if (quote) copyText(quote, 'Orçamento copiado para enviar ao cliente.');
    });

    els.btnExample.addEventListener('click', () => {
      loadExample();
      setView('calc', false);
      showToast('Exemplo carregado.');
    });

    els.btnClear.addEventListener('click', clearAll);
    els.btnTheme.addEventListener('click', toggleTheme);

    els.btnInstall.addEventListener('click', handleInstallClick);
    els.btnInstallFooter.addEventListener('click', handleInstallClick);
    els.installSheetClose.addEventListener('click', () => els.installSheet.close());
    els.installSheet.addEventListener('click', (event) => {
      if (event.target === els.installSheet) els.installSheet.close();
    });

    document.querySelectorAll('.tab[data-view], [data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setView(btn.getAttribute('data-view') || btn.getAttribute('data-goto'));
      });
    });

    // persistence (debounced) for form fields
    ['input', 'change'].forEach((evt) => {
      document
        .querySelectorAll(
          '#productName, #quantity, #vendaBase, #descCompra, #precoCompra, #descCliente, #precoFinalCliente, #feePct, #feeFixed, #otherCostUnit, #passFee'
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
    setView('calc', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
