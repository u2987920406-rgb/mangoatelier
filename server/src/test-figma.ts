// Preuve déterministe du pont Figma natif (#7 / idée 25) — la partie pure, sans
// réseau (le bout-à-bout live exige un FIGMA_TOKEN + un vrai fichier). Couvre :
//   - parseFigmaUrl : URL /design|/file → { fileKey, nodeId }, node-id "12-34"→"12:34".
//   - distillDesign : extraction palette/typo/composants/structure d'un arbre.
//   - pickScale : borne de taille d'image (scale 1 vs 2).
//
// Lancer :  npx tsx src/test-figma.ts

import { parseFigmaUrl, distillDesign, pickScale } from "./figma.js";

const line = (c = "─") => console.log(c.repeat(64));
let failures = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

line("═");
console.log("figma — parsing URL + distillation + échelle");
line();

// 1) parseFigmaUrl
console.log("\n  [1] parseFigmaUrl :");
const a = parseFigmaUrl("https://www.figma.com/design/ABC123def/My-File?node-id=12-34&t=x");
check("/design/ → fileKey", a?.fileKey === "ABC123def");
check("node-id '12-34' → '12:34'", a?.nodeId === "12:34");
check("/file/ accepté", parseFigmaUrl("https://figma.com/file/KEY9/Proj?node-id=1-2")?.fileKey === "KEY9");
check("sans node-id → nodeId null", parseFigmaUrl("https://figma.com/design/KEY9/Proj")?.nodeId === null);
check("hôte non-figma → null", parseFigmaUrl("https://evil.com/design/KEY/x?node-id=1-2") === null);
check("texte non-URL → null", parseFigmaUrl("coucou") === null);
check("sous-domaine figma → ok", parseFigmaUrl("https://www.figma.com/design/K/A?node-id=1-1")?.fileKey === "K");

// 2) distillDesign sur une fixture
console.log("\n  [2] distillDesign :");
const fixture = {
  name: "Landing",
  type: "FRAME",
  absoluteBoundingBox: { width: 1440, height: 900 },
  fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }],
  children: [
    {
      name: "Hero",
      type: "FRAME",
      fills: [{ type: "SOLID", color: { r: 0.1, g: 0.2, b: 0.8 } }],
      children: [
        {
          name: "Title",
          type: "TEXT",
          characters: "Bienvenue chez   Mango",
          style: { fontFamily: "Inter", fontWeight: 700, fontSize: 48 },
        },
      ],
    },
    { name: "CTA", type: "INSTANCE" },
  ],
};
const d = distillDesign(fixture);
check("dimensions lues", d.width === 1440 && d.height === 900);
check("palette blanc + bleu", d.palette.includes("#FFFFFF") && d.palette.includes("#1A33CC"));
check("typo capturée", d.typography[0]?.font === "Inter" && d.typography[0]?.size === 48);
check("texte normalisé (espaces)", d.typography[0]?.text === "Bienvenue chez Mango");
check("composant INSTANCE listé", d.components.includes("CTA"));
check("structure (outline) non vide", d.outline.length >= 2);

// 3) pickScale
console.log("\n  [3] pickScale :");
check("petite frame → scale 2", pickScale(1440, 900) === 2);
check("grande frame → scale 1", pickScale(1440, 5000) === 1);

line("═");
console.log(failures === 0 ? "✅ TOUT VERT (0 échec)" : `❌ ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
