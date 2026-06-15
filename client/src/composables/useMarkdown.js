import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();

function wrapCodeBlock(lang, codeHtml) {
  const label = lang || 'text';
  return (
    `<div class="code-block">` +
      `<div class="code-block-header">` +
        `<span class="code-block-lang">${label}</span>` +
        `<button type="button" class="code-copy-btn" aria-label="Copiar código" title="Copiar">` +
          `<span class="material-icons code-copy-icon">content_copy</span>` +
          `<span class="code-copy-label">Copiar</span>` +
        `</button>` +
      `</div>` +
      `<pre>${codeHtml}</pre>` +
    `</div>`
  );
}

renderer.code = function ({ text, lang }) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(text, { language: lang }).value;
      return wrapCodeBlock(lang, `<code class="hljs language-${lang}">${highlighted}</code>`);
    } catch {
      // fall through
    }
  }
  const auto = hljs.highlightAuto(text);
  return wrapCodeBlock(auto.language || lang, `<code class="hljs">${auto.value}</code>`);
};

renderer.codespan = function ({ text }) {
  return `<code class="inline-code">${text}</code>`;
};

marked.use({ renderer });

function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

export { renderMarkdown };
