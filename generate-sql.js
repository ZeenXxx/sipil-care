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

  const defaultPassword = `${nim}@Sipil`;

  const passwordHash = sha256(defaultPassword);

  const recoveryHash = sha256(nim);

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