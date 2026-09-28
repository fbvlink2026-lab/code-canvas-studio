import { EditorNode } from '../../types';

/**
 * Parses an HTML string into a flat or nested array of EditorNodes.
 * Injects 'data-editor-id' to ensure stable identification during edits.
 */
export const parseHtmlToNodes = (htmlString: string): EditorNode[] => {
  const parser = new DOMParser();
  // Wrap in body if not already present to avoid issues with fragments
  let doc = parser.parseFromString(htmlString, 'text/html');
  
  // If the document is empty or just has html/head/body wrappers without content, 
  // we might want to target the <body> specifically for the canvas view usually.
  // For now, let's assume the input is the full file or a fragment.
  
  const rootElement = doc.body || doc.documentElement;
  
  if (!rootElement) return [];

  const nodes: EditorNode[] = [];
  
  // Recursive helper to traverse DOM and build our Node objects
  const traverse = (domNode: Element | Text, parentId?: string) => {
    if (domNode.nodeType === Node.TEXT_NODE) {
      const textContent = domNode.textContent?.trim();
      if (textContent && textContent.length > 0) {
        const id = generateId();
        nodes.push({
          id,
          type: 'text',
          attributes: {},
          styles: {},
          children: [],
          textContent,
          sourceStartOffset: getTextOffset(domNode), // Approximate offset
          sourceEndOffset: getTextOffset(domNode) + textContent.length
        });
      }
      return;
    }

    if (domNode instanceof HTMLElement) {
      const id = generateId();
      
      // Extract Attributes
      const attrs: Record<string, string> = {};
      for (let i = 0; i < domNode.attributes.length; i++) {
        const attr = domNode.attributes[i];
        // Skip internal editor IDs if they exist from previous parses
        if (attr.name !== 'data-editor-id') {
          attrs[attr.name] = attr.value;
        }
      }
      // Force inject ID for tracking
      attrs['data-editor-id'] = id;

      // Extract Styles (Inline)
      const styles: Record<string, string> = {};
      if (domNode.style.cssText) {
        // Simple split for inline styles: "color:red;font-size:12px"
        domNode.style.cssText.split(';').forEach(rule => {
          const [prop, val] = rule.split(':').map(s => s.trim());
          if (prop && val) {
            styles[prop] = val;
          }
        });
      }

      const node: EditorNode = {
        id,
        type: 'element',
        tagName: domNode.tagName.toLowerCase(),
        attributes: attrs,
        styles,
        children: [],
        // Note: Calculating exact character offsets requires more complex logic 
        // involving outerHTML length vs inner positions. 
        // For MVP, we rely on ID matching rather than strict offsets initially.
        sourceStartOffset: undefined, 
        sourceEndOffset: undefined
      };

      nodes.push(node);

      // Recurse Children
      Array.from(domNode.childNodes).forEach(child => {
        traverse(child, id);
      });
    }
  };

  traverse(rootElement);
  return nodes;
};

// Helper to generate UUID-like short strings
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to estimate text offset (rough approximation for highlighting)
const getTextOffset = (node: Node): number => {
  // This is tricky in pure DOM parsing without keeping track of original string indices.
  // For Phase 1, we will skip precise offset calculation and focus on ID-based selection.
  // We will implement precise mapping in Phase 3 using AST tools if needed.
  return 0; 
};
