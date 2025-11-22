(function(){
  'use strict';
  // Global namespace
  window.App = window.App || {};

  // Storage with namespacing and safe JSON handling
  window.App.Storage = (function(){
    const KEY = 'tripsum-data-v1';
    function load(){
      try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data && typeof data === 'object' ? data : null;
      } catch (e) {
        console.error('Storage load error', e);
        return null;
      }
    }
    function save(data){
      try {
        window.localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        console.error('Storage save error', e);
      }
    }
    function clear(){
      try { window.localStorage.removeItem(KEY); } catch(e){ console.error('Storage clear error', e); }
    }
    return { load, save, clear, KEY };
  })();

  // Utilities
  window.App.Util = (function(){
    function uid(prefix){
      return (prefix || 'id_') + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(4);
    }
    function formatMoney(value, currency){
      const v = Number(value || 0);
      const c = currency || 'USD';
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(v);
      } catch(e) {
        return (c + ' ' + v.toFixed(2));
      }
    }
    function parseNumber(x){
      if (typeof x === 'number') return isFinite(x) ? x : 0;
      if (typeof x === 'string') {
        const cleaned = x.replace(/[^0-9.\-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : n;
      }
      return 0;
    }
    function today(){
      const d = new Date();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${d.getFullYear()}-${m}-${day}`;
    }
    return { uid, formatMoney, parseNumber, today };
  })();

  // Currency conversion anchored to USD
  window.App.Currency = (function(){
    const list = [
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: 'Euro' },
      { code: 'GBP', name: 'British Pound' },
      { code: 'JPY', name: 'Japanese Yen' },
      { code: 'CAD', name: 'Canadian Dollar' },
      { code: 'AUD', name: 'Australian Dollar' },
      { code: 'NZD', name: 'New Zealand Dollar' },
      { code: 'CHF', name: 'Swiss Franc' },
      { code: 'SEK', name: 'Swedish Krona' },
      { code: 'NOK', name: 'Norwegian Krone' },
      { code: 'DKK', name: 'Danish Krone' },
      { code: 'PLN', name: 'Polish Zloty' },
      { code: 'CZK', name: 'Czech Koruna' },
      { code: 'HUF', name: 'Hungarian Forint' },
      { code: 'MXN', name: 'Mexican Peso' },
      { code: 'BRL', name: 'Brazilian Real' },
      { code: 'ARS', name: 'Argentine Peso' },
      { code: 'CLP', name: 'Chilean Peso' },
      { code: 'CNY', name: 'Chinese Yuan' },
      { code: 'HKD', name: 'Hong Kong Dollar' },
      { code: 'SGD', name: 'Singapore Dollar' },
      { code: 'INR', name: 'Indian Rupee' },
      { code: 'IDR', name: 'Indonesian Rupiah' },
      { code: 'KRW', name: 'South Korean Won' },
      { code: 'TRY', name: 'Turkish Lira' },
      { code: 'ZAR', name: 'South African Rand' },
      { code: 'NGN', name: 'Nigerian Naira' }
    ];

    // Default approximate mapping: 1 unit equals USD
    const defaultFxToUSD = {
      USD: 1,
      EUR: 1.08,
      GBP: 1.27,
      JPY: 0.0067,
      CAD: 0.73,
      AUD: 0.66,
      NZD: 0.61,
      CHF: 1.10,
      SEK: 0.095,
      NOK: 0.092,
      DKK: 0.145,
      PLN: 0.25,
      CZK: 0.044,
      HUF: 0.0028,
      MXN: 0.056,
      BRL: 0.18,
      ARS: 0.0011,
      CLP: 0.0011,
      CNY: 0.14,
      HKD: 0.128,
      SGD: 0.74,
      INR: 0.012,
      IDR: 0.000064,
      KRW: 0.00074,
      TRY: 0.031,
      ZAR: 0.055,
      NGN: 0.00075
    };

    function getRateToUSD(code, fxToUSD){
      const map = fxToUSD || defaultFxToUSD;
      return typeof map[code] === 'number' && map[code] > 0 ? map[code] : null;
    }

    function convert(amount, from, to, fxToUSD){
      const amt = window.App.Util.parseNumber(amount);
      if (!from || !to) return amt;
      const map = fxToUSD || defaultFxToUSD;
      const fromRate = getRateToUSD(from, map);
      const toRate = getRateToUSD(to, map);
      if (!fromRate || !toRate) return amt;
      const inUSD = amt * fromRate;
      const result = inUSD / toRate;
      return result;
    }

    // Try to fetch fresh rates from public API (no key). Returns fxToUSD mapping.
    function fetchLatest(){
      // Open ER latest USD
      const url = 'https://open.er-api.com/v6/latest/USD';
      return new Promise(function(resolve){
        try {
          $.getJSON(url).done(function(resp){
            if (resp && resp.result === 'success' && resp.rates) {
              const out = {};
              Object.keys(resp.rates).forEach(function(code){
                // resp.rates[code] is 1 USD equals X code; we need 1 code equals USD
                const perCodeToUSD = 1 / resp.rates[code];
                if (isFinite(perCodeToUSD)) out[code] = perCodeToUSD;
              });
              // Ensure USD exists
              out.USD = 1;
              resolve(out);
            } else {
              resolve(null);
            }
          }).fail(function(){ resolve(null); });
        } catch(e){ resolve(null); }
      });
    }

    function ensureCodes(map){
      const m = Object.assign({}, map || {});
      list.forEach(function(c){ if (typeof m[c.code] !== 'number') m[c.code] = defaultFxToUSD[c.code] || null; });
      m.USD = 1;
      return m;
    }

    return { list, defaultFxToUSD, getRateToUSD, convert, fetchLatest, ensureCodes };
  })();

  // Model: state and operations
  window.App.Model = (function(){
    const defaults = {
      baseCurrency: 'USD',
      fxToUSD: window.App.Currency.ensureCodes(window.App.Currency.defaultFxToUSD),
      categories: [
        { id: window.App.Util.uid('cat_'), name: 'Transport', color: '#0FA3B1' },
        { id: window.App.Util.uid('cat_'), name: 'Lodging', color: '#3D5A80' },
        { id: window.App.Util.uid('cat_'), name: 'Food', color: '#F25F5C' },
        { id: window.App.Util.uid('cat_'), name: 'Activities', color: '#9B5DE5' },
        { id: window.App.Util.uid('cat_'), name: 'Misc', color: '#00A676' }
      ],
      items: []
    };

    let state = null;

    function init(){
      const saved = window.App.Storage.load();
      if (saved && typeof saved === 'object') {
        state = Object.assign({}, defaults, saved);
        state.fxToUSD = window.App.Currency.ensureCodes(state.fxToUSD);
      } else {
        state = JSON.parse(JSON.stringify(defaults));
        persist();
      }
      return state;
    }

    function getState(){ return state || init(); }
    function setState(partial){ state = Object.assign({}, getState(), partial); persist(); return state; }
    function persist(){ window.App.Storage.save(state); }

    // Category operations
    function addCategory(name, color){
      const s = getState();
      const trimmed = String(name || '').trim();
      if (!trimmed) return { ok: false, error: 'Name required' };
      if (s.categories.some(function(c){ return c.name.toLowerCase() === trimmed.toLowerCase(); })) {
        return { ok: false, error: 'Category exists' };
      }
      const cat = { id: window.App.Util.uid('cat_'), name: trimmed, color: color || '#0FA3B1' };
      s.categories.push(cat);
      persist();
      return { ok: true, category: cat };
    }

    function deleteCategory(id){
      const s = getState();
      const used = s.items.some(function(it){ return it.categoryId === id; });
      if (used) return { ok: false, error: 'Category in use' };
      const before = s.categories.length;
      s.categories = s.categories.filter(function(c){ return c.id !== id; });
      persist();
      return { ok: s.categories.length !== before };
    }

    // Item operations
    function addItem(payload){
      const s = getState();
      const amt = window.App.Util.parseNumber(payload.amount);
      if (!payload.desc || !payload.categoryId || !payload.currency || !(amt > 0)) return { ok: false, error: 'Invalid input' };
      const item = {
        id: window.App.Util.uid('itm_'),
        desc: String(payload.desc).trim(),
        categoryId: payload.categoryId,
        amount: amt,
        currency: payload.currency,
        date: payload.date || window.App.Util.today(),
        note: payload.note || ''
      };
      s.items.unshift(item);
      persist();
      return { ok: true, item };
    }

    function updateItem(id, updates){
      const s = getState();
      const idx = s.items.findIndex(function(i){ return i.id === id; });
      if (idx === -1) return { ok: false };
      const current = s.items[idx];
      const merged = Object.assign({}, current, updates || {});
      merged.amount = window.App.Util.parseNumber(merged.amount);
      if (!(merged.amount > 0)) return { ok: false, error: 'Amount must be positive' };
      s.items[idx] = merged;
      persist();
      return { ok: true, item: merged };
    }

    function deleteItem(id){
      const s = getState();
      const before = s.items.length;
      s.items = s.items.filter(function(i){ return i.id !== id; });
      persist();
      return { ok: s.items.length !== before };
    }

    // Currency operations
    function setBaseCurrency(code){
      const s = getState();
      s.baseCurrency = code;
      persist();
      return s.baseCurrency;
    }

    function setFxRate(code, perUnitToUSD){
      const s = getState();
      const v = window.App.Util.parseNumber(perUnitToUSD);
      if (!(v > 0)) return { ok: false };
      s.fxToUSD[code] = v;
      persist();
      return { ok: true };
    }

    function replaceFxMap(newMap){
      const s = getState();
      s.fxToUSD = window.App.Currency.ensureCodes(newMap || {});
      persist();
      return s.fxToUSD;
    }

    // Totals
    function getCategoryTotals(){
      const s = getState();
      const map = {};
      s.categories.forEach(function(c){ map[c.id] = 0; });
      s.items.forEach(function(it){
        const base = s.baseCurrency;
        const val = window.App.Currency.convert(it.amount, it.currency, base, s.fxToUSD);
        if (!isFinite(val)) return;
        if (map[it.categoryId] == null) map[it.categoryId] = 0;
        map[it.categoryId] += val;
      });
      return map;
    }

    function getGrandTotal(){
      const s = getState();
      let sum = 0;
      s.items.forEach(function(it){
        const base = s.baseCurrency;
        const val = window.App.Currency.convert(it.amount, it.currency, base, s.fxToUSD);
        if (isFinite(val)) sum += val;
      });
      return sum;
    }

    // Import/export
    function exportJSON(){ return JSON.stringify(getState(), null, 2); }
    function importJSON(jsonStr){
      try {
        const data = JSON.parse(jsonStr);
        if (!data || typeof data !== 'object') return { ok: false };
        // Basic sanity
        if (!data.fxToUSD || !data.categories || !data.items) return { ok: false };
        data.fxToUSD = window.App.Currency.ensureCodes(data.fxToUSD);
        state = Object.assign({}, getState(), data);
        persist();
        return { ok: true };
      } catch(e){ return { ok: false, error: e && e.message ? e.message : 'Invalid JSON' }; }
    }

    function reset(){
      state = JSON.parse(JSON.stringify(defaults));
      persist();
      return state;
    }

    return {
      init,
      getState,
      setState,
      addCategory,
      deleteCategory,
      addItem,
      updateItem,
      deleteItem,
      setBaseCurrency,
      setFxRate,
      replaceFxMap,
      getCategoryTotals,
      getGrandTotal,
      exportJSON,
      importJSON,
      reset
    };
  })();
})();
