import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }) {
  if (lang && hljs.getLanguage(lang)) {
    try {
      const highlighted = hljs.highlight(text, { language: lang }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    } catch {
      // fall through
    }
  }
  const escaped = hljs.highlightAuto(text).value;
  return `<pre><code class="hljs">${escaped}</code></pre>`;
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
