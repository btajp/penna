// src/ui/find.ts
const HIT_CLASS = "find-hit";
const CURRENT_CLASS = "find-hit-current";

export class FindBar {
  private readonly root: HTMLElement;
  private currentIndex = 0;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  open(): void {
    const bar = this.findbarEl();
    if (bar) {
      bar.hidden = false;
    }
    this.inputEl()?.focus();
  }

  close(): void {
    const bar = this.findbarEl();
    if (bar) {
      bar.hidden = true;
    }
    this.clearHighlights();
    this.currentIndex = 0;
    const input = this.inputEl();
    if (input) {
      input.value = "";
    }
    this.renderCount(0);
  }

  search(query: string): number {
    this.clearHighlights();
    this.currentIndex = 0;
    if (query.length === 0) {
      this.renderCount(0);
      return 0;
    }
    const count = this.highlightMatches(query);
    if (count > 0) {
      this.setCurrent(0);
    }
    this.renderCount(count);
    return count;
  }

  next(): void {
    this.move(1);
  }

  prev(): void {
    this.move(-1);
  }

  private move(delta: number): void {
    const hits = this.hits();
    if (hits.length === 0) {
      return;
    }
    this.currentIndex = (this.currentIndex + delta + hits.length) % hits.length;
    this.setCurrent(this.currentIndex);
  }

  private setCurrent(index: number): void {
    const hits = this.hits();
    hits.forEach((hit, i) => {
      hit.classList.toggle(CURRENT_CLASS, i === index);
    });
    this.currentIndex = index;
    const target = hits[index];
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center" });
    }
  }

  private highlightMatches(query: string): number {
    const content = this.contentEl();
    if (!content) {
      return 0;
    }
    const needle = query.toLowerCase();
    const textNodes = this.collectTextNodes(content);
    let count = 0;
    for (const node of textNodes) {
      count += this.wrapNodeMatches(node, needle);
    }
    return count;
  }

  private wrapNodeMatches(node: Text, needle: string): number {
    const text = node.nodeValue ?? "";
    const lower = text.toLowerCase();
    let from = lower.indexOf(needle);
    if (from === -1) {
      return 0;
    }
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let count = 0;
    while (from !== -1) {
      if (from > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, from)));
      }
      const mark = document.createElement("mark");
      mark.className = HIT_CLASS;
      mark.textContent = text.slice(from, from + needle.length);
      fragment.appendChild(mark);
      count += 1;
      cursor = from + needle.length;
      from = lower.indexOf(needle, cursor);
    }
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode?.replaceChild(fragment, node);
    return count;
  }

  private collectTextNodes(root: HTMLElement): Text[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || parent.classList.contains(HIT_CLASS)) {
          return NodeFilter.FILTER_REJECT;
        }
        return (node.nodeValue ?? "").trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }
    return nodes;
  }

  private clearHighlights(): void {
    const content = this.contentEl();
    if (!content) {
      return;
    }
    const marks = content.querySelectorAll(`mark.${HIT_CLASS}`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) {
        return;
      }
      parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
      parent.normalize();
    });
  }

  private hits(): HTMLElement[] {
    const content = this.contentEl();
    if (!content) {
      return [];
    }
    return Array.from(content.querySelectorAll<HTMLElement>(`mark.${HIT_CLASS}`));
  }

  private renderCount(count: number): void {
    const el = this.root.querySelector<HTMLElement>("#findbar-count");
    if (!el) {
      return;
    }
    el.textContent = count === 0 ? "" : `${this.currentIndex + 1}/${count}`;
  }

  private findbarEl(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>("#findbar");
  }

  private inputEl(): HTMLInputElement | null {
    return this.root.querySelector<HTMLInputElement>("#findbar-input");
  }

  private contentEl(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>("#content");
  }
}
