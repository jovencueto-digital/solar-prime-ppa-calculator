/* The Solar Prime — Solar PPA savings calculator (IL & MA)
 * Average-estimate model. All rates editable in the UI.
 */
(function () {
  'use strict';

  // 2026 statewide defaults. Edit here to update for everyone.
  var DEFAULTS = {
    IL: { uRate: 0.18, pRate: 0.135, fixed: 15, offset: 90, uEsc: 3, pEsc: 2, term: 25 },
    MA: { uRate: 0.36, pRate: 0.25,  fixed: 10, offset: 90, uEsc: 3, pEsc: 2, term: 25 }
  };

  var MIN_KWH = 1000, MAX_KWH = 100000;

  function compute(o) {
    var annual = o.kwh;
    var fixedYr = o.fixed * 12;
    // all-in rate includes the fixed charge; back it out to get the per-kWh part
    var varRate = Math.max((annual * o.uRate - fixedYr) / annual, 0);
    var share = Math.min(o.offset / 100, 1);
    var solarKwh = annual * share;
    var gridKwh = annual - solarKwh;

    var years = [];
    var totalNow = 0, totalPpa = 0;
    for (var y = 0; y < o.term; y++) {
      var uF = Math.pow(1 + o.uEsc / 100, y);
      var pF = Math.pow(1 + o.pEsc / 100, y);
      var now = annual * o.uRate * uF;
      var ppaPay = solarKwh * o.pRate * pF;
      var utilAfter = (fixedYr + gridKwh * varRate) * uF;
      var withPpa = ppaPay + utilAfter;
      totalNow += now; totalPpa += withPpa;
      years.push({ year: y + 1, now: now, ppa: withPpa });
    }
    var y1 = years[0];
    return {
      nowMonthly: y1.now / 12,
      ppaPayMonthly: solarKwh * o.pRate / 12,
      utilAfterMonthly: (fixedYr + gridKwh * varRate) / 12,
      ppaMonthly: y1.ppa / 12,
      saveMonthly: (y1.now - y1.ppa) / 12,
      saveYear1: y1.now - y1.ppa,
      saveTerm: totalNow - totalPpa,
      savePct: y1.now > 0 ? (y1.now - y1.ppa) / y1.now : 0,
      nowYear: y1.now,
      ppaYear: y1.ppa,
      years: years
    };
  }

  // expose for testing
  if (typeof module !== 'undefined' && module.exports) { module.exports = { compute: compute, DEFAULTS: DEFAULTS }; return; }

  var $ = function (id) { return document.getElementById(id); };
  var money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fields = ['uRate', 'pRate', 'fixed', 'offset', 'uEsc', 'pEsc', 'term'];

  function state() { return document.querySelector('input[name="state"]:checked').value; }

  function applyDefaults() {
    var d = DEFAULTS[state()];
    fields.forEach(function (f) { $(f).value = d[f]; });
  }

  function parseKwh() {
    var raw = $('kwh').value.replace(/[^0-9.]/g, '');
    return raw ? parseFloat(raw) : NaN;
  }

  function num(id, fallback) {
    var v = parseFloat($(id).value);
    return isFinite(v) ? v : fallback;
  }

  function showError(msg) {
    var e = $('kwh-error');
    if (msg) { e.textContent = msg; e.hidden = false; $('kwh').setAttribute('aria-invalid', 'true'); }
    else { e.hidden = true; $('kwh').removeAttribute('aria-invalid'); }
  }

  function render() {
    var kwh = parseKwh();
    var hasInput = $('kwh').value.trim() !== '';
    if (!hasInput || !isFinite(kwh)) {
      showError(hasInput ? 'Enter a number, like 12000.' : '');
      $('empty').hidden = false; $('filled').hidden = true; return;
    }
    if (kwh < MIN_KWH || kwh > MAX_KWH) {
      showError('Enter annual usage between 1,000 and 100,000 kWh. Check that this is the 12-month total, not one month.');
      $('empty').hidden = false; $('filled').hidden = true; return;
    }
    showError('');
    var d = DEFAULTS[state()];
    var r = compute({
      kwh: kwh,
      uRate: num('uRate', d.uRate), pRate: num('pRate', d.pRate), fixed: num('fixed', d.fixed),
      offset: num('offset', d.offset), uEsc: num('uEsc', d.uEsc), pEsc: num('pEsc', d.pEsc),
      term: Math.round(Math.min(Math.max(num('term', d.term), 1), 40))
    });

    $('nowMonthly').textContent = money.format(r.nowMonthly);
    $('nowLine').textContent = money2.format(r.nowMonthly);
    $('nowYear').textContent = money.format(r.nowYear);
    $('ppaMonthly').textContent = money.format(r.ppaMonthly);
    $('ppaLine').textContent = money2.format(r.ppaPayMonthly);
    $('utilLine').textContent = money2.format(r.utilAfterMonthly);
    $('ppaYear').textContent = money.format(r.ppaYear);
    $('saveMonthly').textContent = money.format(r.saveMonthly);
    $('saveYear1').textContent = money.format(r.saveYear1);
    $('saveTerm').textContent = money.format(r.saveTerm);
    $('savePct').textContent = Math.round(r.savePct * 100) + '%';
    $('termLabel').textContent = r.years.length;
    document.querySelector('.savings').classList.toggle('negative', r.saveMonthly < 0);

    var who = $('who').value.trim();
    var p = $('prepared');
    var stName = state() === 'IL' ? 'Illinois' : 'Massachusetts';
    p.textContent = (who ? 'Prepared for ' + who + ', ' : '') + stName + ' home using ' + Math.round(kwh).toLocaleString('en-US') + ' kWh a year';
    p.hidden = false;

    drawChart(r.years);
    $('empty').hidden = true; $('filled').hidden = false;
  }

  function drawChart(years) {
    var W = 640, H = 220, padL = 52, padB = 26, padT = 10, padR = 8;
    var max = 0;
    years.forEach(function (y) { max = Math.max(max, y.now, y.ppa); });
    var step = niceStep(max / 4);
    var top = Math.ceil(max / step) * step || 1;
    var iw = W - padL - padR, ih = H - padT - padB;
    var bw = iw / years.length;
    var barW = Math.max(bw * 0.36, 1.5);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Yearly cost comparison over ' + years.length + ' years">';
    for (var g = 0; g <= top + 1e-6; g += step) {
      var gy = padT + ih - (g / top) * ih;
      s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '" class="grid"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" class="axis" text-anchor="end">' + shortMoney(g) + '</text>';
    }
    years.forEach(function (y, i) {
      var x = padL + i * bw + bw / 2;
      var hn = (y.now / top) * ih, hp = (y.ppa / top) * ih;
      s += '<rect class="b-now" x="' + (x - barW) + '" y="' + (padT + ih - hn) + '" width="' + barW + '" height="' + hn + '" rx="1"><title>Year ' + y.year + ' without solar: ' + money.format(y.now) + '</title></rect>';
      s += '<rect class="b-ppa" x="' + x + '" y="' + (padT + ih - hp) + '" width="' + barW + '" height="' + hp + '" rx="1"><title>Year ' + y.year + ' with Solar PPA: ' + money.format(y.ppa) + '</title></rect>';
      if (y.year === 1 || y.year % 5 === 0) s += '<text x="' + x + '" y="' + (H - 6) + '" class="axis" text-anchor="middle">Yr ' + y.year + '</text>';
    });
    s += '</svg>';
    $('chart').innerHTML = s;
  }

  function niceStep(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function shortMoney(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '$' + v; }

  // formatting the kWh field with thousands separators on blur
  $('kwh').addEventListener('input', render);
  $('kwh').addEventListener('blur', function () {
    var k = parseKwh();
    if (isFinite(k)) $('kwh').value = Math.round(k).toLocaleString('en-US');
  });
  document.querySelectorAll('input[name="state"]').forEach(function (el) {
    el.addEventListener('change', function () { applyDefaults(); render(); });
  });
  fields.concat(['who']).forEach(function (f) { $(f).addEventListener('input', render); });
  $('reset').addEventListener('click', function () { applyDefaults(); render(); });
  $('print').addEventListener('click', function () { window.print(); });
  $('calc').addEventListener('submit', function (e) { e.preventDefault(); });
  $('yr').textContent = new Date().getFullYear();

  applyDefaults();
  render();
})();
