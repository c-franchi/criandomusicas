import { test, expect } from "bun:test";
import { getPurposeStart, mapQuickPurpose, isPurposeId } from "./briefingPurpose.ts";

test("Caso A: motivar equipe de vendas -> motivacional de trabalho, não jingle", () => {
  const s = getPurposeStart("company_team");
  expect(s.kind).toBe("quick");
  expect(s.patch.musicType).toBe("motivacional");
  expect(s.patch.motivationalMoment).toBe("trabalho");
  expect(s.patch.corporateFormat).toBeUndefined();
  const m = mapQuickPurpose("company_team", { style: "pop", isInstrumental: false });
  expect(m.musicType).toBe("motivacional");
  expect(m.motivationalMoment).toBe("trabalho");
});

test("Caso B: jingle -> corporativa/jingle no passo de contato", () => {
  const s = getPurposeStart("company_jingle");
  expect(s.kind).toBe("chat");
  expect(s.patch.musicType).toBe("corporativa");
  expect(s.patch.corporateFormat).toBe("jingle");
  expect(s.step).toBe(32);
});

test("Institucional e narração mantêm formatos corporativos", () => {
  expect(getPurposeStart("company_anthem").patch.corporateFormat).toBe("institucional");
  expect(getPurposeStart("company_voiceover").patch.corporateFormat).toBe("monologo");
});

test("Caso C: homenagem para mãe -> caminho curto homenagem", () => {
  const s = getPurposeStart("gift");
  expect(s.kind).toBe("quick");
  expect(mapQuickPurpose("gift", { style: "mpb", isInstrumental: false }).musicType).toBe("homenagem");
});

test("Caso D: motivação academia -> motivacional pessoal, sem amor/festivo", () => {
  const m = mapQuickPurpose("motivation", { style: "rock", isInstrumental: false, energy: "intensa", moment: "treino" });
  expect(m.musicType).toBe("motivacional");
  expect(m.motivationalMoment).toBe("treino");
  expect(m.emotion).not.toBe("amor");
  expect(m.atmosphere).not.toBe("festivo");
});

test("Casos E/F: letra própria e instrumental preservados", () => {
  const e = getPurposeStart("custom_lyric");
  expect(e.planId).toBe("single_custom_lyric");
  expect(e.step).toBe(22);
  const f = getPurposeStart("instrumental");
  expect(f.planId).toBe("single_instrumental");
  expect(f.patch.isInstrumental).toBe(true);
});

test("Rejeita finalidade desconhecida na URL", () => {
  expect(isPurposeId("hack")).toBe(false);
  expect(isPurposeId("gift")).toBe(true);
});
