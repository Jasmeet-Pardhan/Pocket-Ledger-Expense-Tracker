'use strict';
/* Spendly - all data stays in your browser (localStorage). */

const CATS = {
  Food: ['🍔', '#f97316'], Transport: ['🚌', '#3b82f6'], Housing: ['🏠', '#8b5cf6'],
  Bills: ['💡', '#eab308'], Shopping: ['🛍️', '#ec4899'], Health: ['💊', '#ef4444'],
  Entertainment: ['🎬', '#14b8a6'], Education: ['📚', '#6366f1'], Others: ['✏️', '#64748b']
};
// Approximate defaults (units per 1 USD). Edit them in Settings or fetch live rates.
const DEFAULT_RATES = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 88, AED: 3.67, PKR: 280, BDT: 120, JPY: 150, AUD: 1.52, CAD: 1.37, SGD: 1.34, CNY: 7.1 };
const KEY = 'spendly_v1';
const $ = id => document.getElementById(id);

const fresh = () => ({ base: 'USD', rates: { ...DEFAULT_RATES }, salary: {}, budget: 0, expenses: [] });
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.expenses)) return { ...fresh(), ...d, rates: { ...DEFAULT_RATES, ...d.rates } };
  } catch (e) {}
  return fresh();
}
let S = load(), weekOff = 0, editId = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- helpers ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (v, c = S.base) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v); } catch (e) { return c + ' ' + v.toFixed(2); } };
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const conv = x => x.amount / S.rates[x.cur] * S.rates[S.base];
const month = () => $('month').value;
const total = items => items.reduce((s, x) => s + conv(x), 0);
const monthItems = () => S.expenses.filter(x => x.date.startsWith(month()));
const sumBy = items => {
  const t = {};
  items.forEach(x => t[x.cat] = (t[x.cat] || 0) + conv(x));
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
};
const label = c => `${CATS[c][0]} ${c}`;
function salaryFor(m) {            // uses the latest earlier month if none is set for m
  if (m in S.salary) return S.salary[m];
  const ks = Object.keys(S.salary).filter(k => k < m).sort();
  return ks.length ? S.salary[ks.pop()] : 0;
}

/* ---------- rendering ---------- */
function render() {
  const items = monthItems(), spent = total(items), sal = salaryFor(month()), rows = sumBy(items), left = sal - spent;
  $('base').value = S.base;
  $('sal-cur').textContent = $('bud-cur').textContent = S.base;
  $('salary').value = sal || '';
  $('c-spent').textContent = fmt(spent);
  $('c-save').textContent = fmt(left);
  $('c-save').style.color = left < 0 ? '#ff8a8a' : '#9be8c6';
  $('c-rate').textContent = sal ? `${Math.round(left / sal * 100)}% of salary` : 'Add your salary above';
  $('c-top').textContent = rows.length ? label(rows[0][0]) : 'None yet';
  $('c-topv').textContent = rows.length ? fmt(rows[0][1]) : 'Add an expense to see this';
  renderBudget(spent); renderMonthly(rows, spent, items); renderWeekly(); renderList();
}

function renderBudget(spent) {
  const b = S.budget, p = b ? spent / b * 100 : 0;
  $('bud-txt').textContent = !b ? 'No monthly budget set. Add one in Settings.'
    : spent > b ? `Over budget by ${fmt(spent - b)}` : `${fmt(b - spent)} left of ${fmt(b)}`;
  $('bud-pct').textContent = b ? Math.round(p) + '% used' : '';
  $('bud-bar').style.width = Math.min(p, 100) + '%';
  $('bud-bar').style.background = p > 100 ? '#ff6b6b' : p >= 80 ? '#e9a800' : '#7fd6b0';
}

