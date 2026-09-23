#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { constants } = require('node:fs');
const MarkdownIt = require('markdown-it');
const { chromium } = require('playwright-core');

function assertInside(root, filename) {
  const relative = path.relative(root, filename);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the repository: ${filename}`);
  }
}

async function renderPdf(input, { root = process.cwd() } = {}) {
  root = await fs.realpath(root);
  const source = await fs.realpath(path.resolve(root, input));
  assertInside(root, source);
  if (path.extname(source).toLowerCase() !== '.md') throw new Error('Input must be a .md file');
  const markdown = new MarkdownIt({ html: false, linkify: true });
  const originalFence = markdown.renderer.rules.fence;
  markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
    if (tokens[index].info.trim() === 'mermaid') {
      return `<pre class="mermaid">${markdown.utils.escapeHtml(tokens[index].content)}</pre>`;
    }
    return originalFence(tokens, index, options, environment, renderer);
  };
  const tokens = markdown.parse(await fs.readFile(source, 'utf8'), {});
  const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
  async function embedImages(children) {
    for (const token of children) {
      if (token.type === 'image') {
        const location = token.attrGet('src');
        if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(location)) {
          throw new Error(`Images must be repository-local: ${location}`);
        }
        const image = await fs.realpath(path.resolve(path.dirname(source), decodeURIComponent(location)));
        assertInside(root, image);
        const mime = mimeTypes[path.extname(image).toLowerCase()];
        if (!mime) throw new Error(`Unsupported image type: ${location}`);
        token.attrSet('src', `data:${mime};base64,${(await fs.readFile(image)).toString('base64')}`);
      }
      if (token.children) await embedImages(token.children);
    }
  }
  await embedImages(tokens);
  const content = markdown.renderer.render(tokens, markdown.options, {});
  const css = await fs.readFile(path.join(__dirname, 'print.css'), 'utf8');
  const title = markdown.utils.escapeHtml(path.basename(source, path.extname(source)));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, serviceWorkers: 'block' });
    page.setDefaultTimeout(30000);
    const externalRequests = [];
    await page.route('**/*', (route) => {
      externalRequests.push(route.request().url());
      return route.abort();
    });
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><main>${content}</main></body></html>`);
    await page.addScriptTag({ path: path.join(path.dirname(require.resolve('mermaid/package.json')), 'dist/mermaid.min.js') });
    const diagramCount = await page.locator('.mermaid').count();
    await page.evaluate(async () => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default', suppressErrorRendering: true });
      await mermaid.run({ querySelector: '.mermaid', suppressErrors: false });
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode()));
    });
    const renderedCount = await page.locator('.mermaid svg').count();
    if (renderedCount !== diagramCount) throw new Error('Some Mermaid diagrams did not render');
    if (externalRequests.length) throw new Error(`External assets are disabled: ${externalRequests.join(', ')}`);
    const output = path.join(root, 'pdf_build', path.relative(root, source).replace(/\.md$/i, '.pdf'));
    let existingParent = path.dirname(output);
    while (true) {
      try {
        assertInside(root, await fs.realpath(existingParent));
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        existingParent = path.dirname(existingParent);
      }
    }
    await fs.mkdir(path.dirname(output), { recursive: true });
    assertInside(root, await fs.realpath(path.dirname(output)));
    const bytes = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' } });
    const file = await fs.open(output, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o644);
    try { await file.writeFile(bytes); } finally { await file.close(); }
    return { output, diagramCount, bytes: bytes.length };
  } finally {
    await browser.close();
  }
}

module.exports = { renderPdf, assertInside };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '--help') {
    console.log('Usage: docs-pdf path/to/document.md\nOutput: pdf_build/path/to/document.pdf (replaced on each successful export)');
    process.exitCode = args[0] === '--help' ? 0 : 1;
  } else {
    renderPdf(args[0]).then(({ output, diagramCount, bytes }) => {
      console.log(`${output} (${bytes} bytes; ${diagramCount} Mermaid diagrams)`);
    }).catch((error) => {
      console.error(`PDF export failed: ${error.message}`);
      process.exitCode = 1;
    });
  }
}