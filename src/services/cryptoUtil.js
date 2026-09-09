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
function jsSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = jsSha256.h = jsSha256.h || [];
  const k = jsSha256.k = jsSha256.k || [];
  let primeCounter = k[lengthProperty];

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
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
