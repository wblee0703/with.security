// Web Crypto API (AES-256-GCM) Utility for Client/Server Database Encryption

const ENCRYPTION_SECRET = 'WithSecurity_Master_SecretKey_2026';

async function getKey() {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null;
  }
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(ENCRYPTION_SECRET),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('WithSecurity_Salt_Value'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (e) {
    return null;
  }
}

export async function encryptData(plainText) {
  try {
    if (!plainText) return plainText;
    const key = await getKey();
    if (!key) return plainText;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    const buffer = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + buffer.length);
    combined.set(iv, 0);
    combined.set(buffer, iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption error:', err);
    return plainText;
  }
}

export async function decryptData(cipherText) {
  try {
    if (!cipherText) return cipherText;
    const key = await getKey();
    if (!key) return cipherText;
    const combined = new Uint8Array(
      atob(cipherText).split('').map(c => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption error:', err);
    return cipherText;
  }
}

// Pure-JS SHA-256 fallback when window.crypto.subtle is unavailable (e.g. non-HTTPS mobile web)
function jsSha256(str) {
  function rightRotate(v, amount) {
    return (v >>> amount) | (v << (32 - amount));
  }
  
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const utf8 = unescape(encodeURIComponent(str || ''));
  const words = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }

  const bitLength = utf8.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const W = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      W[t] = words[i + t] | 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += (H[i] >>> 0).toString(16).padStart(8, '0');
  }
  return hex;
}

// SHA-256 One-Way Password Hashing Helper with Salt
export async function hashPassword(plainPassword) {
  try {
    if (!plainPassword) return '';
    const salted = `WithSecurity_SALT_2026_${plainPassword}`;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return jsSha256(salted);
  } catch (err) {
    try {
      return jsSha256(`WithSecurity_SALT_2026_${plainPassword}`);
    } catch (e) {
      return plainPassword;
    }
  }
}

// Password Verification Helper (Salted Hash + Legacy Hash + Direct Match)
export async function verifyPasswordHash(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) return false;
  const inputStr = String(inputPassword).trim();
  const storedStr = String(storedHash).trim();

  // 1. Salted Hash check
  const saltedHash = await hashPassword(inputStr);
  if (saltedHash === storedStr) return true;

  // 2. Legacy Plain SHA-256 check
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(inputStr));
      const legacyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (legacyHash === storedStr) return true;
    } else {
      const legacyHash = jsSha256(inputStr);
      if (legacyHash === storedStr) return true;
    }
  } catch (e) {}

  // 3. Direct match check (for raw admin/1234 credentials)
  if (inputStr === storedStr) return true;

  return false;
}
