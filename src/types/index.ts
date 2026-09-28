// src/types/index.ts

/**
 * Represents a single node in the virtual DOM tree of our editor.
 * We use this instead of direct DOM manipulation for better control and serialization.
 */
export interface EditorNode {
  id: string; // Unique identifier for tracking selection and code mapping
  type: 'element' | 'text'; 
  tagName?: string; // e.g., 'div', 'h1', 'p'. Undefined if type is 'text'
  attributes: Record<string, string>; // e.g., { class: 'btn', id: 'main' }
  styles: Record<string, string>; // Inline styles parsed from CSS or style attr
  children: EditorNode[];
  textContent?: string; // Only for type === 'text'
  
  // Metadata for Code Sync
  sourceStartOffset?: number; // Character index in raw HTML string where this node starts
  sourceEndOffset?: number;   // Character index in raw HTML string where this node ends
}

/**
 * Represents a file in the current project workspace.
 */
export interface ProjectFile {
  id: string;
  name: string; // e.g., "index.html", "style.css"
  extension: string; // e.g., ".html", ".css", ".js", ".php"
  content: string; // The raw text content of the file
  language: 'html' | 'css' | 'javascript' | 'php' | 'json' | 'xml';
  isOpen: boolean; // Is this tab currently active?
  isDirty: boolean; // Has unsaved changes?
}

/**
 * The main shape of our application state.
 */
export interface AppState {
  // --- Project Files ---
  files: ProjectFile[];
  activeFileId: string | null;

  // --- Visual Editor State ---
  selectedNodeId: string | null; // ID of the node clicked on canvas
  hoveredNodeId: string | null;  // ID of the node being hovered over
  
  // --- History (Undo/Redo) ---
  past: EditorNode[][]; // Array of snapshots of the root tree
  future: EditorNode[][]; // Array of undone snapshots

  // --- Actions ---
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, newContent: string) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  
  // To be implemented later:
  // addNode, removeNode, moveNode, undo, redo
}
