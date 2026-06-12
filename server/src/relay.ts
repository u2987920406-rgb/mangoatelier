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
