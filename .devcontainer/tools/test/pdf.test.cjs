const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { renderPdf, assertInside } = require('../pdf.cjs');

test('path containment rejects siblings and traversal', () => {
  assertInside('/repo', '/repo/docs/test.md');
  assert.throws(() => assertInside('/repo', '/repo-other/test.md'));
  assert.throws(() => assertInside('/repo', '/etc/passwd'));
});

test('PDF export renders Mermaid and local images, rejects invalid or external content', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'docs-pdf-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'docs'));
  await fs.writeFile(path.join(root, 'docs/pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64'));
  const source = path.join(root, 'docs/sample.md');
  await fs.writeFile(source, '# Example\n\nReadable text.\n\n| Column | Value |\n| --- | --- |\n| Test | Works |\n\n![Pixel](pixel.png)\n\n```mermaid\nflowchart LR\n  Draft --> Review --> Publish\n```\n');
  const result = await renderPdf('docs/sample.md', { root });
  assert.equal(result.diagramCount, 1);
  assert.ok(result.bytes > 5000);
  assert.equal(result.output, path.join(root, 'pdf_build/docs/sample.pdf'));
  assert.equal((await fs.readFile(result.output)).subarray(0, 5).toString(), '%PDF-');
  await renderPdf('docs/sample.md', { root });
  await fs.writeFile(source, '# Invalid\n\n```mermaid\nnot valid mermaid !!!\n```\n');
  await assert.rejects(renderPdf('docs/sample.md', { root }));
  await fs.writeFile(source, '# Remote\n\n![Remote](https://example.com/image.png)\n');
  await assert.rejects(renderPdf('docs/sample.md', { root }), /repository-local/);
  await fs.writeFile(source, '# Missing\n\n![Missing](missing.png)\n');
  await assert.rejects(renderPdf('docs/sample.md', { root }), /ENOENT/);
  await fs.symlink('/etc/passwd', path.join(root, 'docs/outside.md'));
  await assert.rejects(renderPdf('docs/outside.md', { root }), /outside the repository/);
  await fs.writeFile(source, '# Safe\n');
  await fs.rm(result.output);
  await fs.symlink(source, result.output);
  await assert.rejects(renderPdf('docs/sample.md', { root }), /ELOOP/);
  assert.equal(await fs.readFile(source, 'utf8'), '# Safe\n');
});