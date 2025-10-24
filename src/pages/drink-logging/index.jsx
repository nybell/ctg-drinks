import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Log Your Drinks – compact, flexible mix of items
 * - Three options: Beer (€1.50), Wine (€2.00), Liquor (€3.00)
 * - Counters inline with each item
 * - Totals update as a sum across all items
 * - Minimal, clean Tailwind v3 styling
 */

const DRINKS = [
  { id: "beer",   label: "Beer",   price: 2.00 },
  { id: "wine",   label: "Wine",   price: 2.50 },
  { id: "liquor", label: "Liquor", price: 4.00 },
];

export default function DrinkLogging() {
  const [counts, setCounts] = React.useState(() =>
    Object.fromEntries(DRINKS.map((d) => [d.id, 0]))
  );
  const bump = (id, delta) =>
    setCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));

  const totalDrinks = React.useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts]
  );
  const totalAmount = React.useMemo(
    () => DRINKS.reduce((sum, d) => sum + (counts[d.id] || 0) * d.price, 0),
    [counts]
  );

  const navigate = useNavigate();
  const formatEUR = (v) => `€${v.toFixed(2)}`;
  const resetAll = () => setCounts(Object.fromEntries(DRINKS.map(d => [d.id, 0])));

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b border-neutral-200 px-4 py-3">
        <h1 className="text-lg font-semibold">🧠 CTG Lab Drinks 🧬</h1>
        <p className="text-sm text-neutral-600">Enter your drinks and click confirm to go to payment</p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-2xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold mb-3">Log Your Drinks 🍻</h2>

          <div className="space-y-2">
            {DRINKS.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className="text-xs text-neutral-500">€{d.price.toFixed(2)} each</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="w-9 h-9 rounded-lg border border-neutral-300 active:scale-95" onClick={() => bump(d.id, -1)}>−</button>
                  <input
                    className="w-14 text-center rounded-lg border border-neutral-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-neutral-800"
                    type="number"
                    min={0}
                    value={counts[d.id] || 0}
                    onChange={(e) => setCounts(prev => ({ ...prev, [d.id]: Math.max(0, parseInt(e.target.value || "0", 10)) }))}
                  />
                  <button type="button" className="w-9 h-9 rounded-lg border border-neutral-300 active:scale-95" onClick={() => bump(d.id, +1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Total drinks</div>
              <div className="text-lg font-semibold">{totalDrinks}</div>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Amount</div>
              <div className="text-lg font-semibold">€{totalAmount.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-black text-white px-4 py-2 font-medium active:translate-y-px disabled:opacity-50"
              disabled={totalDrinks === 0}
              onClick={() => navigate("/pay", { state: { counts, drinks: DRINKS } })}
            >
              Confirm
            </button>
            <button type="button" className="rounded-xl border border-neutral-300 px-4 py-2 active:translate-y-px" onClick={resetAll}>
              Reset
            </button>
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-neutral-500">💛 Maintained by Cabbage & Amanda 🧬</footer>
    </div>
  );
}