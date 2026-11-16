const MAX_N = 7;
let N = 3, A = [], tmr, seq = 0;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fix = s => String(s).replaceAll('-', '−');

const PRESETS = {
  sample: [[2, 1, 3], [1, 3, 1], [1, 2, 4]],
  two: [[2, 1], [5, 3]],
  sing: [[1, 2], [2, 4]]
};

function load(m) { N = m.length; A = m.map(r => r.map(String)); build(); }

function setSize(n) {
  A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (A[i] && A[i][j] !== undefined) ? A[i][j] : '0'));
  N = n;
  build();
}

function build() {
  $('size').value = N;
  document.querySelectorAll('#chips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === N)));
  $('form').innerHTML = `<table class="cg"><tbody>${A.map((row, i) => '<tr>' + row.map((v, j) =>
    `<td><input inputmode="decimal" aria-label="Row ${i + 1}, column ${j + 1}" data-r="${i}" data-c="${j}" value="${esc(v)}"></td>`).join('') + '</tr>').join('')}</tbody></table>`;
  compute();
}

const mat = M => `<div class="box"><table class="m" role="presentation">${M.map(r => '<tr>' + r.map(v => `<td>${esc(fix(v))}</td>`).join('') + '</tr>').join('')}</table></div>`;

function report(r) {
  const rows = r.terms.map((t, i) => `<tr><td>${i + 1}</td><td>${t[0]}</td><td>${t[1]}</td><td>${fix(t[2])}</td><td class="wk">${fix(t[3])}</td><td>${fix(t[4])}</td><td>${fix(t[5])}</td></tr>`).join('');
  const items = [
    [r.ok, `The permutation sum equals the determinant by row reduction (${fix(r.det)} and ${fix(r.check)})`]
  ];
  return `<section class="card span"><h2><span class="n">1</span>Matrix A</h2>${mat(A)}</section>
  <section class="card span"><h2><span class="n">2</span>All ${r.terms.length} permutations</h2>
   <p class="mut">Inversions count the pairs that are out of order. An even count gives sgn = +1, an odd count gives −1.</p>
   <details${N <= 3 ? ' open' : ''}><summary>Show every term</summary><div class="box"><table class="vt"><tr><th>#</th><th>σ</th><th>Inversions</th><th>sgn(σ)</th><th>Product</th><th>Value</th><th>sgn × value</th></tr>${rows}</table></div></details></section>
  <section class="card"><h2><span class="n">3</span>Sum &nbsp;det(A) = Σ sgn(σ) · a₁σ(1) · … · aₙσ(n)</h2>
   <div class="ans"><div>det(A) = ${fix(r.det)}</div></div></section>
  <section class="card"><h2><span class="n">4</span>Verification</h2><ul class="chk">${items.map(q => `<li class="${q[0] ? 'ok' : 'bad'}">${q[0] ? '✔' : '✘'} ${q[1]}</li>`).join('')}</ul>
   <p class="big ${r.ok ? 'ok' : 'bad'}">${r.ok ? '✔ The determinant is verified.' : '✘ Verification failed. Recheck your entries.'}</p></section>`;
}

async function compute() {
  const mine = ++seq;
  try {
    const r = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ A })
    });
    if (mine !== seq) return;
    if (r.status === 422) {
      const j = await r.json().catch(() => ({}));
      $('err').textContent = typeof j.detail === 'string' ? j.detail : 'The API could not read this matrix.';
      $('out').innerHTML = '';
      return;
    }
    if (!r.ok) throw new Error('API returned ' + r.status);
    const j = await r.json();
    if (mine !== seq) return;
    $('err').textContent = '';
    $('out').innerHTML = report(j);
  } catch (e) {
    $('err').textContent = 'Could not reach the Python API. Run det_api.py first.';
    $('out').innerHTML = '';
  }
}

$('chips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSize(+b.dataset.n); });
$('size').addEventListener('change', () => {
  let v = parseInt($('size').value, 10);
  if (!(v >= 1)) v = N;
  setSize(Math.min(v, MAX_N));
});
$('presets').addEventListener('click', e => {
  const p = e.target.dataset.p;
  if (!p) return;
  if (p === 'clear') { A = A.map(r => r.map(() => '0')); build(); }
  else load(PRESETS[p]);
});
$('form').addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.r === undefined) return;
  A[+el.dataset.r][+el.dataset.c] = el.value;
  clearTimeout(tmr);
  tmr = setTimeout(compute, 150);
});

load(PRESETS.sample);
