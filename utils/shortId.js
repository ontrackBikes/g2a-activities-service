const crypto = require("crypto");

// Crockford-style alphabet, excludes ambiguous chars (0/O, 1/I/L, U)
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateOrderId() {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `ORD-${code}`;
}

module.exports = { generateOrderId };
