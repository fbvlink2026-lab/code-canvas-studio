import { create } from 'zustand';
import { AppState, ProjectFile, EditorNode } from '../types';
import { parseHtmlToTree } from '../core/parser/htmlParser';
import { serializeTreeToHtml } from '../core/parser/htmlSerializer';

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface EditorState extends AppState {
  // The visual tree representation of the active file
  rootNode: EditorNode | null;
  
  // Actions specific to Tree manipulation
  loadFileContent: (fileId: string) => void;
  updateNodeStyle: (nodeId: string, prop: string, value: string) => void;
  updateNodeAttribute: (nodeId: string, attrName: string, attrValue: string) => void;
  updateNodeText: (nodeId: string, newText: string) => void;
  
  // Internal helper to find a node by ID in the tree
  _findNodeById: (tree: EditorNode | null, id: string) => EditorNode | null;
  // Internal helper to clone and mutate tree immutably for React re-render
  _updateTree: (tree: EditorNode, nodeId: string, updater: (n: EditorNode) => EditorNode) => EditorNode;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // --- Initial State ---
  files: [
    {
      id: 'file-1',
      name: 'index.html',
      extension: '.html',
      language: 'html',
      isOpen: true,
      isDirty: false,
      content: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div id="app" style="padding: 20px;">
    <h1 style="color: blue;">Hello GUI Editor</h1>
    <p>This is a paragraph.</p>
    <button class="primary-btn" style="background-color: green; color: white; padding: 10px;">Click Me</button>
  </div>
</body>
</html>`
    },
    {
      id: 'file-2',
      name: 'style.css',
      extension: '.css',
      language: 'css',
      isOpen: false,
      isDirty: false,
      content: `.container { padding: 20px; }\nh1 { color: blue; }`
    }
  ],
  activeFileId: 'file-1',
  selectedNodeId: null,
  hoveredNodeId: null,
  past: [],
  future: [],
  rootNode: null,

  // --- Initialization Action ---
  setActiveFile: (fileId: string) => set({ activeFileId: fileId }),

  /**
   * Loads the content of the active file into the Visual Tree.
   * Call this whenever switching files or after external code edits.
   */
  loadFileContent: (fileId: string) => {
    const state = get();
    const file = state.files.find(f => f.id === fileId);
    
    if (file && file.language === 'html') {
      const tree = parseHtmlToTree(file.content);
      set({ 
        rootNode: tree,
        selectedNodeId: null, // Clear selection on reload
        hoveredNodeId: null
      });
    } else {
      // For non-HTML files, clear the visual tree
      set({ rootNode: null, selectedNodeId: null });
    }
  },

  /**
   * Finds a node recursively in the tree.
   */
  _findNodeById: (tree: EditorNode | null, id: string): EditorNode | null => {
    if (!tree) return null;
    if (tree.id === id) return tree;
    
    for (const child of tree.children) {
      const found = get()._findNodeById(child, id);
      if (found) return found;
    }
    return null;
  },

  /**
   * Immutably updates a node in the tree.
   */
  _updateTree: (tree: EditorNode, nodeId: string, updater: (n: EditorNode) => EditorNode): EditorNode => {
    if (tree.id === nodeId) {
      return updater(tree);
    }
    
    return {
      ...tree,
      children: tree.children.map(child => get()._updateTree(child, nodeId, updater))
    };
  },

  /**
   * Updates inline style of a specific node.
   * Also syncs back to the raw HTML string in the file object.
   */
  updateNodeStyle: (nodeId: string, prop: string, value: string) => {
    set((state) => {
      if (!state.rootNode) return {};

      // 1. Update Tree
      const newTree = state._updateTree(state.rootNode, nodeId, (node) => {
        return {
          ...node,
          styles: {
            ...node.styles,
            [prop]: value
          }
        };
      });

      // 2. Serialize back to HTML String
      const newHtml = serializeTreeToHtml(newTree);

      // 3. Update File Content in State
      const updatedFiles = state.files.map(f => 
        f.id === state.activeFileId 
          ? { ...f, content: newHtml, isDirty: true } 
          : f
      );

      return {
        rootNode: newTree,
        files: updatedFiles
      };
    });
  },

  /**
   * Updates an attribute (e.g., class, id, href) of a specific node.
   */
  updateNodeAttribute: (nodeId: string, attrName: string, attrValue: string) => {
    set((state) => {
      if (!state.rootNode) return {};

      const newTree = state._updateTree(state.rootNode, nodeId, (node) => {
        return {
          ...node,
          attributes: {
            ...node.attributes,
            [attrName]: attrValue
          }
        };
      });

      const newHtml = serializeTreeToHtml(newTree);
      const updatedFiles = state.files.map(f => 
        f.id === state.activeFileId 
          ? { ...f, content: newHtml, isDirty: true } 
          : f
      );

      return {
        rootNode: newTree,
        files: updatedFiles
      };
    });
  },

  /**
   * Updates text content for text nodes.
   */
  updateNodeText: (nodeId: string, newText: string) => {
    set((state) => {
      if (!state.rootNode) return {};

      const newTree = state._updateTree(state.rootNode, nodeId, (node) => {
        return {
          ...node,
          textContent: newText
        };
      });

      const newHtml = serializeTreeToHtml(newTree);
      const updatedFiles = state.files.map(f => 
        f.id === state.activeFileId 
          ? { ...f, content: newHtml, isDirty: true } 
          : f
      );

      return {
        rootNode: newTree,
        files: updatedFiles
      };
    });
  },

  selectNode: (nodeId: string | null) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId: string | null) => set({ hoveredNodeId: nodeId }),
  
  // Placeholder implementations for Undo/Redo logic later
  updateFileContent: (fileId: string, newContent: string) => set((state) => ({
    files: state.files.map(f => 
      f.id === fileId ? { ...f, content: newContent, isDirty: true } : f
    )
  }))
}));
