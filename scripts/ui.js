(function(){
  'use strict';
  window.App = window.App || {};

  // Render helpers specific to UI
  function renderCurrencyOptions($select){
    const st = window.App.Model.getState();
    const list = window.App.Currency.list;
    $select.empty();
    list.forEach(function(c){
      const opt = $(`<option value="${c.code}">${c.code} — ${c.name}</option>`);
      $select.append(opt);
    });
    $select.val(st.baseCurrency);
  }

  function renderBaseCurrency(){
    const st = window.App.Model.getState();
    $('#baseCurrency').val(st.baseCurrency);
  }

  function renderRates(){
    const st = window.App.Model.getState();
    const $tbody = $('#ratesTableBody');
    $tbody.empty();
    const list = window.App.Currency.list;
    list.forEach(function(c){
      const rate = st.fxToUSD[c.code] != null ? st.fxToUSD[c.code] : '';
      const row = $(`
        <tr>
          <td class="py-2 px-2 font-medium">${c.code} <span class="text-[#24324a]/60 text-xs">${c.name}</span></td>
          <td class="py-2 px-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-[#24324a]/60">1 ${c.code} =</span>
              <input type="number" step="0.000001" min="0" class="input w-40" value="${rate}">
              <span class="text-xs text-[#24324a]/60">USD</span>
            </div>
          </td>
          <td class="py-2 px-2">
            <button class="btn-ghost save-rate" aria-label="Save ${c.code}">Save</button>
          </td>
        </tr>
      `);
      row.find('button.save-rate').on('click', function(){
        const v = row.find('input').val();
        const ok = window.App.Model.setFxRate(c.code, v).ok;
        if (!ok) {
          alert('Enter a positive number.');
          return;
        }
        window.App.render();
        $(this).closest('tr').css({ background: 'rgba(15,163,177,0.05)' }).animate({ backgroundColor: 'transparent' }, 600);
      });
      $tbody.append(row);
    });
  }

  function renderCategories(){
    const st = window.App.Model.getState();
    const $list = $('#categoriesList');
    $list.empty();
    const totals = window.App.Model.getCategoryTotals();
    st.categories.forEach(function(cat){
      const amount = totals[cat.id] || 0;
      const $pill = $(`
        <div class="category-pill" data-id="${cat.id}">
          <span class="category-dot" style="background:${cat.color}"></span>
          <span class="font-medium">${cat.name}</span>
          <span class="text-xs text-[#24324a]/70">${window.App.Util.formatMoney(amount, st.baseCurrency)}</span>
          <button class="btn-ghost delete-cat" title="Delete">✕</button>
        </div>
      `);
      $pill.find('button.delete-cat').on('click', function(){
        const res = window.App.Model.deleteCategory(cat.id);
        if (!res.ok) {
          alert('Cannot delete a category that has items. Delete items first.');
          return;
        }
        window.App.render();
      });
      $list.append($pill.hide().fadeIn(200));
    });

    // Category select in form
    const $sel = $('#category');
    $sel.empty();
    st.categories.forEach(function(cat){
      $sel.append(`<option value="${cat.id}">${cat.name}</option>`);
    });
  }

  function renderItems(){
    const st = window.App.Model.getState();
    const $tbody = $('#itemsTableBody');
    $tbody.empty();
    const base = st.baseCurrency;
    st.items.forEach(function(it){
      const converted = window.App.Currency.convert(it.amount, it.currency, base, st.fxToUSD);
      const cat = st.categories.find(function(c){ return c.id === it.categoryId; });
      const $row = $(`
        <tr data-id="${it.id}">
          <td class="py-2 px-2 whitespace-nowrap">${it.date || ''}</td>
          <td class="py-2 px-2">
            <div class="font-medium">${it.desc}</div>
            ${it.note ? `<div class="text-xs text-[#24324a]/70">${it.note}</div>` : ''}
          </td>
          <td class="py-2 px-2 whitespace-nowrap">
            <span class="chip"><span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${cat ? cat.color : '#ccc'}"></span>${cat ? cat.name : 'Unknown'}</span>
          </td>
          <td class="py-2 px-2 whitespace-nowrap">${window.App.Util.formatMoney(it.amount, it.currency)}</td>
          <td class="py-2 px-2 whitespace-nowrap font-semibold">${window.App.Util.formatMoney(converted, base)}</td>
          <td class="py-2 px-2 text-right whitespace-nowrap">
            <button class="btn-ghost edit">Edit</button>
            <button class="btn-ghost delete">Delete</button>
          </td>
        </tr>
      `);
      $row.find('button.delete').on('click', function(){
        if (!confirm('Delete this item?')) return;
        window.App.Model.deleteItem(it.id);
        window.App.render();
      });
      $row.find('button.edit').on('click', function(){
        openEditDialog(it);
      });
      $tbody.append($row);
    });
    $('#itemsCount').text(st.items.length);
  }

  function renderSummary(){
    const st = window.App.Model.getState();
    const base = st.baseCurrency;
    const total = window.App.Model.getGrandTotal();
    $('#summaryTotal').text(window.App.Util.formatMoney(total, base));

    const $list = $('#summaryByCategory');
    $list.empty();
    const totals = window.App.Model.getCategoryTotals();
    st.categories.forEach(function(cat){
      const val = totals[cat.id] || 0;
      const $row = $(`
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${cat.color}"></span>
            <span class="text-sm">${cat.name}</span>
          </div>
          <div class="text-sm font-semibold">${window.App.Util.formatMoney(val, base)}</div>
        </div>
      `);
      $list.append($row);
    });
  }

  function openEditDialog(item){
    const st = window.App.Model.getState();
    const $backdrop = $('<div class="modal-backdrop" role="dialog" aria-modal="true"></div>');
    const $modal = $(`
      <div class="modal">
        <h3 class="text-lg font-extrabold mb-3" style="font-family: 'Merriweather', Georgia, serif;">Edit item</h3>
        <form class="space-y-3">
          <div>
            <label class="label">Description</label>
            <input type="text" class="input" id="eDesc" value="${item.desc}">
          </div>
          <div class="flex gap-2">
            <div class="flex-1">
              <label class="label">Amount</label>
              <input type="number" step="0.01" min="0" class="input" id="eAmount" value="${item.amount}">
            </div>
            <div class="w-40">
              <label class="label">Currency</label>
              <select class="select" id="eCurrency"></select>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="flex-1">
              <label class="label">Category</label>
              <select class="select" id="eCategory"></select>
            </div>
            <div class="w-44">
              <label class="label">Date</label>
              <input type="date" class="input" id="eDate" value="${item.date}">
            </div>
          </div>
          <div>
            <label class="label">Note</label>
            <input type="text" class="input" id="eNote" value="${item.note || ''}">
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button class="btn-ghost" type="button" id="eCancel">Cancel</button>
            <button class="btn-primary" type="submit">Save changes</button>
          </div>
        </form>
      </div>
    `);

    // Populate selects
    const $cur = $modal.find('#eCurrency');
    window.App.Currency.list.forEach(function(c){ $cur.append(`<option value="${c.code}">${c.code}</option>`); });
    $cur.val(item.currency);
    const $cat = $modal.find('#eCategory');
    st.categories.forEach(function(c){ $cat.append(`<option value="${c.id}">${c.name}</option>`); });
    $cat.val(item.categoryId);

    $backdrop.append($modal);
    $('body').append($backdrop);
    $backdrop.fadeIn(150);

    $modal.find('#eCancel').on('click', function(){
      $backdrop.fadeOut(150, function(){ $backdrop.remove(); });
    });
    $backdrop.on('click', function(e){ if (e.target === $backdrop[0]) { $modal.find('#eCancel').trigger('click'); } });

    $modal.find('form').on('submit', function(e){
      e.preventDefault();
      const upd = {
        desc: String($modal.find('#eDesc').val() || '').trim(),
        amount: window.App.Util.parseNumber($modal.find('#eAmount').val()),
        currency: String($modal.find('#eCurrency').val()),
        categoryId: String($modal.find('#eCategory').val()),
        date: String($modal.find('#eDate').val()),
        note: String($modal.find('#eNote').val() || '')
      };
      if (!upd.desc || !(upd.amount > 0)) { alert('Please enter a description and a positive amount.'); return; }
      const res = window.App.Model.updateItem(item.id, upd);
      if (!res.ok) { alert('Update failed.'); return; }
      window.App.render();
      $backdrop.fadeOut(150, function(){ $backdrop.remove(); });
    });
  }

  // Event bindings
  function bindEvents(){
    // Base currency change
    $(document).on('change', '#baseCurrency', function(){
      const code = $(this).val();
      window.App.Model.setBaseCurrency(code);
      window.App.render();
    });

    // Fetch latest rates
    $('#fetchRatesBtn').on('click', async function(){
      const $btn = $(this);
      $btn.prop('disabled', true).addClass('opacity-70').text('Updating...');
      const map = await window.App.Currency.fetchLatest();
      if (map) {
        window.App.Model.replaceFxMap(map);
        window.App.render();
      } else {
        alert('Could not update rates. You can edit them manually.');
      }
      $btn.prop('disabled', false).removeClass('opacity-70').text('Update rates');
    });

    // Add category
    $('#categoryForm').on('submit', function(e){
      e.preventDefault();
      const name = String($('#newCategoryName').val() || '').trim();
      const color = String($('#newCategoryColor').val());
      const res = window.App.Model.addCategory(name, color);
      if (!res.ok) { alert(res.error || 'Could not add'); return; }
      $('#newCategoryName').val('');
      window.App.render();
    });

    // Add expense item
    $('#expenseForm').on('submit', function(e){
      e.preventDefault();
      const payload = {
        desc: $('#desc').val(),
        categoryId: $('#category').val(),
        amount: $('#amount').val(),
        currency: $('#currency').val(),
        date: $('#date').val(),
        note: $('#note').val()
      };
      const res = window.App.Model.addItem(payload);
      if (!res.ok) { alert(res.error || 'Please check your input'); return; }
      $(this)[0].reset();
      $('#date').val(window.App.Util.today());
      window.App.render();
      // Subtle feedback
      $('.card').first().stop(true).animate({ boxShadow: '0 20px 40px rgba(15,163,177,0.15)' }, 150).animate({ boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }, 200);
    });

    // Quick add shortcuts
    $('#addQuickMeal').on('click', function(){
      const st = window.App.Model.getState();
      const cat = st.categories.find(c => /food/i.test(c.name)) || st.categories[0];
      window.App.Model.addItem({ desc: 'Meal', categoryId: cat.id, amount: 15, currency: st.baseCurrency, date: window.App.Util.today(), note: '' });
      window.App.render();
    });
    $('#addQuickTaxi').on('click', function(){
      const st = window.App.Model.getState();
      const cat = st.categories.find(c => /transport/i.test(c.name)) || st.categories[0];
      window.App.Model.addItem({ desc: 'Taxi', categoryId: cat.id, amount: 20, currency: st.baseCurrency, date: window.App.Util.today(), note: '' });
      window.App.render();
    });

    // Export
    $('#exportBtn').on('click', function(){
      const json = window.App.Model.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tripsum-data.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 0);
    });

    // Import
    $('#importBtn').on('click', function(){ $('#importFile').trigger('click'); });
    $('#importFile').on('change', function(){
      const file = this.files && this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        const res = window.App.Model.importJSON(String(reader.result));
        if (!res.ok) { alert('Import failed.'); return; }
        window.App.render();
      };
      reader.readAsText(file);
      $(this).val('');
    });

    // Reset
    $('#resetBtn').on('click', function(){
      if (!confirm('Reset all data? This cannot be undone.')) return;
      window.App.Model.reset();
      window.App.render();
    });
  }

  // Public API
  window.App.init = function(){
    // Initialize model
    const st = window.App.Model.init();

    // Populate currency selects
    renderCurrencyOptions($('#baseCurrency'));
    const $cur = $('#currency');
    $cur.empty();
    window.App.Currency.list.forEach(function(c){ $cur.append(`<option value="${c.code}">${c.code}</option>`); });

    // Default date
    $('#date').val(window.App.Util.today());

    bindEvents();
  };

  window.App.render = function(){
    renderBaseCurrency();
    renderCategories();
    renderItems();
    renderRates();
    renderSummary();
  };
})();
