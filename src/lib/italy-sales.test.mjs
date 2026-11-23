import { test } from "node:test";
import assert from "node:assert/strict";
import { filterItalySales, formatItalyEur, summarizeItalySales } from "./italy-sales.ts";

const payment = (id, status, amount_cents, extra = {}) => ({
  id,
  order_id: `order-${id}`,
  user_id: `user-${id}`,
  plan_id: "music_full",
  price_id: "price_live_eur",
  amount_cents,
  currency: "eur",
  session_id: `session-${id}`,
  status,
  paid_at: status === "paid" ? "2026-11-23T12:00:00Z" : null,
  created_at: "2026-11-23T11:00:00Z",
  updated_at: "2026-11-23T12:00:00Z",
  ...extra,
});

const rows = [
  { ...payment("paid-1", "paid", 1999), order: { song_title: "Per Giulia", music_style: "pop", language: "it" }, profile: { name: "Marco Rossi" } },
  { ...payment("paid-2", "paid", 2499), order: { song_title: "Ancora Noi", music_style: "rock", language: "it" }, profile: { name: "Luca Bianchi" } },
  { ...payment("open", "open", 1999), order: null, profile: null },
  { ...payment("creating", "creating", 1999), order: null, profile: null },
  { ...payment("failed", "failed", 1999), order: null, profile: null },
  { ...payment("expired", "expired", 1999), order: null, profile: null },
];

test("somente pagamentos pagos entram no faturamento EUR", () => {
  const summary = summarizeItalySales(rows);
  assert.equal(summary.paidRevenueCents, 4498);
  assert.equal(summary.paidCount, 2);
  assert.equal(formatItalyEur(summary.paidRevenueCents).replace(/\s/g, " "), "44,98 €");
});

test("checkouts em criação e abertos contam como aguardando; falhos e expirados ficam separados", () => {
  const summary = summarizeItalySales(rows);
  assert.equal(summary.awaitingCount, 2);
  assert.equal(summary.closedWithoutPaymentCount, 2);
});

test("filtro de aguardando inclui creating e open, mas não pagos", () => {
  assert.deepEqual(filterItalySales(rows, "awaiting", "").map(row => row.id), ["open", "creating"]);
  assert.deepEqual(filterItalySales(rows, "paid", "").map(row => row.id), ["paid-1", "paid-2"]);
  assert.deepEqual(filterItalySales(rows, "failed", "").map(row => row.id), ["failed"]);
});

test("busca encontra cliente, música e identificador do pedido sem diferenciar maiúsculas", () => {
  assert.deepEqual(filterItalySales(rows, "all", "marco").map(row => row.id), ["paid-1"]);
  assert.deepEqual(filterItalySales(rows, "all", "ANCORA").map(row => row.id), ["paid-2"]);
  assert.deepEqual(filterItalySales(rows, "all", "order-open").map(row => row.id), ["open"]);
  assert.deepEqual(filterItalySales(rows, "paid", "marco").map(row => row.id), ["paid-1"]);
  assert.deepEqual(filterItalySales(rows, "paid", "sem resultado"), []);
});
