// Vercel Serverless Function — Meta Conversions API (CAPI) para o evento Lead da Masterclass.
// Recebe os dados do formulário do navegador e envia o mesmo evento Lead pelo servidor,
// com o MESMO event_id do Pixel (deduplicação). O token fica APENAS no ambiente do Vercel.
//
// Variáveis de ambiente necessárias (Vercel > Settings > Environment Variables):
//   META_PIXEL_ID   = 27147741051592454
//   META_CAPI_TOKEN = (token gerado no Gerenciador de Eventos > API de Conversões)

const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}
function normalizePhone(value) {
  // só dígitos; adiciona 55 (Brasil) se vier sem código do país
  let d = String(value).replace(/\D/g, '');
  if (d && d.length <= 11) d = '55' + d;
  return d;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const PIXEL = process.env.META_PIXEL_ID;
  const TOKEN = process.env.META_CAPI_TOKEN;
  if (!PIXEL || !TOKEN) {
    // Ainda não configurado — não quebra nada, só não envia.
    res.status(200).json({ ok: false, skipped: 'missing_env' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '';
    const ua = req.headers['user-agent'] || '';

    const user_data = { client_ip_address: ip, client_user_agent: ua };
    if (body.email) user_data.em = [sha256(body.email)];
    if (body.phone) user_data.ph = [sha256(normalizePhone(body.phone))];
    if (body.fbp) user_data.fbp = body.fbp;
    if (body.fbc) user_data.fbc = body.fbc;

    const payload = {
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.event_id || undefined,
        event_source_url: body.event_source_url || '',
        action_source: 'website',
        user_data: user_data,
        custom_data: { content_name: 'Masterclass RH40 - Inscricao' }
      }]
    };

    const url = 'https://graph.facebook.com/v21.0/' + PIXEL + '/events?access_token=' + encodeURIComponent(TOKEN);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    res.status(200).json({ ok: r.ok, fb: j });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
};
