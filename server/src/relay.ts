// Injects a tiny script into generated apps that reports runtime errors to
// the builder UI (window.parent) so the user can one-click ask for a fix.
// Idempotent: runs on every chat/preview, injects only once per project.
import path from "node:path";
import fs from "node:fs";

const SCRIPT = `    <script data-mangoos="error-relay">
      // MangoOS error relay - reports runtime errors to the builder UI
      (function () {
        function report(message) {
          try {
            window.parent.postMessage(
              { source: "mangoos-preview", message: String(message).slice(0, 2000) },
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
  if (html.includes('data-mangoos="error-relay"')) return;
  const updated = html.includes("</head>")
    ? html.replace("</head>", `${SCRIPT}\n  </head>`)
    : `${SCRIPT}\n${html}`;
  fs.writeFileSync(file, updated);
}

// Relais clic → source (#5) : en "mode inspection", un clic sur l'aperçu remonte
// au builder le data-mango-src (fichier:ligne) posé par le tampon Babel
// (clicksource.ts). C'est la moitié VIVANTE du pont pixel→code : l'utilisateur
// clique l'aperçu RÉEL qu'il voit, le DOM réel répond — pas de Playwright, pas
// de vision. Le builder bascule le mode via postMessage("mangoos-builder").
const INSPECT_SCRIPT = `    <script data-mangoos="inspect-relay">
      // MangoOS inspect relay - hover highlight + click -> source (file:line)
      (function () {
        var ON = false;
        // Hover throttle state
        var _rafPending = false;
        var _lastEl = null;
        var _lastRectKey = "";

        function setMode(on) {
          ON = on;
          document.documentElement.style.cursor = on ? "crosshair" : "";
          if (!on) {
            // Clear hover overlay when mode turns off
            _lastEl = null;
            _lastRectKey = "";
            try {
              window.parent.postMessage(
                { source: "mangoos-preview", type: "inspect-hover", rect: null },
                "*"
              );
            } catch (_) {}
          }
        }

        window.addEventListener("message", function (e) {
          var d = e.data;
          if (!d || d.source !== "mangoos-builder") return;
          if (d.type === "inspect-on") setMode(true);
          else if (d.type === "inspect-off") setMode(false);
        });

        // Hover: emit inspect-hover per frame, deduplicated
        window.addEventListener("mousemove", function (e) {
          if (!ON) return;
          if (_rafPending) return;
          _rafPending = true;
          requestAnimationFrame(function () {
            _rafPending = false;
            if (!ON) return;
            var node = e.target;
            var el = node && node.closest ? node.closest("[data-mango-src]") : null;
            var ref = el || node;
            // Dedup: skip if same element and same position
            var rectKey = "";
            if (ref) {
              var rr = ref.getBoundingClientRect();
              rectKey = rr.left + "," + rr.top + "," + rr.width + "," + rr.height;
            }
            if (ref === _lastEl && rectKey === _lastRectKey) return;
            _lastEl = ref;
            _lastRectKey = rectKey;
            if (!ref) return;
            var r = ref.getBoundingClientRect();
            try {
              window.parent.postMessage(
                {
                  source: "mangoos-preview",
                  type: "inspect-hover",
                  rect: { x: r.left, y: r.top, width: r.width, height: r.height },
                  tag: ref.tagName ? ref.tagName.toLowerCase() : "?",
                  src: el ? el.getAttribute("data-mango-src") : null,
                },
                "*"
              );
            } catch (_) {}
          });
        }, true);

        // Clear overlay when the mouse leaves the iframe document
        document.addEventListener("mouseleave", function () {
          if (!ON) return;
          _lastEl = null;
          _lastRectKey = "";
          try {
            window.parent.postMessage(
              { source: "mangoos-preview", type: "inspect-hover", rect: null },
              "*"
            );
          } catch (_) {}
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
                  source: "mangoos-preview",
                  type: "inspect-pick",
                  src: el ? el.getAttribute("data-mango-src") : null,
                  tag: ref.tagName ? ref.tagName.toLowerCase() : "?",
                  text: (ref.textContent || "").slice(0, 80).trim(),
                  rect: { x: r.left, y: r.top, width: r.width, height: r.height },
                },
                "*"
              );
            } catch (_) {}
            // Clear hover overlay immediately after pick
            _lastEl = null;
            _lastRectKey = "";
            try {
              window.parent.postMessage(
                { source: "mangoos-preview", type: "inspect-hover", rect: null },
                "*"
              );
            } catch (_) {}
            setMode(false); // one click = one selection
          },
          true
        );
      })();
    </script>`;

export function ensureInspectRelay(dir: string): void {
  const file = path.join(dir, "index.html");
  if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, "utf8");
  if (html.includes('data-mangoos="inspect-relay"')) return;
  const updated = html.includes("</head>")
    ? html.replace("</head>", `${INSPECT_SCRIPT}\n  </head>`)
    : `${INSPECT_SCRIPT}\n${html}`;
  fs.writeFileSync(file, updated);
}
