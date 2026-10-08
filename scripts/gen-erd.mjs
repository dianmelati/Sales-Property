// Membuat docs/ERD.md (diagram Mermaid) langsung dari prisma/schema.prisma, supaya tidak pernah usang.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("prisma/schema.prisma", "utf8");
const models = [...src.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map((m) => ({ name: m[1], body: m[2] }));
const enums = new Set([...src.matchAll(/^enum (\w+) \{/gm)].map((m) => m[1]));
const names = new Set(models.map((m) => m.name));
const scalar = (t) => t.replace(/[?\[\]]/g, "");

const entities = [];
const edges = [];
for (const m of models) {
  const attrs = [];
  for (const raw of m.body.split("\n")) {
    const line = raw.trim().replace(/\/\/.*$/, "").trim();
    if (!line || line.startsWith("@@")) continue;
    const [name, type, ...rest] = line.split(/\s+/);
    if (!type) continue;
    const base = scalar(type), tail = rest.join(" ");
    if (names.has(base)) {
      const rel = tail.match(/@relation\([^)]*fields:\s*\[([^\]]+)\]/);
      if (rel && !type.endsWith("[]")) edges.push({ child: m.name, parent: base, optional: type.endsWith("?"), label: name });
      continue;
    }
    const keys = [];
    if (/@id\b/.test(tail)) keys.push("PK");
    if (/@unique\b/.test(tail)) keys.push("UK");
    attrs.push(`    ${enums.has(base) ? "enum" : base} ${name}${keys.length ? " " + keys.join(",") : ""}${type.endsWith("?") ? ' "opsional"' : ""}`);
  }
  entities.push(`  ${m.name} {\n${attrs.join("\n")}\n  }`);
}
const rels = edges.map((e) => `  ${e.parent} ${e.optional ? "|o--o{" : "||--o{"} ${e.child} : "${e.label}"`);
const diagram = `erDiagram\n${rels.join("\n")}\n${entities.join("\n")}\n`;

mkdirSync("docs", { recursive: true });
writeFileSync("docs/erd.mmd", diagram);
writeFileSync("docs/ERD.md", `# Diagram relasi database (ERD)

Dibuat otomatis dari \`prisma/schema.prisma\` oleh \`npm run docs:erd\`. Jangan diedit manual.
${models.length} tabel, ${edges.length} relasi. PK = kunci utama, UK = unik. Hapus lunak (\`deletedAt\`) ada pada Property, Agent, User, dan Media.

\`\`\`mermaid
${diagram}\`\`\`
`);
console.log(`ERD: ${models.length} tabel, ${edges.length} relasi -> docs/ERD.md`);
