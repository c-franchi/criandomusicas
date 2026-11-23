import test from "node:test";
import assert from "node:assert/strict";
import { formatOrderAmount, speechLocale } from "./order-price-display.ts";
test("italian order shows live EUR full price", () => assert.match(formatOrderAmount(990, "it"), /19,99\s€/));
test("portuguese order keeps BRL", () => assert.equal(formatOrderAmount(990, "pt-BR"), "R$ 9,90"));
test("microphone uses italian speech", () => assert.equal(speechLocale("it"), "it-IT"));
test("microphone defaults to pt-BR", () => assert.equal(speechLocale("pt-BR"), "pt-BR"));