function renderMonthly(rows, spent, items) {
  $('d-total').textContent = fmt(spent);
  let acc = 0;
  const stops = rows.map(([c, v]) => { const s = acc; acc += v / spent * 100; return `${CATS[c][1]} ${s}% ${acc}%`; });
  $('donut').style.background = rows.length ? `conic-gradient(${stops.join(',')})` : '';
  $('cat-list').innerHTML = rows.length ? rows.map(([c, v], i) => {
    const p = v / spent * 100;
    return `<div><div class="flex justify-between gap-2 text-sm"><span>${label(c)}${i === 0 ? ' <b class="text-xs" style="color:var(--gold)">most spent</b>' : ''}</span><span class="font-semibold">${fmt(v)} <span class="text-xs font-normal muted">${p.toFixed(0)}%</span></span></div><div class="track mt-1 h-2"><div class="bar h-2 rounded-full" style="width:${p}%;background:${CATS[c][1]}"></div></div></div>`;
  }).join('') : '<p class="text-sm muted">No expenses this month yet. Add your first one on the left.</p>';
  const [y, m] = month().split('-').map(Number), days = new Date(y, m, 0).getDate();
  $('m-avg').textContent = items.length ? `${items.length} expenses, about ${fmt(spent / days)} per day` : '';
}

function renderWeekly() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7 + weekOff * 7);          // Monday of the shown week
  const days = [...Array(7)].map((_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
  const vals = days.map(x => total(S.expenses.filter(e => e.date === iso(x))));
  const items = S.expenses.filter(e => e.date >= iso(days[0]) && e.date <= iso(days[6]));
  const t = vals.reduce((a, b) => a + b, 0), max = Math.max(...vals), top = sumBy(items)[0];
  const f = x => x.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  $('w-label').textContent = `${weekOff === 0 ? 'This week: ' : ''}${f(days[0])} to ${f(days[6])}`;
  $('w-bars').innerHTML = days.map((x, i) => `<div class="flex h-full flex-1 flex-col items-center justify-end gap-1"><span class="text-[10px] muted">${vals[i] ? Math.round(vals[i]) : ''}</span><div class="bar w-full rounded-t-md" style="height:${max ? vals[i] / max * 70 : 0}%;background:${max && vals[i] === max ? 'var(--gold)' : 'var(--pine)'}"></div><span class="text-xs">${x.toLocaleDateString(undefined, { weekday: 'short' })}</span></div>`).join('');
  $('w-total').textContent = fmt(t);
  $('w-avg').textContent = fmt(t / 7);
  $('w-top').textContent = top ? label(top[0]) : 'None';
}

function renderList() {
  const cat = $('f-cat').value, q = $('f-q').value.trim().toLowerCase();
  const items = monthItems()
    .filter(x => (!cat || x.cat === cat) && (!q || (x.note + ' ' + x.cat).toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date));
  $('list').innerHTML = items.length ? items.map(x => `
    <li class="row flex items-center gap-3 py-2.5">
      <span class="grid h-9 w-9 flex-none place-items-center rounded-full text-lg" style="background:${CATS[x.cat][1]}33">${CATS[x.cat][0]}</span>
      <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${esc(x.note || x.cat)}</p><p class="text-xs muted">${x.cat} on ${x.date}</p></div>
      <div class="text-right text-sm font-semibold">${fmt(x.amount, x.cur)}${x.cur === S.base ? '' : `<p class="text-xs font-normal muted">about ${fmt(conv(x))}</p>`}</div>
      <button class="ghost" data-edit="${x.id}" aria-label="Edit expense">Edit</button>
      <button class="ghost" data-del="${x.id}" aria-label="Delete expense">Delete</button>
    </li>`).join('') : '<li class="row py-6 text-center text-sm muted">No expenses match. Try another month or filter.</li>';
}

/* ---------- add / edit ---------- */
function catChanged() {
  const o = $('cat').value === 'Others';
  $('note').required = o;
  $('note-lbl').textContent = o ? 'What did you spend on? (required)' : 'Note (optional)';
  $('note').placeholder = o ? 'e.g. Gift for a friend' : 'e.g. Lunch with team';
}
function resetForm() {
  editId = null; $('form').reset();
  $('date').value = iso(new Date()); $('cur').value = S.base; catChanged();
  $('form-title').textContent = 'Add expense'; $('save-btn').textContent = 'Add expense';
  $('cancel').classList.add('hidden');
}
function startEdit(id) {
  const x = S.expenses.find(e => e.id === id); if (!x) return;
  editId = id;
  $('amount').value = x.amount; $('cur').value = x.cur; $('cat').value = x.cat; $('date').value = x.date; $('note').value = x.note;
  catChanged();
  $('form-title').textContent = 'Edit expense'; $('save-btn').textContent = 'Save changes';
  $('cancel').classList.remove('hidden');
  $('form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

$('form').onsubmit = e => {
  e.preventDefault();
  const x = {
    id: editId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    amount: parseFloat($('amount').value), cur: $('cur').value, cat: $('cat').value,
    date: $('date').value, note: $('note').value.trim()
  };
  S.expenses = editId ? S.expenses.map(o => o.id === editId ? x : o) : [...S.expenses, x];
  save(); $('month').value = x.date.slice(0, 7); resetForm(); render();
};
$('cat').onchange = catChanged;
$('cancel').onclick = resetForm;
$('list').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) startEdit(b.dataset.edit);
  if (b.dataset.del && confirm('Delete this expense?')) { S.expenses = S.expenses.filter(x => x.id !== b.dataset.del); save(); render(); }
};

/* ---------- header controls ---------- */
$('month').onchange = render;
$('f-cat').onchange = renderList;
$('f-q').oninput = renderList;
$('w-prev').onclick = () => { weekOff--; renderWeekly(); };
$('w-next').onclick = () => { weekOff++; renderWeekly(); };
$('salary').onchange = e => { S.salary[month()] = Math.max(0, parseFloat(e.target.value) || 0); save(); render(); };
$('base').onchange = e => {                       // keep salary and budget worth the same after switching
  const f = S.rates[e.target.value] / S.rates[S.base];
  for (const k in S.salary) S.salary[k] = Math.round(S.salary[k] * f * 100) / 100;
  S.budget = Math.round(S.budget * f * 100) / 100;
  S.base = e.target.value; save(); $('cur').value = S.base; render();
};
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
  $('tab-month').classList.toggle('hidden', b.dataset.tab !== 'month');
  $('tab-week').classList.toggle('hidden', b.dataset.tab !== 'week');
});
$('btn-dark').onclick = () => {
  const on = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('spendly_dark', on ? '1' : '0'); } catch (e) {}
};

