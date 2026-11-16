const MAX_N = 7, ABS_MAX = 30, EXACT_MAX = 10;
let UNLOCK = false, N = 3, A = [], tmr, seq = 0;
const LIMIT = () => UNLOCK ? ABS_MAX : MAX_N;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fix = s => String(s).replaceAll('-', '−');
const sci = v => v === 0 ? '0' : v.toExponential(1).replaceAll('-', '−');
const fmtD = v => v === 0 ? '0' : fix((Math.abs(v) >= 1e5 || Math.abs(v) < 1e-3) ? v.toExponential(4) : String(+v.toFixed(4)));

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
  $('size').max = LIMIT();
  $('unlock').checked = UNLOCK;
  document.querySelectorAll('#chips .big').forEach(b => { b.hidden = !UNLOCK; });
  document.querySelectorAll('#chips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === N)));
  $('mode').textContent = N <= EXACT_MAX ? 'Exact fractions' : 'Decimal, double precision';
  $('form').innerHTML = `<table class="cg"><tbody>${A.map((row, i) => '<tr>' + row.map((v, j) =>
    `<td><input inputmode="decimal" aria-label="Row ${i + 1}, column ${j + 1}" data-r="${i}" data-c="${j}" value="${esc(v)}"></td>`).join('') + '</tr>').join('')}</tbody></table>`;
  compute();
}

const mat = M => `<div class="box"><table class="m" role="presentation">${M.map(r => '<tr>' + r.map(v => `<td>${esc(fix(v))}</td>`).join('') + '</tr>').join('')}</table></div>`;

const FORMULA = `<p class="fm">det(A) =
  <span class="op"><span>Σ</span><small>σ∈S<sub>n</sub></small></span>
  sgn(σ)
  <span class="op"><small>n</small><span>Π</span><small>i=1</small></span>
  a<sub>i,σ(i)</sub></p>`;

const matCard = `<section class="card span"><h2><span class="n">1</span>Matrix A</h2>`;

function verifyCard(items, ok, cond) {
  return `<section class="card"><h2><span class="n">4</span>Verification</h2><ul class="chk">${items.map(q => `<li class="${q[0] ? 'ok' : 'bad'}">${q[0] ? '✔' : '✘'} ${q[1]}</li>`).join('')}</ul>
   <p class="big ${ok ? 'ok' : 'bad'}">${ok ? '✔ The determinant is verified.' : '✘ Verification failed. ' + (cond > 1e8 ? 'The matrix is ill-conditioned, so rounding error is too large for decimal arithmetic to confirm the answer.' : 'Recheck your entries.')}</p></section>`;
}

function reportPerm(r) {
  const rows = r.terms.map((t, i) => `<tr><td>${i + 1}</td><td>${t[0]}</td><td>${t[1]}</td><td>${fix(t[2])}</td><td class="wk">${fix(t[3])}</td><td>${fix(t[4])}</td><td>${fix(t[5])}</td></tr>`).join('');
  return `${matCard}${mat(A)}</section>
  <section class="card span"><h2><span class="n">2</span>All ${r.terms.length} permutations</h2>
   <p class="mut">Inversions count the pairs that are out of order. An even count gives sgn = +1, an odd count gives −1.</p>
   <details${N <= 3 ? ' open' : ''}><summary>Show every term</summary><div class="box"><table class="vt"><tr><th>#</th><th>σ</th><th>Inversions</th><th>sgn(σ)</th><th>Product</th><th>Value</th><th>sgn × value</th></tr>${rows}</table></div></details></section>
  <section class="card"><h2><span class="n">3</span>Sum</h2>${FORMULA}
   <div class="ans"><div>det(A) = ${fix(r.det)}</div></div></section>
  ${verifyCard([[r.ok, `The permutation sum equals the determinant by row reduction (${fix(r.det)} and ${fix(r.check)})`]], r.ok, 0)}`;
}

