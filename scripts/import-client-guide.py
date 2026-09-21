#!/usr/bin/env python3
"""Compile the reviewed Markdown to ordered React content; no runtime parser.

Requires markdown-it-py==4.0.0 (python3 -m pip install markdown-it-py==4.0.0).
Unsupported syntax fails the import rather than silently dropping content.
"""
import hashlib
import json
from pathlib import Path

from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/client-guides/jewellery-nl.md'
TARGET = ROOT / 'frontend/src/content/jewelleryGuideNl.js'


def inline(tokens):
    root = []
    stack = [root]
    for token in tokens or []:
        kind = token.type
        if kind in ('text', 'code_inline', 'softbreak', 'hardbreak'):
            stack[-1].append({'type': 'code' if kind == 'code_inline' else 'text',
                              'text': '\n' if kind.endswith('break') else token.content})
        elif kind in ('strong_open', 'em_open', 'link_open'):
            node = {'type': kind.removesuffix('_open'), 'children': []}
            if kind == 'link_open':
                node['url'] = token.attrGet('href')
                if not node['url'].startswith('https://'):
                    raise ValueError(f'Unexpected link protocol: {node["url"]}')
            stack[-1].append(node)
            stack.append(node['children'])
        elif kind in ('strong_close', 'em_close', 'link_close'):
            stack.pop()
        else:
            raise ValueError(f'Unsupported inline token: {kind}')
    assert len(stack) == 1
    return root


def compile_guide(source):
    tokens = MarkdownIt('commonmark').enable('table').parse(source)
    doc = {'title': '', 'updated': '21 september 2026', 'language': 'nl',
           'sourceSha256': hashlib.sha256(source.encode()).hexdigest(),
           'intro': [], 'sections': [], 'sources': [{
               'label': 'Klantenhandleiding (ClickUp, NL; bron 7 september, bijgewerkt 21 september)',
               'url': 'https://app.clickup.com/9015530073/v/dc/8cnw4jt-26595/8cnw4jt-14735'}]}
    target = doc['intro']
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t.type == 'heading_open':
            title = tokens[i + 1].content.replace('\\.', '.')
            if t.tag == 'h1':
                doc['title'] = title
            elif t.tag == 'h2':
                target = []
                doc['sections'].append({'heading': title, 'id': f'guide-{len(doc["sections"]) + 1}', 'blocks': target})
            else:
                target.append({'type': 'heading', 'children': inline(tokens[i + 1].children)})
            i += 3
        elif t.type == 'paragraph_open':
            # The date is rendered once in the document header.
            if not tokens[i + 1].content.startswith('Bijgewerkt:'):
                target.append({'type': 'paragraph', 'children': inline(tokens[i + 1].children)})
            i += 3
        elif t.type in ('bullet_list_open', 'ordered_list_open'):
            block = {'type': 'list', 'ordered': t.type == 'ordered_list_open', 'items': []}
            end = t.type.replace('_open', '_close')
            i += 1
            while tokens[i].type != end:
                assert tokens[i].type == 'list_item_open'
                assert tokens[i + 1].type == 'paragraph_open'
                assert tokens[i + 2].type == 'inline'
                assert tokens[i + 3].type == 'paragraph_close'
                assert tokens[i + 4].type == 'list_item_close', 'Nested/multi-paragraph lists need explicit support'
                block['items'].append(inline(tokens[i + 2].children))
                i += 5
            i += 1
            target.append(block)
        elif t.type == 'table_open':
            block = {'type': 'table', 'headings': [], 'rows': []}
            row = []
            header = False
            i += 1
            while tokens[i].type != 'table_close':
                cell = tokens[i]
                if cell.type == 'thead_open':
                    header = True
                elif cell.type == 'thead_close':
                    header = False
                elif cell.type == 'tr_open':
                    row = []
                elif cell.type == 'inline':
                    row.append(inline(cell.children))
                elif cell.type == 'tr_close':
                    if header:
                        block['headings'] = row
                    else:
                        block['rows'].append(row)
                elif cell.type not in ('tbody_open', 'tbody_close', 'th_open', 'th_close', 'td_open', 'td_close'):
                    raise ValueError(f'Unsupported table token: {cell.type}')
                i += 1
            assert all(len(row) == len(block['headings']) for row in block['rows'])
            target.append(block)
            i += 1
        else:
            raise ValueError(f'Unsupported block token: {t.type}')
    assert len(doc['sections']) == 15
    assert sum(b['type'] == 'table' for s in doc['sections'] for b in s['blocks']) == 4
    return doc


if __name__ == '__main__':
    result = compile_guide(SOURCE.read_text())
    TARGET.write_text('// Generated by scripts/import-client-guide.py from docs/client-guides/jewellery-nl.md.\n'
                      '// Edit the reviewed source, then regenerate.\n'
                      'export default ' + json.dumps(result, ensure_ascii=False, indent=2) + ';\n')
    print(f'Imported {len(result["sections"])} sections: {result["sourceSha256"]}')
