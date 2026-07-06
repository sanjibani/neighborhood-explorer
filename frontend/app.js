// Phase 0 — wire the "Test MiniMax round-trip" button.
const btn = document.getElementById("echo-btn");
const out = document.getElementById("echo-out");

btn?.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Calling MiniMax...";
  out.classList.remove("hidden");
  out.textContent = "...";
  try {
    const res = await fetch("/api/echo-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Reply with one short sentence describing what a neighborhood comparison app does.",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    out.textContent = `Prompt:  ${data.prompt}\n\nReply:   ${data.completion}`;
  } catch (err) {
    out.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Test MiniMax round-trip";
  }
});

// Health check on load — proves the API is alive.
fetch("/api/health")
  .then((r) => r.json())
  .then((data) => console.log("health:", data))
  .catch((err) => console.warn("health check failed:", err));