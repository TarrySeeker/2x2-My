// Генерация bcrypt-hash для пароля admin user из seed.sql.
//
// Запуск (из корня проекта):
//   node scripts/generate-admin-hash.mjs
//   node scripts/generate-admin-hash.mjs mypassword   # свой пароль
//
// Результат вставляется в db/seed.sql -> users.password_hash.
// Cost factor 12 — текущий ORM-стандарт безопасности для bcrypt.
// Приложение проверяет пароль через bcrypt.compare, поэтому hash можно
// пересоздавать сколько угодно раз — главное не трогать уже активные пароли.

import bcrypt from "bcryptjs";

const password = process.argv[2] ?? "admin123";
const cost = 12;

const hash = await bcrypt.hash(password, cost);

// Проверяем, что hash действительно парсится обратно.
const ok = await bcrypt.compare(password, hash);
if (!ok) {
  console.error("FATAL: bcrypt.compare failed for freshly generated hash");
  process.exit(1);
}

console.log(hash);
