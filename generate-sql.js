const crypto = require("crypto");

function sha256(text) {
  return crypto
    .createHash("sha256")
    .update(text)
    .digest("hex");
}

const input = `
12345678 Testing
`;

const rows = input
  .trim()
  .split("\n")
  .map(line => line.trim())
  .filter(Boolean);

const values = rows.map(row => {

  const parts = row.split(/\s+/);

  const nim = parts.shift();

  const name = parts
    .join(" ")
    .replace(/'/g, "''");

  // Password default
  const defaultPassword = `${nim}@Sipil`;

  const passwordHash = sha256(defaultPassword);

  // Recovery code format:
  // 2 digit pertama nim + "_" + 3 digit terakhir nim
  // contoh: 2550031001 -> 25_001
  const angkatan = nim.slice(0, 2);
  const lastThree = nim.slice(-3);

  const recoveryCode = `${angkatan}_${lastThree}`;

  const recoveryHash = sha256(recoveryCode);

  return `('${nim}', '${name}', '${passwordHash}', '${recoveryHash}', true)`;

});

const sql = `
alter table public.students
add column if not exists must_change_password boolean default true;

insert into public.students (
  nim,
  name,
  password_hash,
  recovery_code_hash,
  must_change_password
)
values
${values.join(",\n")}
on conflict (nim) do update set
  name = excluded.name,
  password_hash = excluded.password_hash,
  recovery_code_hash = excluded.recovery_code_hash,
  must_change_password = true,
  updated_at = now();
`;

console.log(sql);