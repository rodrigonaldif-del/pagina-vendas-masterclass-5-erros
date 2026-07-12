// CAPI hook — gera um event_id, dispara o evento Lead pelo servidor (/api/lead-capi)
// e devolve o event_id pro Pixel do navegador usar o MESMO id (deduplicação).
// Chamado no submit do formulário: fbq('track','Lead',{},{eventID: window.__leadCapi(form)})
window.__leadCapi = function (form) {
  try {
    var eid = 'lead.' + Date.now() + '.' + Math.random().toString(36).slice(2);
    var gc = function (n) {
      var m = ('; ' + document.cookie).split('; ' + n + '=');
      return m.length === 2 ? m.pop().split(';').shift() : '';
    };
    var get = function (sel) {
      var el = form && form.querySelector(sel);
      return el ? (el.value || '') : '';
    };
    var data = {
      event_id: eid,
      event_source_url: location.href,
      fbp: gc('_fbp'),
      fbc: gc('_fbc'),
      email: get('[name=email]'),
      phone: get('[name=phone]')
    };
    fetch('/api/lead-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(data)
    });
    return eid;
  } catch (e) {
    return undefined;
  }
};
