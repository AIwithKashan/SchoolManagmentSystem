import DOMPurify from "isomorphic-dompurify";

export function sanitizeText(input: string): string {
  if (!input) return "";
  // Strip all HTML tags
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // Encode basic special characters to prevent HTML/XSS injection
  return clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function sanitizeHTML(input: string): string {
  if (!input) return "";
  // Allow safe text-formatting markup while stripping script, iframe, and handler attributes
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "title", "target"],
  });
}
