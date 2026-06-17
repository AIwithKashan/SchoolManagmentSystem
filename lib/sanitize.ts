export function sanitizeText(input: string): string {
  if (!input) return "";
  // Strip all HTML tags
  const clean = input.replace(/<\/?[^>]+(>|$)/g, "");
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

  // 1. Remove script tags and their contents
  let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // 2. Remove iframe tags and their contents
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // 3. Remove style tags and their contents
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 4. Strip out javascript: and vbscript: URIs
  clean = clean.replace(/href\s*=\s*["']\s*(javascript|vbscript):/gi, 'href="#"');

  // 5. Strip out on* event handlers (e.g. onload, onclick, onerror) from HTML tags
  clean = clean.replace(/<([a-z0-9]+)\b([^>]*?)>/gi, (match, tagName, attrs) => {
    const cleanAttrs = attrs.replace(/\b(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "");
    return `<${tagName}${cleanAttrs}>`;
  });

  return clean;
}
