// Quick sanity check: verifies ANTHROPIC_API_KEY works by running a trivial agent query.
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY missing. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

console.log("Testing API key with a minimal agent query...");
try {
  for await (const message of query({
    prompt: "Reply with exactly: OK",
    options: { maxTurns: 1, allowedTools: [], model: process.env.MODEL ?? "sonnet" },
  })) {
    if (message.type === "result") {
      if (message.subtype === "success") {
        console.log(`✅ API key works. Cost: $${message.total_cost_usd.toFixed(4)}`);
      } else {
        console.error(`❌ Query failed: ${message.subtype}`);
        process.exit(1);
      }
    }
  }
} catch (err) {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
}
