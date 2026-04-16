/**
 * Local JWT minting — same HMAC-SHA256 scheme as backend/auth/lambda_function.py (_make_token).
 * Adds Cognito-shaped claims for parity with a future API Gateway + Cognito authorizer setup.
 * Use only with VITE_USE_LOCAL_AUTH=true (never ship a known secret in the browser for real prod).
 */

function b64urlFromBytes(bytes) {
    let bin = '';
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {object} claims
 * @param {{ secret: string, ttlSec?: number }} opts
 * @returns {Promise<string>}
 */
export async function mintLocalAccessToken(claims, opts) {
    const { secret, ttlSec = 86400 * 7 } = opts;
    const now = Math.floor(Date.now() / 1000);
    const phone = claims.phone || '';
    const digits = String(phone).replace(/\D/g, '').slice(-10);
    const sub = claims.sub || (digits ? `local-${digits}` : `local-${now}`);

    const payload = {
        sub,
        iss: claims.iss || 'https://cognito-idp.localhost/local_ap-south-1_localPool',
        aud: claims.aud || 'jansevaai-web-local',
        token_use: 'access',
        client_id: claims.client_id || 'jansevaai-web-local',
        auth_time: now,
        iat: now,
        exp: now + ttlSec,
        username: phone,
        'cognito:username': phone,
        phone,
        role: claims.role || 'citizen',
    };
    if (claims.name) payload.name = claims.name;

    const headerObj = { alg: 'HS256', typ: 'JWT' };
    const header = b64urlFromBytes(new TextEncoder().encode(JSON.stringify(headerObj)));
    const payloadPart = b64urlFromBytes(new TextEncoder().encode(JSON.stringify(payload)));
    const data = `${header}.${payloadPart}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    const signature = b64urlFromBytes(sigBuf);
    return `${data}.${signature}`;
}

/** Decode payload only (no signature check) — useful for debugging / UI. */
export function decodeJwtPayload(token) {
    try {
        const parts = String(token).split('.');
        if (parts.length !== 3) return null;
        let { 1: p } = parts;
        const pad = 4 - (p.length % 4);
        if (pad !== 4) p += '='.repeat(pad);
        const json = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}
