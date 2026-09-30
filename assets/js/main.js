/* ==========================================================================
   НАСТРОЙКА ФОРМЫ ЗАЯВОК — единственное, что здесь нужно менять.

   Заявки уходят через Web3Forms (web3forms.com) — сервис пересылки формы
   на почту, без Google-таблиц и без своего сервера. Как получить ключ —
   README.md, займёт минуту.

   Пока WEB3FORMS_KEY пустой (''), форма работает запасным способом:
   открывает почтовую программу с уже заполненным письмом.
   ========================================================================== */
var WEB3FORMS_KEY = '284732d4-e17b-4663-a9d3-a3b2b75af318';
var OWNER_EMAIL = 'sales@solaris-samara.ru';
var OWNER_PHONE = '+78462701923';

document.addEventListener('DOMContentLoaded', function () {
  var burger = document.getElementById('burger');
  var navMobile = document.getElementById('navMobile');
  if (burger && navMobile) {
    burger.addEventListener('click', function () {
      navMobile.classList.toggle('open');
    });
    navMobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navMobile.classList.remove('open'); });
    });
  }

  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var syncHeaderHeight = function () {
      document.documentElement.style.setProperty('--header-h', (header.offsetHeight + 32) + 'px');
    };
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);
  }

  // Общая отправка заявки через Web3Forms — используется формой заказа и калькулятором
  function sendLead(fields, opts) {
    opts = opts || {};
    var statusEl = opts.statusEl;
    var submitBtn = opts.submitBtn;
    var onDone = opts.onDone;

    if (!WEB3FORMS_KEY) {
      var body = Object.keys(fields).map(function (k) { return k + ': ' + fields[k]; }).join('\n');
      window.location.href = 'mailto:' + OWNER_EMAIL +
        '?subject=' + encodeURIComponent(opts.subject || 'Заявка с сайта') +
        '&body=' + encodeURIComponent(body);
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Отправляем…'; }
    if (statusEl) { statusEl.className = 'form-note'; statusEl.textContent = ''; }

    var payload = Object.assign({
      access_key: WEB3FORMS_KEY,
      subject: opts.subject || 'Заявка с сайта',
      from_name: 'Сайт ТД «Солярис»'
    }, fields);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.success) throw new Error((res && res.message) || 'ошибка сервера');
        if (statusEl) {
          statusEl.className = 'form-note is-ok';
          statusEl.textContent = 'Заявка отправлена — мы скоро перезвоним.';
        }
        if (onDone) onDone();
      })
      .catch(function () {
        if (statusEl) {
          statusEl.className = 'form-note is-bad';
          statusEl.innerHTML = 'Не удалось отправить. Позвоните: ' +
            '<a href="tel:' + OWNER_PHONE + '">' + OWNER_PHONE + '</a> или напишите на ' +
            '<a href="mailto:' + OWNER_EMAIL + '">' + OWNER_EMAIL + '</a>.';
        }
      })
      .then(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.label || 'Отправить заявку'; }
      });
  }

  // ─── Калькулятор тонны ↔ м³ ──────────────────────────────────────────
  var calcForm = document.getElementById('calcForm');
  if (calcForm) {
    var calcMaterial = document.getElementById('calcMaterial');
    var calcTons = document.getElementById('calcTons');
    var calcCubes = document.getElementById('calcCubes');
    var calcStatus = document.getElementById('calcStatus');
    var calcSubmitBtn = document.getElementById('calcSubmit');
    var calcFractionField = document.getElementById('calcFractionField');
    var calcFraction = document.getElementById('calcFraction');

    // price — число (₽/т), 'tiered' (речной песок, зависит от объёма партии) или 'request' (цена по запросу)
    var MATERIALS = {
      'Щебень известняковый': [
        { group: 'ГОСТ 8267-93, М400-600', items: [
          { label: 'фр. 5x20', price: 1350 },
          { label: 'фр. 20x40', price: 1300 },
          { label: 'фр. 20x80', price: 1200 },
          { label: 'фр. 40x70', price: 1350 },
          { label: 'фр. 80x120 (150)', price: 1550 }
        ] },
        { group: 'ГОСТ 32703-2014, М400-600', items: [
          { label: 'фр. 8x16', price: 1350 },
          { label: 'фр. 16-31,5', price: 1350 },
          { label: 'фр. 31,5-63', price: 1350 }
        ] },
        { group: 'ГОСТ 32703-2014, М600', items: [
          { label: 'фр. 8x16', price: 1450 },
          { label: 'фр. 16-31,5', price: 1450 },
          { label: 'фр. 31,5-63', price: 1450 }
        ] }
      ],
      'Отсев (доломит)': [
        { group: 'ГОСТ 25607-2009', items: [
          { label: 'ГПЩС С8 (0-10)', price: 500 },
          { label: 'ГПЩС С8 (0-10, Завод №4, белая)', price: 650 }
        ] }
      ],
      'ЩПС / смеси': [
        { group: 'ГОСТ 25607-2009', items: [
          { label: 'ЩПС С2 (0-20)', price: 900 },
          { label: 'ЩПС С4', price: 900 },
          { label: 'ЩПС С5', price: 900 }
        ] }
      ],
      'Песок речной': [
        { group: 'ГОСТ 8736-2014', items: [
          { label: 'Речной песок (1,0-1,5)', price: 'tiered' },
          { label: 'Обогащённый до 2,0-2,5', price: 'request' },
          { label: 'Обогащённый до 3,0; 3,0-3,5', price: 2000 }
        ] }
      ],
      'Бутовый камень': [
        { group: 'ГОСТ 4001-2013', items: [
          { label: 'М150-300', price: 1600 },
          { label: 'М150-500', price: 1600 }
        ] }
      ],
      'Известь / минеральный порошок': [
        { group: null, items: [
          { label: 'МП (биг-бэг) массой 1 т (ГОСТ Р52129-2003)', price: 3050 },
          { label: 'МП навал (ГОСТ 32761-2014)', price: 2250 },
          { label: 'Известь молотая (3 сорт) биг-бэг массой 0,85 т', price: 8235 }
        ] }
      ]
    };

    // тонны речного песка (Речной песок 1,0-1,5) → цена за тонну
    function sandTierPrice(tons) {
      if (tons >= 3000) return 460;
      if (tons >= 1000) return 480;
      return 530;
    }

    function syncFractionField() {
      var materialName = calcMaterial.options[calcMaterial.selectedIndex].text;
      var groups = MATERIALS[materialName];
      calcFraction.innerHTML = '';
      if (!groups) {
        calcFractionField.hidden = true;
        calcFraction.required = false;
        return;
      }
      groups.forEach(function (g) {
        var parent = calcFraction;
        if (g.group) {
          parent = document.createElement('optgroup');
          parent.label = g.group;
          calcFraction.appendChild(parent);
        }
        g.items.forEach(function (item) {
          var opt = document.createElement('option');
          opt.value = item.label;
          opt.textContent = item.label;
          opt.dataset.price = item.price;
          parent.appendChild(opt);
        });
      });
      calcFractionField.hidden = false;
      calcFraction.required = true;
    }

    function density() { return parseFloat(calcMaterial.value) || 1; }
    function parseNum(v) { return parseFloat(String(v).replace(',', '.')); }

    var calcPriceBox = document.getElementById('calcPriceBox');
    var calcPriceValue = document.getElementById('calcPriceValue');
    var rub = new Intl.NumberFormat('ru-RU');

    function updatePrice() {
      var tons = parseNum(calcTons.value);
      if (calcFractionField.hidden || isNaN(tons) || tons <= 0) {
        calcPriceBox.hidden = true;
        return;
      }
      var opt = calcFraction.options[calcFraction.selectedIndex];
      var priceRaw = opt ? opt.dataset.price : null;

      if (priceRaw === 'request') {
        calcPriceValue.textContent = 'Цена по запросу — уточните у менеджера';
        calcPriceBox.hidden = false;
        return;
      }

      var perTon = priceRaw === 'tiered' ? sandTierPrice(tons) : parseFloat(priceRaw);
      if (isNaN(perTon)) {
        calcPriceBox.hidden = true;
        return;
      }
      calcPriceValue.textContent = '≈ ' + rub.format(Math.round(tons * perTon)) + ' ₽';
      calcPriceBox.hidden = false;
    }

    calcTons.addEventListener('input', function () {
      var n = parseNum(calcTons.value);
      calcCubes.value = isNaN(n) ? '' : (n / density()).toFixed(2);
      updatePrice();
    });
    calcCubes.addEventListener('input', function () {
      var n = parseNum(calcCubes.value);
      calcTons.value = isNaN(n) ? '' : (n * density()).toFixed(2);
      updatePrice();
    });
    calcFraction.addEventListener('change', updatePrice);
    calcMaterial.addEventListener('change', function () {
      syncFractionField();
      if (calcTons.value) calcTons.dispatchEvent(new Event('input'));
      else if (calcCubes.value) calcCubes.dispatchEvent(new Event('input'));
      updatePrice();
    });
    syncFractionField();

    calcForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('calcName');
      var phone = document.getElementById('calcPhone');
      var email = document.getElementById('calcEmail');
      var consent = document.getElementById('calcConsent');
      var gotcha = document.getElementById('calcGotcha').value;

      var required = [name, phone, email, consent];
      if (!calcFractionField.hidden) required.push(calcFraction);

      var ok = true;
      required.forEach(function (input) {
        var field = input.closest('.field') || input.closest('.consent');
        var bad = input === consent ? !input.checked : !input.value.trim();
        if (field) field.classList.toggle('is-bad', bad);
        if (bad) ok = false;
      });
      if (!ok) return;
      if (gotcha) return; // бот

      var materialName = calcMaterial.options[calcMaterial.selectedIndex].text;
      var fractionName = calcFractionField.hidden ? '—' : calcFraction.value;

      sendLead({
        'Имя': name.value.trim(),
        'Телефон': phone.value.trim(),
        'Эл. почта': email.value.trim(),
        'Материал': materialName,
        'Фракция / марка': fractionName,
        'Вес, тн': calcTons.value || '—',
        'Объём, м3': calcCubes.value || '—',
        'Ориентировочная стоимость (без доставки)': calcPriceBox.hidden ? '—' : calcPriceValue.textContent,
        'Адрес доставки': document.getElementById('calcAddress').value.trim() || '—'
      }, {
        subject: 'Заявка с калькулятора — ' + name.value.trim(),
        statusEl: calcStatus,
        submitBtn: calcSubmitBtn,
        onDone: function () { calcForm.reset(); syncFractionField(); calcPriceBox.hidden = true; }
      });
    });
  }


  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
      // страховка: если что-то пошло не так (наблюдатель не сработал,
      // вкладка была в фоне и т.п.) — просто показать всё через 2с
      setTimeout(function () {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
      }, 2000);
    }
  }

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var countIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var start = null;
        var duration = 1100;
        function step(ts) {
          if (!start) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          el.textContent = Math.round(progress * target);
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = target;
        }
        requestAnimationFrame(step);
        countIo.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countIo.observe(el); });
    // страховка: если rAF почему-то не доиграл анимацию — доставить финальное число
    setTimeout(function () {
      counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    }, 2500);
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }
});
