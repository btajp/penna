// src/ui/find.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { FindBar } from "./find";

function buildRoot(contentHtml: string): HTMLElement {
  document.body.innerHTML = `
    <div id="findbar" hidden>
      <input id="findbar-input" type="text" />
      <span id="findbar-count"></span>
    </div>
    <div id="content">${contentHtml}</div>
  `;
  return document.body;
}

beforeEach(() => {
  // Force the span/mark fallback path (CSS Custom Highlight API absent in jsdom anyway).
  // @ts-ignore - ensure Highlight is undefined for the fallback branch (not in TS globalThis types).
  delete (globalThis as { Highlight?: unknown }).Highlight;
  document.body.innerHTML = "";
});

describe("FindBar.search", () => {
  it("counts matches and wraps them in mark.find-hit", () => {
    const root = buildRoot("<p>foo bar foo</p><p>baz foo</p>");
    const bar = new FindBar(root);
    bar.open();

    const count = bar.search("foo");

    expect(count).toBe(3);
    const marks = root.querySelectorAll("mark.find-hit");
    expect(marks.length).toBe(3);
    expect(marks[0].textContent).toBe("foo");
  });

  it("is case-insensitive and preserves surrounding text", () => {
    const root = buildRoot("<p>Foo and FOO and foo</p>");
    const bar = new FindBar(root);
    bar.open();

    const count = bar.search("foo");

    expect(count).toBe(3);
    expect(root.querySelector("#content")?.textContent).toBe("Foo and FOO and foo");
  });

  it("returns 0 and clears marks for an empty query", () => {
    const root = buildRoot("<p>foo</p>");
    const bar = new FindBar(root);
    bar.open();
    bar.search("foo");

    const count = bar.search("");

    expect(count).toBe(0);
    expect(root.querySelectorAll("mark.find-hit").length).toBe(0);
  });
});

describe("FindBar.close", () => {
  it("removes all marks and resets the input", () => {
    const root = buildRoot("<p>foo foo foo</p>");
    const bar = new FindBar(root);
    bar.open();
    bar.search("foo");
    expect(root.querySelectorAll("mark.find-hit").length).toBe(3);

    bar.close();

    expect(root.querySelectorAll("mark.find-hit").length).toBe(0);
    expect(root.querySelector<HTMLInputElement>("#findbar-input")?.value).toBe("");
    expect(root.querySelector<HTMLElement>("#findbar")?.hidden).toBe(true);
    expect(root.querySelector("#content")?.textContent).toBe("foo foo foo");
  });
});

describe("FindBar.next/prev", () => {
  it("advances the current index modulo the match count", () => {
    const root = buildRoot("<p>foo foo foo</p>");
    const bar = new FindBar(root);
    bar.open();
    bar.search("foo");

    const hits = () => Array.from(root.querySelectorAll("mark.find-hit"));
    expect(hits()[0].classList.contains("find-hit-current")).toBe(true);

    bar.next();
    expect(hits()[1].classList.contains("find-hit-current")).toBe(true);

    bar.next();
    expect(hits()[2].classList.contains("find-hit-current")).toBe(true);

    bar.next(); // wraps back to first (modulo)
    expect(hits()[0].classList.contains("find-hit-current")).toBe(true);

    bar.prev(); // wraps back to last
    expect(hits()[2].classList.contains("find-hit-current")).toBe(true);
  });
});
