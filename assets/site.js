(() => {
  const RANK = { red: 3, yellow: 2, green: 1, black: 0, none: -1 };

  function setStatus(el, colour, text) {
    if (!el) return;
    const changed = el.dataset.c !== colour || el.textContent !== text;
    el.dataset.c = colour;
    el.textContent = text;
    if (changed) {
      el.classList.remove('is-changed');
      void el.offsetWidth; // restart the pulse
      el.classList.add('is-changed');
    }
  }

  const worst = (...list) => list.reduce((a, b) => (RANK[b[0]] > RANK[a[0]] ? b : a));

  // Simplified demo: each supply is compared with the demand it covers (later date, smaller quantity, nothing at all).
  const START = {
    va: { doc: 'Verkaufsauftrag VA-1042 · Zeile 10000', item: 'SG-200 Steuergerät', dl: 'Warenausgang', date: '2026-11-13', qty: 40, lvl: 0 },
    fa: { doc: 'Fertigungsauftrag FA-3077', item: 'SG-200 Steuergerät', dl: 'Ende', date: '2026-11-11', qty: 40, lvl: 1 },
    lp: { doc: 'Komponente LP-80 Leiterplatte', item: '', dl: 'Bedarf', date: '2026-11-06', qty: 40, lvl: 2 },
    eb: { doc: 'Einkaufsbestellung EB-5521', item: 'LP-80 · Kreditor K-40010 Musterelektronik', dl: 'Wareneingang', date: '2026-11-04', qty: 40, lvl: 3 },
    gh: { doc: 'Komponente GH-50 Gehäuse', item: '', dl: 'Bedarf', date: '2026-11-06', qty: 40, lvl: 2 },
    st: { doc: 'Lagerbestand Lagerort HAUPT', item: 'GH-50', dl: null, date: null, qty: 120, lvl: 3 },
  };
  const ORDER = ['va', 'fa', 'lp', 'eb', 'gh', 'st'];

  const edge = (supply, demand, stock) => {
    if (supply.qty <= 0) return { none: true, date: false, qty: false, stock };
    return { none: false, date: !!(supply.date && demand.date && supply.date > demand.date), qty: supply.qty < demand.qty, stock };
  };
  const union = (a, b) => ({ none: a.none || b.none, date: a.date || b.date, qty: a.qty || b.qty, stock: a.stock && b.stock });
  const resolve = (f) => {
    if (f.none) return ['red', 'Keine Versorgung'];
    if (f.date && f.qty) return ['yellow', 'Datum & Menge'];
    if (f.date) return ['yellow', 'Datumsabweichung'];
    if (f.qty) return ['yellow', 'Fehlende Menge'];
    return f.stock ? ['green', 'Auf Lager'] : ['green', 'In Bearbeitung'];
  };
  const fmt = (d) => d.split('-').reverse().join('.');

  const chain = document.querySelector('[data-chain]');
  if (chain) {
    const tree = chain.querySelector('[data-tree]');
    const dateIn = chain.querySelector('#node-date');
    const qtyIn = chain.querySelector('#node-qty');
    let m = structuredClone(START);
    let sel = 'eb';
    const rows = {};

    for (const id of ORDER) {
      const li = document.createElement('li');
      li.style.setProperty('--lvl', m[id].lvl);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'node';
      btn.dataset.node = id;
      const text = document.createElement('span');
      const doc = document.createElement('span');
      doc.className = 'node-doc';
      doc.textContent = m[id].doc;
      const meta = document.createElement('span');
      meta.className = 'node-meta';
      text.append(doc, meta);
      const status = document.createElement('span');
      status.className = 'status';
      btn.append(text, status);
      btn.addEventListener('click', () => { sel = id; fill(); update(); });
      li.append(btn);
      tree.append(li);
      rows[id] = { btn, meta, status };
    }

    const fill = () => {
      const n = m[sel];
      chain.querySelector('[data-selected]').textContent = `Ausgewählt: ${n.doc}`;
      chain.querySelector('[data-date-wrap]').hidden = !n.dl;
      chain.querySelector('[data-date-label]').textContent = n.dl || '';
      dateIn.value = n.date || '';
      qtyIn.value = n.qty;
    };

    const update = () => {
      const eb = edge(m.eb, m.lp, false);
      const st = edge(m.st, m.gh, true);
      const fa = union(eb, st);
      const va = union(fa, edge(m.fa, m.va, false));
      const out = { eb: resolve(eb), lp: resolve(eb), st: resolve(st), gh: resolve(st), fa: resolve(fa), va: resolve(va) };
      for (const id of ORDER) {
        const n = m[id];
        rows[id].meta.textContent = [n.item, `${n.qty} Stk`, n.date ? `${n.dl} ${fmt(n.date)}` : ''].filter(Boolean).join(' · ');
        setStatus(rows[id].status, ...out[id]);
        rows[id].btn.setAttribute('aria-pressed', String(id === sel));
      }
      setStatus(chain.querySelector('[data-line-status]'), ...out.va);
      setStatus(chain.querySelector('[data-doc-status]'), ...worst(out.va, ['green', 'Auf Lager']));
    };

    dateIn.addEventListener('input', () => { if (dateIn.value) { m[sel].date = dateIn.value; update(); } });
    qtyIn.addEventListener('input', () => {
      const qty = Math.max(0, Number(qtyIn.value) || 0);
      // components follow the production quantity pro rata
      if (sel === 'fa') for (const c of ['lp', 'gh']) m[c].qty = Math.round(START[c].qty * qty / START.fa.qty);
      m[sel].qty = qty;
      update();
    });
    chain.querySelector('.chain__reset').addEventListener('click', () => { m = structuredClone(START); fill(); update(); });
    fill();
    update();
  }

  const live = document.querySelector('[data-live-row]');
  if (live) {
    live.querySelector('[data-calc]').addEventListener('click', () => {
      setStatus(live.querySelector('.status'), 'yellow', 'Datumsabweichung');
      live.querySelector('tr.is-hover')?.classList.remove('is-hover');
      live.querySelector('[data-calc]').textContent = 'Erneut berechnen';
      document.querySelectorAll('[data-doc-result] [data-set]').forEach((el) => setStatus(el, ...el.dataset.set.split('|')));
    });
  }

  const form = document.querySelector('[data-contact]');
  if (form) {
    form.addEventListener('submit', (e) => {
      const email = form.elements.email;
      if (!email.checkValidity()) return;
      e.preventDefault();
      const subject = 'Pilotprojekt Demand Chain Analyzer';
      const body = `Bitte kontaktieren Sie mich zum Demand Chain Analyzer.\n\nMeine E-Mail-Adresse: ${email.value}`;
      window.location.href = `mailto:support@draftpartners.at?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  const time = document.querySelector('[data-time]');
  if (time) {
    const fmt = new Intl.DateTimeFormat('de-AT', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit' });
    const tick = () => { time.textContent = `${fmt.format(new Date())} Uhr`; };
    tick();
    setInterval(tick, 30000);
  }

  const reveal = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add('is-in'));
  }
})();
