import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sceneTail } from "./prompts.ts";
import { affinityUpdates, formatAffinity, presentScene, readScene, writeScene } from "./scene-bar.ts";
import type { Chat } from "./types.ts";

function chat(partial: Partial<Chat>): Chat {
  return {
    statusBarOn: false,
    affectionOn: false,
    statusBar: "",
    characters: [],
    isMulti: false,
    multiMode: "together",
    ...partial,
  } as Chat;
}

describe("sceneTail", () => {
  it("is empty when both switches are off", () => {
    assert.equal(sceneTail(chat({})), "");
    assert.equal(sceneTail(chat({ statusBar: "头发:长" })), "");
  });

  it("uses the placeholder format and no sample sentence", () => {
    const tail = sceneTail(chat({ affectionOn: true, characters: [{ id: "a", name: "小玉" }] as Chat["characters"] }));
    assert.match(tail, /💞好感度:\[当前数值\]/);
    assert.match(tail, /Ⅰ/);
    assert.doesNotMatch(tail, /点头之交/);
    assert.doesNotMatch(tail, /➕/);
    assert.doesNotMatch(tail, /\+2/);
  });
});

describe("presentScene", () => {
  const text = "她坐下来。\n状态栏:\n👤小玉\n头发:乱了\n❤️好感度:35（+2，点头之交）➕「还行。」";

  it("hides the card when the switches are off", () => {
    const view = presentScene(text, { status: false, affection: false });
    assert.equal(view.cards.length, 0);
    assert.equal(view.body, "她坐下来。");
  });

  it("keeps affinity with the status lines when both are on", () => {
    const view = presentScene(text, { status: true, affection: true });
    assert.equal(view.cards.length, 1);
    assert.equal(view.cards[0].affinity?.value, 35);
    assert.equal(view.cards[0].affinity?.delta, 2);
    assert.equal(view.cards[0].affinity?.quote, "还行。");
    assert.equal(view.cards[0].lines[0].title, "头发");
    assert.equal(view.cards[0].name, "小玉");
  });

  it("drops affinity when only the status bar is on", () => {
    const view = presentScene(text, { status: true, affection: false });
    assert.equal(view.cards.length, 1);
    assert.equal(view.cards[0].affinity, null);
    assert.equal(view.cards[0].lines[0].value, "乱了");
  });

  it("reads the new two-line format", () => {
    const raw = "正文\n状态栏:\n言叶\n💞好感度:82[📉-3Ⅰ吃醋与偏执戒备]\n💬「只能是我的。」\n🧣头发:散了";
    const view = presentScene(raw, { status: true, affection: true });
    assert.equal(view.cards[0].name, "言叶");
    assert.equal(view.cards[0].affinity?.value, 82);
    assert.equal(view.cards[0].affinity?.delta, -3);
    assert.equal(view.cards[0].affinity?.stage, "吃醋与偏执戒备");
    assert.equal(view.cards[0].affinity?.quote, "只能是我的。");
    assert.equal(view.cards[0].lines[0].title, "🧣头发");
  });

  it("reads the number for the next round", () => {
    assert.deepEqual(affinityUpdates(text), [{ name: "小玉", value: 35 }]);
  });

  it("writes affinity above the status lines", () => {
    const scene = readScene(text, "小玉");
    const out = writeScene("她坐下来。", scene.cards, false);
    assert.match(out, /💞好感度:35\[📈\+2Ⅰ点头之交\]/);
    assert.match(out, /「还行。」/);
    assert.doesNotMatch(out, /💬/);
    assert.ok(out.indexOf("💞") < out.indexOf("头发"));
    assert.equal(formatAffinity(scene.cards[0].affinity!).includes("➕"), false);
  });
});
