import DOMPurify from "dompurify";

// Deny-by-default allowlist scoped to markdown-it (GFM + task-lists + footnotes) output.
// No <form>/<button>/<svg>/<math>/<style>/<script>/<canvas>/<iframe>/<object> — none are emitted by our renderer.
const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","blockquote","pre","code","hr","br","div","span",
  "ul","ol","li","dl","dt","dd",
  "table","thead","tbody","tfoot","tr","th","td","caption","col","colgroup",
  "a","strong","b","em","i","del","s","kbd","samp","var","mark","sub","sup",
  "abbr","cite","dfn","ins","time",
  "img","figure","figcaption",
  "details","summary","section","input",
];

// Global attribute allowlist. NOTE: `style` is intentionally absent (CSS url(javascript:)/expression() vector);
// a hook below re-permits ONLY a safe `text-align` style on table cells to keep GFM column alignment.
const ALLOWED_ATTR = [
  "id","class","lang","dir","title","role","aria-label","aria-hidden","aria-describedby",
  "href","target","rel","download","hreflang",
  "src","srcset","alt","width","height","loading","decoding",
  "colspan","rowspan","scope","align","start","reversed",
  "type","checked","disabled",
  "datetime",
];

// Hooks are global + idempotent at module load (sanitize.ts is imported once).
// 1) Restrict <input> to task-list checkboxes (drops <input type="image" src=...> pixel-tracker, etc.).
DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName === "input") {
    const el = node as Element;
    if (el.getAttribute("type") !== "checkbox") {
      el.parentNode?.removeChild(el);
    }
  }
});
// 2) Re-permit ONLY a safe text-align style on TH/TD (GFM alignment); all other style values are dropped.
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "style") {
    const tag = (node as Element).tagName;
    if ((tag === "TH" || tag === "TD") && /^text-align:\s*(left|center|right);?\s*$/i.test(data.attrValue)) {
      data.forceKeepAttr = true;
    }
  }
});
// 3) Enforce rel=noopener noreferrer on target=_blank anchors (reverse-tabnabbing defense-in-depth).
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  const el = node as Element;
  if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
    const rel = new Set((el.getAttribute("rel") ?? "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    el.setAttribute("rel", [...rel].join(" "));
  }
});

/** Sanitize rendered HTML before it is injected into the document. Deny-by-default allowlist. */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
