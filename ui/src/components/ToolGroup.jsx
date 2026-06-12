import { useState } from "react";
import {
  Bot,
  Camera,
  ChevronRight,
  Eye,
  FilePlus2,
  Pencil,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";

const TOOL_ICONS = {
  Write: FilePlus2,
  Edit: Pencil,
  Read: Eye,
  Bash: Terminal,
  Glob: Search,
  Grep: Search,
  Agent: Bot,
  Task: Bot,
  Snapshot: Camera,
};

// History entries arrive as pre-formatted text ("📄 Write src/App.tsx") while
// live SSE events carry { name, detail } — normalize both shapes.
export function parseToolEntry(m) {
  if (m.name) return { name: m.name, detail: m.detail ?? "" };
  const text = (m.text ?? "")
    .replace(/^[^\p{L}\p{N}]+/u, "") // strip the leading emoji
    .trim();
  const [name, ...rest] = text.split(" ");
  return { name: name ?? "", detail: rest.join(" ") };
}

// Consecutive agent tool calls collapsed into one expandable block. While the
// group is still growing (busy), the collapsed header echoes the latest action.
export default function ToolGroup({ items, busy }) {
  const [open, setOpen] = useState(false);
  const last = parseToolEntry(items[items.length - 1]);
  const LastIcon = TOOL_ICONS[last.name] ?? Wrench;

  return (
    <div className="animate-fade-up self-start max-w-[95%] rounded-lg border border-edge-soft bg-bg/60 font-mono text-xs text-dim">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 hover:text-ink transition-colors"
      >
        <ChevronRight size={12} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="shrink-0">
          {items.length} action{items.length > 1 ? "s" : ""}
        </span>
        {!open && (
          <span className={`flex min-w-0 items-center gap-1 text-faint ${busy ? "animate-pulse" : ""}`}>
            <LastIcon size={11} className="shrink-0" />
            <span className="truncate">
              {last.name} {last.detail}
            </span>
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-1 px-3 pb-2">
          {items.map((m, i) => {
            const { name, detail } = parseToolEntry(m);
            const Icon = TOOL_ICONS[name] ?? Wrench;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon size={11} className="shrink-0 text-faint" />
                <span className="truncate">
                  {name} <span className="text-faint">{detail}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
