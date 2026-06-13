// Injects a tiny script into generated apps that reports runtime errors to
// the builder UI (window.parent) so the user can one-click ask for a fix.
// Idempotent: runs on every chat/preview, injects only once per project.
import path from "node:path";
import fs from "node:fs";

const SCRIPT = `    <script data-mangoai="error-relay">
      // MangoAI error relay - reports runtime errors to the builder UI
      (function () {
        function report(message) {
          try {
            window.parent.postMessage(
              { source: "mangoai-preview", message: String(message).slice(0, 2000) },
              "*"
            );
          } catch (_) {}
        }
        window.addEventListener("error", function (e) {
          report(e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : ""));
        });
        window.addEventListener("unhandledrejection", function (e) {
          var r = e.reason;
          report("Unhandled promise rejection: " + (r && r.message ? r.message : r));
        });
      })();
    </script>`;

export function ensureErrorRelay(dir: string): void {
  const file = path.join(dir, "index.html");
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, "utf8");
  if (html.includes('data-mangoai="error-relay"')) return;
  const updated = html.includes("</head>")
    ? html.replace("</head>", `${SCRIPT}\n  </head>`)
    : `${SCRIPT}\n${html}`;
  fs.writeFileSync(file, updated);
}

// Relais clic → source (#5) : en "mode inspection", un clic sur l'aperçu remonte
// au builder le data-mango-src (fichier:ligne) posé par le tampon Babel
// (clicksource.ts). C'est la moitié VIVANTE du pont pixel→code : l'utilisateur
// clique l'aperçu RÉEL qu'il voit, le DOM réel répond — pas de Playwright, pas
// de vision. Le builder bascule le mode via postMessage("mangoai-builder").
const INSPECT_SCRIPT = `    <script data-mangoai="inspect-relay">
      // MangoAI inspect relay - click -> source (file:line) for visual editing
      (function () {
        var ON = false;
        function setMode(on) {
          ON = on;
          document.documentElement.style.cursor = on ? "crosshair" : "";
        }
        window.addEventListener("message", function (e) {
          var d = e.data;
          if (!d || d.source !== "mangoai-builder") return;
          if (d.type === "inspect-on") setMode(true);
          else if (d.type === "inspect-off") setMode(false);
        });
        window.addEventListener(
          "click",
          function (e) {
            if (!ON) return;
            e.preventDefault();
            e.stopPropagation();
            var node = e.target;
            var el = node && node.closest ? node.closest("[data-mango-src]") : null;
            var ref = el || node;
            var r = ref.getBoundingClientRect();
            try {
              window.parent.postMessage(
                {
                  source: "mangoai-preview",
                  type: "inspect-pick",
                  src: el ? el.getAttribute("data-mango-src") : null,
                  tag: ref.tagName ? ref.tagName.toLowerCase() : "?",
                  text: (ref.textContent || "").slice(0, 80).trim(),
                  rect: { x: r.left, y: r.top, width: r.width, height: r.height },
                },
                "*"
              );
            } catch (_) {}
            setMode(false); // un clic = une sélection
          },
          true
        );
      })();
    </script>`;

export function ensureInspectRelay(dir: string): void {
  const file = path.join(dir, "index.html");
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, "utf8");
  if (html.includes('data-mangoai="inspect-relay"')) return;
  const updated = html.includes("</head>")
    ? html.replace("</head>", `${INSPECT_SCRIPT}\n  </head>`)
    : `${INSPECT_SCRIPT}\n${html}`;
  fs.writeFileSync(file, updated);
}
