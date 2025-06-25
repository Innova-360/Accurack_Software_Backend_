// Generates a secure random password with a mix of upper, lower, digits, and symbols
export function generateRandomPassword(length: number = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  const all = upper + lower + digits + symbols;

  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password to avoid predictable character positions
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}