function reportReduction(r) {
  const fl = r.mode === 'float', fact = String(r.factorial).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const head = `${matCard}${mat(A)}</section>
  <section class="card span"><h2><span class="n">2</span>Permutations are not used above ${MAX_N}×${MAX_N}</h2>
   <p class="mut">A ${r.n}×${r.n} matrix has ${fact} permutations, which is too many to list or add. The determinant is found by row reduction instead.</p></section>`;
  if (r.singular) {
    return head + `<section class="card"><h2><span class="n">3</span>Determinant</h2><div class="ans"><div>det(A) = 0</div></div>
     <p class="bad">A is singular, or so ill-conditioned that decimal arithmetic cannot tell.</p></section>`;
  }
  const f = fl ? fmtD : fix;
  const body = `<section class="card"><h2><span class="n">3</span>Determinant</h2><div class="ans"><div>det(A) = ${f(r.det)}</div></div>${fl ? `<p class="mut">Gaussian elimination with partial pivoting in double precision, shown to 4 decimals. Condition number ≈ ${sci(r.cond)}.</p>` : ''}</section>`;
  const items = fl ? [
    [r.err < 1e-6, `det(A) and det(Aᵀ) agree: relative difference ${sci(r.err)} (below 1e−6 counts as equal)`],
    [r.e < 1e-6, `AA⁻¹ = Iₙ: largest difference ${sci(r.e)} (below 1e−6 counts as the identity)`],
    [r.cond < 1e8, `A is well-conditioned: condition number ≈ ${sci(r.cond)}`]
  ] : [[r.ok, `det(A) = det(Aᵀ) by row reduction (${fix(r.det)} and ${fix(r.check)})`]];
  return head + body + verifyCard(items, items.every(q => q[0]), fl ? r.cond : 0);
}

const report = r => r.method === 'perm' ? reportPerm(r) : reportReduction(r);

async function compute() {
  const mine = ++seq;
  try {
    const r = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ A, unlimited: UNLOCK })
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

function askConfirm(title, bullets, okText) {
  return new Promise(res => {
    $('mTitle').textContent = title;
    $('mList').innerHTML = bullets.map(b => `<li>${b}</li>`).join('');
    $('mOk').textContent = okText;
    const m = $('modal');
    m.hidden = false;
    $('mCancel').focus();
    const key = e => { if (e.key === 'Escape') done(false); };
    const done = v => {
      m.hidden = true;
      $('mOk').onclick = $('mCancel').onclick = m.onclick = null;
      document.removeEventListener('keydown', key);
      res(v);
    };
    document.addEventListener('keydown', key);
    $('mOk').onclick = () => done(true);
    $('mCancel').onclick = () => done(false);
    m.onclick = e => { if (e.target === m) done(false); };
  });
}

$('chips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSize(+b.dataset.n); });
$('size').addEventListener('change', () => {
  let v = parseInt($('size').value, 10);
  if (!(v >= 1)) v = N;
  $('sizeNote').textContent = v > LIMIT() ? `The maximum is ${LIMIT()}×${LIMIT()}${UNLOCK ? '' : ' (tick "Remove the 7×7 limit" for more)'}.` : '';
  setSize(Math.min(v, LIMIT()));
});
$('presets').addEventListener('click', e => {
  const p = e.target.dataset.p;
  if (!p) return;
  if (p === 'clear') { A = A.map(r => r.map(() => '0')); build(); }
  else load(PRESETS[p]);
  $('sizeNote').textContent = '';
});
$('form').addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.r === undefined) return;
  A[+el.dataset.r][+el.dataset.c] = el.value;
  clearTimeout(tmr);
  tmr = setTimeout(compute, 150);
});
$('unlock').addEventListener('change', async () => {
  const box = $('unlock');
  if (box.checked) {
    const ok = await askConfirm('Remove the size limit?', [
      '<b>Permutations stop at 7×7.</b> A 10×10 matrix has 3,628,800 permutations and a 30×30 matrix has about 2.7 × 10³², far too many to list or add. Above 7×7 the determinant is found by row reduction instead, and no permutation table is shown.',
      '<b>Exact fractions up to 10×10, decimals above.</b> Decimal arithmetic can build up rounding errors, so the page also shows the condition number and error measures.',
      '<b>The page can slow down.</b> A 30×30 matrix has 900 input cells.',
      'The largest size is 30×30.'
    ], 'Remove the limit');
    if (!ok) { box.checked = false; return; }
    UNLOCK = true;
  } else {
    if (N > MAX_N && !(await askConfirm(`Go back to ${MAX_N}×${MAX_N}?`, [`Your ${N}×${N} matrix will be cut down to ${MAX_N}×${MAX_N}: the extra rows and columns are removed.`], 'Cut it down'))) {
      box.checked = true;
      return;
    }
    UNLOCK = false;
  }
  if (N > LIMIT()) setSize(LIMIT());
  else build();
});

load(PRESETS.sample);