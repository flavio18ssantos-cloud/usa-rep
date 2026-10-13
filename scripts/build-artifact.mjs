// Gera dist/artifact.html: arquivo único (título + estilo + corpo + script) para publicar como artefato.
// Uso: node scripts/build-artifact.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const js = readFileSync(join(root, "app.js"), "utf8");

const title = html.match(/<title>(.*?)<\/title>/)[1];
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/)[0];
const body = html.split("<!-- BODY-START -->")[1].split("<!-- BODY-END -->")[0];

const out = `<title>${title}</title>
${fonts}
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "artifact.html"), out);
console.log("dist/artifact.html gerado (" + (out.length / 1024).toFixed(0) + " KB)");
