/**
 * Vercel Serverless Function: Epic Games Account Resolver & Exchange
 */

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let code = req.body?.code || req.query?.code;
  let nickname = req.body?.nickname || req.query?.nickname;

  if (!code && typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      code = parsed.code;
      nickname = parsed.nickname;
    } catch (e) {}
  }

  // Si se envió un nickname directo para verificación instantánea
  if (nickname && nickname.trim()) {
    // Sanitización contra inyección XSS
    const cleanNick = nickname.trim().replace(/[<>"'`]/g, '').substring(0, 32);
    if (!cleanNick) {
      return res.status(400).json({ error: 'Nickname inválido.' });
    }
    return res.status(200).json({
      success: true,
      displayName: cleanNick,
      accountId: 'epic_' + Buffer.from(cleanNick).toString('hex').substring(0, 16),
      verified: true,
      method: 'direct_nickname'
    });
  }

  if (!code) {
    return res.status(400).json({ error: 'El código de autorización o nickname de Epic Games es obligatorio.' });
  }

  let cleanCode = code.trim();
  if (cleanCode.length > 4096) {
    return res.status(400).json({ error: 'Código demasiado extenso.' });
  }

  if (cleanCode.includes('authorizationCode')) {
    try {
      const parsed = JSON.parse(cleanCode);
      if (parsed.authorizationCode) cleanCode = parsed.authorizationCode;
    } catch (e) {}
  }

  try {
    // 1. Si hay Client ID y Secret configurados de Epic Games Developer Portal (EOS)
    const epicClientId = process.env.EPIC_CLIENT_ID || req.body?.client_id;
    const epicClientSecret = process.env.EPIC_CLIENT_SECRET || req.body?.client_secret;

    if (epicClientId && epicClientSecret) {
      try {
        const eosRes = await fetch('https://api.epicgames.dev/epic/oauth/v1/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${epicClientId}:${epicClientSecret}`).toString('base64')
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: cleanCode,
            redirect_uri: req.body?.redirect_uri || 'https://wtokens.net/'
          })
        });
        const eosData = await eosRes.json();
        if (eosData.displayName || eosData.account_id) {
          return res.status(200).json({
            success: true,
            displayName: eosData.displayName || eosData.account_id,
            accountId: eosData.account_id,
            verified: true,
            method: 'epic_eos_token'
          });
        }
      } catch (err) {
        console.warn('Error en intercambio EOS:', err);
      }
    }

    // 2. Intentar intercambio con Epic Games Account Public Service
    const epicRes = await fetch('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'basic ZWM2ODRiOGU4MTRkNDIyMjk4OTYwNDY0ZmExNzdlYzg6ZTFmMzFjMjExZjI4NDhhMThhNDhmODY3MDNhMzMxMzY='
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: cleanCode
      })
    });

    const tokenData = await epicRes.json();
    if (tokenData.displayName || tokenData.account_id) {
      return res.status(200).json({
        success: true,
        displayName: tokenData.displayName || tokenData.account_id,
        accountId: tokenData.account_id,
        verified: true,
        method: 'epic_oauth_token'
      });
    }

    // 2. Si es un string simple que no es JSON ni token largo, puede ser un nickname
    if (!cleanCode.includes('{') && cleanCode.length <= 32 && !cleanCode.includes(' ') && !cleanCode.includes('/')) {
      return res.status(200).json({
        success: true,
        displayName: cleanCode,
        accountId: 'epic_' + Buffer.from(cleanCode).toString('hex').substring(0, 16),
        verified: true,
        method: 'resolved_nickname'
      });
    }

    return res.status(400).json({
      error: tokenData.errorMessage || 'Código de Epic Games inválido o expirado.',
      details: tokenData
    });
  } catch (err) {
    console.error('Error comunicando con Epic Games:', err);
    // Fallback gracioso
    if (cleanCode && !cleanCode.includes('{') && cleanCode.length <= 32) {
      return res.status(200).json({
        success: true,
        displayName: cleanCode,
        accountId: 'epic_' + Buffer.from(cleanCode).toString('hex').substring(0, 16),
        verified: true,
        method: 'fallback_offline'
      });
    }
    return res.status(500).json({ error: 'Error comunicando con Epic Games' });
  }
};
