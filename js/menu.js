/* Barra: casetta 🏠 a sinistra (pagine interne), pulsante Accedi/nome e ⚙️ (suoni, installa l'app) a destra.
 * Si monta da solo nella barra (.bar-in) di ogni pagina. Dentro crea <span id="cardAccedi">,
 * dove js/account.js mette il pulsante "Accedi", e il pulsante suoni di sfide/effetti.js
 * (id soundBtn, così le pagine di gioco non lo creano due volte).
 * Va incluso dopo effetti.js e prima degli script della pagina.
 */
(function () {
  'use strict';
  var bar = document.querySelector('.bar .bar-in');
  if (!bar || document.getElementById('barMenu')) return;
  var inHome = /^\/(index\.html)?$/.test(location.pathname);
  var FX = window.Effetti;

  var home = location.pathname.split('/').length > 2 ? '../' : './';
  // casetta a sinistra nelle pagine interne
  if (!inHome) {
    var casa = document.createElement('a');
    casa.className = 'btn icon home-btn'; casa.href = home; casa.setAttribute('aria-label', 'Torna alla home'); casa.title = 'Home'; casa.textContent = '🏠';
    bar.insertBefore(casa, bar.firstChild);
  }
  var wrap = document.createElement('span');
  wrap.id = 'barMenu';
  wrap.innerHTML =
    '<span id="cardAccedi"></span>' +
    '<button type="button" class="btn icon" id="menuBtn" aria-label="Impostazioni: suoni e app" aria-haspopup="true" aria-expanded="false" title="Impostazioni">⚙️</button>' +
    '<div class="menu-pop" id="menuPop" hidden style="display:none">' +
    (FX ? '<div class="menu-row"><span class="menu-lab">🎵 Suoni</span>' + FX.soundButtonHtml() + '</div>' : '') +
    '<button type="button" class="menu-row menu-act" id="menuInstalla" hidden style="display:none"><span class="menu-lab">📲 Installa l\'app</span><span class="hint">sul telefono</span></button>' +
    '</div>';
  // i vecchi segnaposto delle pagine
  var oldSound = document.getElementById('barSound'); if (oldSound) oldSound.remove();
  var oldAcc = document.getElementById('cardAccedi'); if (oldAcc) oldAcc.remove();
  bar.appendChild(wrap);
  if (FX) FX.bindSoundButton();

  var btn = document.getElementById('menuBtn'), pop = document.getElementById('menuPop');
  function apri(on) { pop.hidden = !on; pop.style.display = on ? '' : 'none'; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  apri(false);
  btn.addEventListener('click', function (e) { e.stopPropagation(); apri(pop.hidden); });
  document.addEventListener('click', function (e) { if (!pop.hidden && !wrap.contains(e.target)) apri(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') apri(false); });

  // installa l'app (vedi js/pwa.js)
  var inst = document.getElementById('menuInstalla');
  function aggInst() { var ok = !!(window.PWA && window.PWA.possibile()); inst.hidden = !ok; inst.style.display = ok ? '' : 'none'; }
  window.addEventListener('testqi:pwa', aggInst);
  inst.addEventListener('click', function () { apri(false); if (window.PWA) window.PWA.installa(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aggInst); else aggInst();
})();
