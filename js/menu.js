/* Menu in alto a destra (⚙️): accesso, suoni, installa l'app, home.
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

  var wrap = document.createElement('span');
  wrap.id = 'barMenu';
  wrap.innerHTML =
    '<button type="button" class="btn icon" id="menuBtn" aria-label="Menu: accesso, suoni e impostazioni" aria-haspopup="true" aria-expanded="false" title="Impostazioni">⚙️<i class="dot" hidden></i></button>' +
    '<div class="menu-pop" id="menuPop" hidden>' +
    '<div class="menu-row"><span class="menu-lab">👤 Account</span><span id="cardAccedi"></span></div>' +
    (FX ? '<div class="menu-row"><span class="menu-lab">🎵 Suoni</span>' + FX.soundButtonHtml() + '</div>' : '') +
    '<button type="button" class="menu-row menu-act" id="menuInstalla" hidden><span class="menu-lab">📲 Installa l\'app</span><span class="hint">sul telefono</span></button>' +
    (inHome ? '' : '<a class="menu-row menu-act" href="' + (location.pathname.split('/').length > 2 ? '../' : './') + '"><span class="menu-lab">🏠 Home</span></a>') +
    '</div>';
  // i vecchi segnaposto delle pagine
  var oldSound = document.getElementById('barSound'); if (oldSound) oldSound.remove();
  var oldAcc = document.getElementById('cardAccedi'); if (oldAcc) oldAcc.remove();
  bar.appendChild(wrap);
  if (FX) FX.bindSoundButton();

  var btn = document.getElementById('menuBtn'), pop = document.getElementById('menuPop');
  function apri(on) { pop.hidden = !on; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); apri(pop.hidden); });
  document.addEventListener('click', function (e) { if (!pop.hidden && !wrap.contains(e.target)) apri(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') apri(false); });

  // pallino verde quando si è dentro
  function dot() { var u = window.Account && window.Account.utente(); document.querySelector('#menuBtn .dot').hidden = !u; btn.title = u ? 'Account: ' + u.nome : 'Impostazioni'; }
  window.addEventListener('testqi:account', dot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dot); else dot();

  // installa l'app (vedi js/pwa.js)
  var inst = document.getElementById('menuInstalla');
  function aggInst() { inst.hidden = !(window.PWA && window.PWA.possibile()); }
  window.addEventListener('testqi:pwa', aggInst);
  inst.addEventListener('click', function () { apri(false); if (window.PWA) window.PWA.installa(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aggInst); else aggInst();
})();
