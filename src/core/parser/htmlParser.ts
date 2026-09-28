import { EditorNode } from '../../types';

/**
 * Generates a unique ID
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Parses HTML string into a single Root EditorNode (Tree Structure).
 * This preserves hierarchy which is crucial for nesting elements correctly.
 */
export const parseHtmlToTree = (htmlString: string): EditorNode | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // We treat the <body> content as the main editable area usually, 
  // but for full file support, we might wrap everything.
  // Let's create a virtual root representing the whole document structure.
  
  const rootNode: EditorNode = {
    id: 'root-' + generateId(),
    type: 'element',
    tagName: 'html', // Virtual wrapper
    attributes: {},
    styles: {},
    children: []
  };

  // Traverse actual DOM starting from DocumentElement
  if (doc.documentElement) {
    const htmlChild = convertDomNode(doc.documentElement);
    if (htmlChild) {
      rootNode.children.push(htmlChild);
    }
  }

  return rootNode;
};

const convertDomNode = (domNode: Node): EditorNode | null => {
  if (domNode.nodeType === Node.TEXT_NODE) {
    const text = domNode.textContent?.trim();
    if (!text) return null; // Ignore whitespace-only text nodes for cleaner UI
    
    return {
      id: generateId(),
      type: 'text',
      attributes: {},
      styles: {},
      children: [],
      textContent: text
    };
  }

  if (domNode instanceof HTMLElement) {
    const attrs: Record<string, string> = {};
    
    // Copy existing attributes
    for (let i = 0; i < domNode.attributes.length; i++) {
      const attr = domNode.attributes[i];
      if (attr.name.startsWith('data-editor')) continue; // Clean old IDs
      attrs[attr.name] = attr.value;
    }
    
    // Assign new unique ID for editor tracking
    const nodeId = generateId();
    attrs['data-editor-id'] = nodeId;

    const styles: Record<string, string> = {};
    if (domNode.style.cssText) {
       domNode.style.cssText.split(';').forEach(rule => {
         const [key, value] = rule.split(':').map(s => s.trim());
         if(key && value) styles[key] = value;
       });
    }

    const node: EditorNode = {
      id: nodeId,
      type: 'element',
      tagName: domNode.tagName.toLowerCase(),
      attributes: attrs,
      styles,
      children: []
    };

    // Process Children
    domNode.childNodes.forEach(child => {
      const converted = convertDomNode(child);
      if (converted) {
        node.children.push(converted);
      }
    });

    return node;
  }

  return null;
};
