const fs = require("fs");
const crypto = require("crypto");

const targetHash =
  "fc73e1b1ccdd9c0c36afc5a63a1aab01af121078b97e294577b589906c2f484d";

const wordlistPath = "wordlist.txt";

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

const words = fs.readFileSync(wordlistPath, "utf8")
  .split(/\r?\n/)
  .map(w => w.trim())
  .filter(Boolean);

let found = false;

for (const word of words) {
  if (sha256(word) === targetHash) {
    console.log("KETEMU!");
    console.log("Plaintext:", word);
    found = true;
    break;
  }
}

if (!found) {
  console.log("Tidak ketemu di wordlist.");
}