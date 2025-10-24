import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QRCode from "qrcode";

/**
 * Payment page with two options:
 * (a) IBAN + copy buttons (shows breakdown + total)
 * (b) SEPA/EPC QR (scannable by NL/EU banking apps)
 *
 * Passes data via react-router location.state: { counts, drinks }
 */

const BENEFICIARY_NAME = "CTG Drinks Fund";
const IBAN = "NL48 INGB 0796 8723 92"; // CTG Drinks Fund IBAN (Currently CR)
const DESCRIPTION_PREFIX = "Lab drinks";

// Build EPC/SEPA QR payload (kept outside the component = pure helper)
function buildEpcQrPayload({ name, iban, amountEUR, remittance }) {
  const serviceTag = "BCD";
  const version = "002";
  const charset = "1";
  const identification = "SCT";
  const bic = ""; // optional nowadays
  const nameLine = (name || "").slice(0, 70);
  const ibanLine = (iban || "").replace(/\s+/g, "");
  const amountLine = typeof amountEUR === "number" ? `EUR${amountEUR.toFixed(2)}` : "";
  const purpose = "";
  const remittanceLine = (remittance || "").slice(0, 140);

  return [
    serviceTag,
    version,
    charset,
    identification,
    bic,
    nameLine,
    ibanLine,
    amountLine,
    purpose,
    remittanceLine,
    "",
  ].join("\n");
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // data from previous page
  const counts = state?.counts || {};
  const drinks = state?.drinks || [];
  const rows = drinks
    .map((d) => ({ ...d, qty: counts[d.id] || 0, line: (counts[d.id] || 0) * d.price }))
    .filter((r) => r.qty > 0);

  const total = rows.reduce((a, r) => a + r.line, 0);
  const remittance = `${DESCRIPTION_PREFIX} – ${rows
    .map((r) => `${r.label}:${r.qty}`)
    .join(", ")} – total ${total.toFixed(2)}`;

  // ---- Hooks MUST be inside the component ----
  // Default to IBAN on mobile as discussed
  const isMobile =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [tab, setTab] = React.useState(isMobile ? "iban" : "qr");
  const [showThankYou, setShowThankYou] = React.useState(false);
  const qrCanvasRef = React.useRef(null);

  // Render QR when tab opens / total changes
  React.useEffect(() => {
    if (tab !== "qr") return;
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const payload = buildEpcQrPayload({
      name: BENEFICIARY_NAME,
      iban: IBAN,
      amountEUR: total,
      remittance,
    });
    QRCode.toCanvas(canvas, payload, { width: 220, errorCorrectionLevel: "M" }, (err) => {
      if (err) console.error(err);
    });
  }, [tab, total, remittance]);

  const formatEUR = (v) => `€${v.toFixed(2)}`;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Copy failed — select and copy manually.");
    }
  };

  // ---- Google Sheets logging (sendBeacon/keepalive) ----
  const LOG_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbyqLcOL8Pq-6c396Bh2_3P41cZED-P2r5KN0V13C7cAK9uek-cqy-hMWanxwZmiG2KV/exec"; // must end with /exec

  async function logToSheet() {
    const payloads = rows.map((row) => ({
      drink: row.label,
      quantity: row.qty,
      price_each: row.price,
      total: row.line,
      payment_description: remittance,
      userAgent: navigator.userAgent,
    }));

    // Prefer sendBeacon (survives navigation)
    if (navigator.sendBeacon) {
      for (const p of payloads) {
        const blob = new Blob([JSON.stringify(p)], { type: "text/plain;charset=utf-8" });
        navigator.sendBeacon(LOG_ENDPOINT, blob);
      }
      await new Promise((r) => setTimeout(r, 150)); // tiny pause to flush
      return;
    }

    // Fallback: fetch keepalive (simple request via text/plain)
    for (const p of payloads) {
      try {
        await fetch(LOG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(p),
          keepalive: true,
          // mode: "no-cors", // uncomment to suppress CORS noise (request still reaches Apps Script)
        });
      } catch (e) {
        console.error("log fetch failed", e);
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  async function handleDone() {
    await logToSheet();
    setShowThankYou(true);
    await new Promise((r) => setTimeout(r, 1200));
    navigate("/");
  }

  // Empty selection guard
  if (!rows.length) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900">
        <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-neutral-200 px-4 py-3">
          <h1 className="text-lg font-semibold">Payment</h1>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <p className="text-sm text-neutral-600">No items to pay. Please log your drinks first.</p>
            <button className="mt-3 rounded-xl border border-neutral-300 px-4 py-2" onClick={() => navigate("/")}>
              Go back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-neutral-200 px-4 py-3">
        <h1 className="text-lg font-semibold">Payment</h1>
        <p className="text-sm text-neutral-600">Choose your payment option</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Breakdown */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Your items</h2>
          <div className="divide-y divide-neutral-200">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2">
                <div className="text-sm">
                  {r.label} <span className="text-neutral-500">× {r.qty}</span>
                </div>
                <div className="text-sm font-medium">{formatEUR(r.line)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-neutral-500">Total</div>
            <div className="text-lg font-semibold">{formatEUR(total)}</div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            className={`rounded-xl px-3 py-2 border ${
              tab === "iban" ? "bg-black text-white border-black" : "border-neutral-300"
            }`}
            onClick={() => setTab("iban")}
          >
            IBAN Transfer
          </button>
          <button
            className={`rounded-xl px-3 py-2 border ${
              tab === "qr" ? "bg-black text-white border-black" : "border-neutral-300"
            }`}
            onClick={() => setTab("qr")}
          >
            SEPA QR
          </button>
        </div>

        {/* (a) IBAN + copy */}
        {tab === "iban" && (
          <section className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Transfer details</h2>
            <div className="text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-500">Beneficiary</span>
                <span>{BENEFICIARY_NAME}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-500">IBAN</span>
                <code className="font-mono">{IBAN}</code>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-500">Amount</span>
                <span>{formatEUR(total)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-500">Description</span>
                <span className="truncate max-w-[60%] text-right">{remittance}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button className="rounded-xl border border-neutral-300 px-3 py-2" onClick={() => copy(IBAN)}>
                Copy IBAN
              </button>
              <button
                className="rounded-xl border border-neutral-300 px-3 py-2"
                onClick={() => copy(`${BENEFICIARY_NAME}\n${IBAN}\nEUR ${total.toFixed(2)}\n${remittance}`)}
              >
                Copy all details
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              On a phone, copying the IBAN/description is usually fastest. You can also use the SEPA QR tab on
              another screen.
            </p>
          </section>
        )}

        {/* (b) SEPA/EPC QR */}
        {tab === "qr" && (
          <section className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Scan to prefill transfer</h2>
            <p className="text-xs text-neutral-600">
              Most NL/EU banking apps support <span className="font-medium">SEPA/EPC QR</span>. Open your banking app’s
              <b> Scan</b> and point it at this code (best on another screen).
            </p>
            <div className="flex items-center gap-3">
              <canvas ref={qrCanvasRef} className="rounded-lg border border-neutral-200" />
              <div className="text-xs text-neutral-500">
                Beneficiary: <b>{BENEFICIARY_NAME}</b>
                <br />
                IBAN: <code className="font-mono">{IBAN}</code>
                <br />
                Amount: <b>{formatEUR(total)}</b>
              </div>
            </div>
          </section>
        )}

        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-neutral-300 px-4 py-2" onClick={() => navigate("/")}>
            Back
          </button>
          <button className="rounded-xl bg-black text-white px-4 py-2" onClick={handleDone}>
            Done
          </button>
        </div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-neutral-500">Money well spent ☕</footer>

      {/* Thank-you overlay */}
      {showThankYou && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl px-6 py-4 text-center shadow-lg text-neutral-800">
            <p className="text-lg font-semibold">Thanks for contributing ☕💚</p>
            <p className="text-sm text-neutral-500 mt-1">You're keeping the lab fueled.</p>
          </div>
        </div>
      )}
    </div>
  );
}
