// Create the admin user john@telning.com in Supabase Auth (email confirmed) and add it to admin_users.
// The password is random (24 characters, crypto) and is written to .admin-credentials.local (git-ignored), never printed
// to a log file. Needs SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) in the environment:
//   SUPABASE_SERVICE_ROLE_KEY=… node scripts/create-admin.mjs [email]
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createUser, upsert, hasDb } from '../server/supabase.js';

const email = (process.argv[2] || 'john@telning.com').toLowerCase();
const FILE = new URL('../.admin-credentials.local', import.meta.url);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_.!?';
const password = Array.from(randomBytes(24), (b) => alphabet[b % alphabet.length]).join('');
const existing = existsSync(FILE) ? readFileSync(FILE, 'utf8') : '';
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

if (!hasDb()) {
  writeFileSync(FILE, `${existing}${existing ? '\n' : ''}# ${stamp} — prepared, NOT created yet (no SUPABASE_SERVICE_ROLE_KEY on this machine)\nlogin: https://telning.com/admin\nemail: ${email}\npassword: ${password}\n`);
  console.log(`No SUPABASE_SERVICE_ROLE_KEY. A password was prepared in .admin-credentials.local; run this script again with the key to create the user.`);
  process.exit(0);
}
const r = await createUser({ email, password });
if (!r.ok) { console.error('create user failed', r.status, r.data?.msg || r.data?.message || ''); process.exit(1); }
const userId = r.data.id;
const a = await upsert('admin_users', [{ user_id: userId, email, role: 'admin' }], 'user_id');
if (!a.ok) { console.error('admin_users insert failed', a.status, a.data); process.exit(1); }
writeFileSync(FILE, `${existing}${existing ? '\n' : ''}# ${stamp} — created in Supabase (email confirmed)\nlogin: https://telning.com/admin\nemail: ${email}\npassword: ${password}\n`);
console.log(`Admin ${email} created. Password written to .admin-credentials.local (not in git).`);
