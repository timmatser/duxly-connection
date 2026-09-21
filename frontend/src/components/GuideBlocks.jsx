import { BlockStack, List, Text, Link } from '@shopify/polaris';
import './GuideBlocks.css';

function safeLink(url) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function GuideInline({ nodes }) {
  return nodes.map((node, index) => {
    const children = node.children && <GuideInline nodes={node.children} />;
    switch (node.type) {
      case 'text': return node.text;
      case 'code': return <code key={index}>{node.text}</code>;
      case 'strong': return <strong key={index}>{children}</strong>;
      case 'em': return <em key={index}>{children}</em>;
      case 'link': return safeLink(node.url)
        ? <Link key={index} url={node.url} target="_blank">{children}</Link>
        : <span key={index}>{children}</span>;
      default: throw new Error(`Unknown guide inline node: ${node.type}`);
    }
  });
}

export function GuideBlocks({ blocks, label }) {
  return (
    <BlockStack gap="300">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return <Text key={index} as="p"><GuideInline nodes={block.children} /></Text>;
          case 'heading':
            return <Text key={index} as="h4" variant="headingSm"><GuideInline nodes={block.children} /></Text>;
          case 'list':
            return (
              <List key={index} type={block.ordered ? 'number' : 'bullet'}>
                {block.items.map((item, i) => <List.Item key={i}><GuideInline nodes={item} /></List.Item>)}
              </List>
            );
          case 'table': {
            const precedingHeading = blocks.slice(0, index).findLast((b) => b.type === 'heading');
            return (
              <div key={index} className="guide-table-scroll" tabIndex={0} role="region" aria-label={`${label} — tabel (horizontaal scrollbaar)`}>
                <table className="guide-table">
                  <caption>{precedingHeading ? <GuideInline nodes={precedingHeading.children} /> : label}</caption>
                  <thead><tr>{block.headings.map((cell, i) => <th key={i} scope="col"><GuideInline nodes={cell} /></th>)}</tr></thead>
                  <tbody>{block.rows.map((row, ri) => (
                    <tr key={ri}>{row.map((cell, ci) => ci === 0
                      ? <th key={ci} scope="row"><GuideInline nodes={cell} /></th>
                      : <td key={ci}><GuideInline nodes={cell} /></td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            );
          }
          default: throw new Error(`Unknown guide block: ${block.type}`);
        }
      })}
    </BlockStack>
  );
}