/* ---------- export ---------- */
$('btn-export').onclick = () => {
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['Date', 'Category', 'Note', 'Amount', 'Currency', 'Amount in ' + S.base]]
    .concat([...S.expenses].sort((a, b) => a.date.localeCompare(b.date)).map(x => [x.date, x.cat, x.note, x.amount, x.cur, conv(x).toFixed(2)]));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = 'spendly-expenses.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/* ---------- settings ---------- */
function ratesUI() {
  $('rates').innerHTML = Object.keys(DEFAULT_RATES).map(c =>
    `<label class="text-xs">${c}<input data-rate="${c}" type="number" step="any" min="0" value="${S.rates[c]}" class="field mt-0.5 w-full" ${c === 'USD' ? 'disabled' : ''}></label>`).join('');
}
$('btn-settings').onclick = () => { $('budget').value = S.budget || ''; ratesUI(); $('rate-msg').textContent = ''; $('settings').showModal(); };
$('close').onclick = () => $('settings').close();
$('budget').onchange = e => { S.budget = Math.max(0, parseFloat(e.target.value) || 0); save(); render(); };
$('rates').onchange = e => {
  const c = e.target.dataset.rate, v = parseFloat(e.target.value);
  if (c && v > 0) { S.rates[c] = v; save(); render(); }
};
$('live').onclick = async () => {
  try {
    const j = await (await fetch('https://open.er-api.com/v6/latest/USD')).json();
    if (j.result !== 'success') throw new Error('bad response');
    Object.keys(DEFAULT_RATES).forEach(c => { if (j.rates[c]) S.rates[c] = j.rates[c]; });
    save(); ratesUI(); render(); $('rate-msg').textContent = 'Rates updated.';
  } catch (e) { $('rate-msg').textContent = 'Could not fetch rates. Check your connection or edit them by hand.'; }
};
$('reset').onclick = () => {
  if (!confirm('Delete ALL expenses and settings? This cannot be undone.')) return;
  S = fresh(); save(); $('settings').close(); resetForm(); render();
};

/* ---------- start ---------- */
const curOpts = Object.keys(DEFAULT_RATES).map(c => `<option>${c}</option>`).join('');
const catOpts = Object.keys(CATS).map(c => `<option value="${c}">${label(c)}</option>`).join('');
$('base').innerHTML = $('cur').innerHTML = curOpts;
$('cat').innerHTML = catOpts;
$('f-cat').innerHTML = '<option value="">All categories</option>' + catOpts;
$('month').value = iso(new Date()).slice(0, 7);
resetForm(); render();
