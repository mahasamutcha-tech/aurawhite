/* ==========================================================
   AuraWhite — script.js (shared by every page)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   Each section runs only if its elements exist on the current page.
   ========================================================== */

var ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz07ytSbfz28VihOQrEO2tX_Glsi08ARIsdrOQWfc6abuzSub0cjW1stNAh9dr2SIbq1g/exec';
var ORDERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1MHGaYI6vEJ4pcZaGYpJTKthd2J0zu_mLY3VfLYTV16DQSj6YPXG9nsZe4hY4bCed1ZG2WJ6YopJp/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.getElementById('ordersTable')) initAdminPage();
});

/* ---------- helpers ---------- */

// "White Peach & Mint" -> "whitepeachmint" (so ?mood=white-peach-mint also matches)
function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
}

function moodClass(mood) {
  var key = String(mood || '').toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return key ? 'mood--' + key : '';
}

function formatPrice(n) {
  return Number(n).toLocaleString('th-TH') + ' บาท';
}

/* ==========================================================
   1) product.html
   ========================================================== */
function initProductPage() {
  var list = document.getElementById('product-list');
  var bar = document.getElementById('filter-bar');
  var products = [];
  var activeMood = 'all';

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      buildFilterBar();

      // Auto-filter from ?mood=xxx
      var wanted = new URLSearchParams(window.location.search).get('mood');
      if (wanted) {
        var match = getMoods().filter(function (m) {
          return normalizeKey(m) === normalizeKey(wanted);
        })[0];
        if (match) activeMood = match;
      }
      updateActiveButton();
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      list.textContent = 'ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง';
    });

  function getMoods() {
    var seen = [];
    products.forEach(function (p) {
      if (seen.indexOf(p.mood) === -1) seen.push(p.mood);
    });
    return seen;
  }

  function buildFilterBar() {
    if (!bar) return;
    bar.innerHTML = '';
    addButton('all', 'ทั้งหมด');
    getMoods().forEach(function (m) { addButton(m, m); });

    function addButton(value, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn filter-btn';
      btn.dataset.mood = value;
      btn.textContent = label;
      btn.addEventListener('click', function () {
        activeMood = value;
        updateActiveButton();
        renderProducts();
      });
      bar.appendChild(btn);
    }
  }

  function updateActiveButton() {
    if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll('.filter-btn'), function (btn) {
      var isActive = btn.dataset.mood === activeMood;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function renderProducts() {
    list.innerHTML = '';
    var shown = products.filter(function (p) {
      return activeMood === 'all' || p.mood === activeMood;
    });

    if (!shown.length) {
      list.textContent = 'ไม่พบสินค้า';
      return;
    }

    shown.forEach(function (p) { list.appendChild(buildCard(p)); });
  }

  function buildCard(p) {
    var card = document.createElement('article');
    card.className = 'product-card';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'product-card__image';
    var img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    var mood = document.createElement('span');
    mood.className = ('mood ' + moodClass(p.mood)).trim();
    mood.textContent = p.mood;

    var title = document.createElement('h3');
    title.textContent = p.name;

    var meta = document.createElement('div');
    meta.className = 'meta';
    var size = document.createElement('span');
    size.className = 'size';
    size.textContent = p.size;
    var price = document.createElement('span');
    price.className = 'price';
    price.textContent = formatPrice(p.price);
    meta.appendChild(size);
    meta.appendChild(price);

    var buy = document.createElement('a');
    buy.className = 'btn btn--gold';
    buy.textContent = 'สั่งซื้อ';
    buy.href = 'order.html?item=' + encodeURIComponent(p.name) + '&price=' + encodeURIComponent(p.price);

    card.appendChild(imgWrap);
    card.appendChild(mood);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(buy);
    return card;
  }
}

/* ==========================================================
   2) order.html
   ========================================================== */
function initOrderPage() {
  var form = document.getElementById('orderForm');
  var params = new URLSearchParams(window.location.search);

  // Prefill from URL parameters
  var item = params.get('item');
  var price = params.get('price');
  if (item !== null) document.getElementById('items').value = item;
  if (price !== null) document.getElementById('total').value = price;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: document.getElementById('items').value,
      total: document.getElementById('total').value,
      note: document.getElementById('note').value
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      if (submitBtn) submitBtn.disabled = false;
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================
   3) admin.html
   ========================================================== */
function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  var COLUMNS = 6;

  setMessage('กำลังโหลดข้อมูล...');

  // Cache-buster: published CSVs are cached by Google/browsers
  var url = ORDERS_CSV_URL + '&_=' + Date.now();

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ''; });
      });

      // Skip a header row if the sheet has one (first cell isn't a date/number)
      if (rows.length && !/^\s*\d/.test(rows[0][0])) rows.shift();

      // Rows are appended over time, so reversing puts the newest first
      rows.reverse();
      renderRows(rows);
    })
    .catch(function (error) {
      console.error(error);
      setMessage('ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้');
    });

  function setMessage(msg) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = COLUMNS;
    td.textContent = msg;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderRows(rows) {
    if (!rows.length) {
      setMessage('ยังไม่มีคำสั่งซื้อ');
      return;
    }
    tbody.innerHTML = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      for (var i = 0; i < COLUMNS; i++) {
        var td = document.createElement('td');
        td.textContent = row[i] !== undefined ? row[i] : '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }
}

/* ---------- CSV parser (no external library) ----------
   Handles quoted fields, escaped quotes (""), commas and
   line breaks inside quotes, and both CRLF / LF endings. */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);

    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignore; handled with \n
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // last field / row without trailing newline
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
