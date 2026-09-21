import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import guide from '../src/content/jewelleryGuideNl.js';
import { getAppContent } from '../src/config/appContent.js';

const blocks = guide.sections.flatMap((s) => s.blocks);
const tables = blocks.filter((b) => b.type === 'table');
const source = readFileSync(new URL('../../docs/client-guides/jewellery-nl.md', import.meta.url), 'utf8');
const text = (nodes) => nodes.map((n) => n.text ?? text(n.children)).join('');

test('reviewed source is current; both registrations share all 15 ordered sections', () => {
  assert.equal(guide.sourceSha256, createHash('sha256').update(source).digest('hex'));
  assert.deepEqual(guide.sections.map((s) => Number(s.heading.split('.')[0])), Array.from({ length: 15 }, (_, i) => i + 1));
  for (const id of ['15aaeb2a0727f22bf224d544483e58ef', '5925fb6a5a22cf0efbedc885d0d831c9']) {
    assert.equal(getAppContent(id).documentation, guide);
    assert.ok(getAppContent(id).landscape);
  }
  assert.equal(getAppContent('unconfigured-client').documentation, null);
});

test('all source table cells survive, including both complete specification matrices', () => {
  const sourceTables = source.match(/^\|.+(?:\n\|.+)*/gm).map((table) => table.split('\n').filter((_, i) => i !== 1)
    .map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim().replace(/\\_/g, '_'))));
  assert.equal(tables.length, 4);
  assert.deepEqual(tables.map((table) => [table.headings, ...table.rows].map((row) => row.map(text))), sourceTables);
  assert.deepEqual(tables.map((table) => table.rows.length), [3, 20, 17, 4]);
  assert.equal(guide.sections[5].blocks.filter((b) => b.type === 'table').length, 2);
});

test('rendered output preserves ordered blocks, safe links, tables, Dutch characters and legacy content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'guide-render-'));
  try {
    const outfile = join(dir, 'render.cjs');
    buildSync({ stdin: { contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { AppProvider } from '@shopify/polaris';
      import DocumentationTab from './src/components/DocumentationTab.jsx';
      export const render = (documentation) => renderToStaticMarkup(<AppProvider><DocumentationTab documentation={documentation} /></AppProvider>);
    `, resolveDir: process.cwd(), loader: 'jsx' }, outfile, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent' });
    const { render } = createRequire(import.meta.url)(outfile);
    const html = render(guide);
    assert.equal((html.match(/<section /g) || []).length, 15);
    assert.equal((html.match(/<table /g) || []).length, 4);
    assert.match(html, /scope="col"/);
    assert.match(html, /scope="row"/);
    assert.match(html, /lang="nl"/);
    for (const value of ['translated:en', 'translate-trigger', '€ 55', '≤14', '✓', '—', 'custom.ring_size', 'Monnickendam', '8cnw4jt-14735']) assert.ok(html.includes(value), value);
    const fixture = { title: 'Fixture', sections: [{ id: 'example', heading: 'Example', blocks: [
      { type: 'paragraph', children: [{ type: 'text', text: 'Before <script>alert(1)</script>' }] },
      { type: 'table', headings: [[{ type: 'text', text: 'Header' }]], rows: [[[{ type: 'text', text: 'Middle' }]]] },
      { type: 'paragraph', children: [{ type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', text: 'After' }] }] },
    ] }] };
    const rendered = render(fixture);
    assert.ok(rendered.indexOf('Before') < rendered.indexOf('Middle'));
    assert.ok(rendered.indexOf('Middle') < rendered.indexOf('After'));
    assert.ok(!rendered.includes('<script>'));
    assert.ok(!rendered.includes('javascript:'));
    assert.match(render({ title: 'Legacy', sections: [{ heading: 'Legacy section', body: ['Legacy paragraph'] }] }), /Legacy paragraph/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
