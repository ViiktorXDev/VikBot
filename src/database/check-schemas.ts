// src/database/check-schemas.ts
import fs from "fs";
import path from "path";

const schemasDir = path.resolve("./src/database/schemas");
const indexFile = path.resolve("./src/database/schemas/index.ts");

const schemaFiles = fs
  .readdirSync(schemasDir)
  .filter((f) => f.endsWith(".schema.ts"));

const indexContent = fs.readFileSync(indexFile, "utf-8");

const missing = schemaFiles.filter((file) => {
  const exportLine = `./${file.replace(".ts", ".js")}`;
  return !indexContent.includes(exportLine);
});

if (missing.length > 0) {
  console.error("❌ Schemas não exportados no index.ts:");
  missing.forEach((f) => console.error(`   → ${f}`));
  console.error("\nAdicione os exports antes de rodar as migrations.");
  process.exit(1);
}

console.log("✅ Todos os schemas estão exportados!");
