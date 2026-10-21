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

  // Leaf rule mirrors the app: supply later than the demand date and/or a different quantity.
  function leafStatus(receipt, qty, needDate, needQty) {
    const dateDiff = receipt !== '' && receipt > needDate;
    const qtyDiff = Number(qty) !== needQty;
    if (dateDiff && qtyDiff) return ['red', 'Kritisches Datum & Menge'];
    if (dateDiff) return ['yellow', 'Datumsabweichung'];
    if (qtyDiff) return ['yellow', 'Fehlende Menge'];
    return ['green', 'In Bearbeitung'];
  }

  const worst = (...list) => list.reduce((a, b) => (RANK[b[0]] > RANK[a[0]] ? b : a));

  const chain = document.querySelector('[data-chain]');
  if (chain) {
    const date = chain.querySelector('#eb-date');
    const qty = chain.querySelector('#eb-qty');
    const s = (id) => chain.querySelector(`[data-node="${id}"] .status`);
    const defaults = { date: date.value, qty: qty.value };

    const update = () => {
      const eb = leafStatus(date.value, qty.value, '2026-11-06', 80);
      const stock = ['green', 'Auf Lager'];
      setStatus(s('eb'), ...eb);
      setStatus(s('sp'), ...eb);
      setStatus(s('stock'), ...stock);
      setStatus(s('lr'), ...stock);
      const top = worst(eb, stock);
      setStatus(s('fa'), ...top);
      setStatus(s('va'), ...top);
      setStatus(chain.querySelector('[data-readout] .status'), ...top);
      chain.querySelector('[data-node="eb"]').classList.toggle('is-hot', top[0] !== 'green');
    };

    date.addEventListener('input', update);
    qty.addEventListener('input', update);
    chain.querySelector('.chain__reset').addEventListener('click', () => {
      date.value = defaults.date;
      qty.value = defaults.qty;
      update();
    });
    update();
  }

  const live = document.querySelector('[data-live-row]');
  if (live) {
    live.querySelector('[data-calc]').addEventListener('click', () => {
      setStatus(live.querySelector('.status'), 'yellow', 'Datumsabweichung');
      live.querySelector('tr.is-hover')?.classList.remove('is-hover');
      live.querySelector('[data-calc]').textContent = 'Erneut berechnen';
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
