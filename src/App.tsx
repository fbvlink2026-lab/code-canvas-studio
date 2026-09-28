import { useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

// Placeholder Components (We will replace these with real ones later)
const TopToolbar = () => (
  <div className="h-full bg-gray-900 text-white flex items-center px-4 justify-between border-b border-gray-700">
    <div className="flex gap-2">
      <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-medium">New Project</button>
      <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium">Save</button>
      <button className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm font-medium">Preview</button>
    </div>
    <div className="text-xs text-gray-400">GUI Editor Pro v0.0.1</div>
  </div>
);

const ComponentLibrary = () => (
  <div className="h-full bg-gray-800 text-gray-300 p-2 overflow-y-auto border-r border-gray-700">
    <h3 className="font-bold mb-2 text-sm uppercase tracking-wider">Components</h3>
    <div className="space-y-1">
      {['Div', 'Button', 'Input', 'Image', 'Text'].map((comp) => (
        <div key={comp} className="p-2 bg-gray-700 hover:bg-gray-600 cursor-grab active:cursor-grabbing rounded text-sm select-none">
          {comp}
        </div>
      ))}
    </div>
  </div>
);

const VisualCanvas = () => (
  <div className="h-full bg-[#f0f0f0] relative overflow-hidden flex items-center justify-center">
    {/* This is where the iframe or rendered DOM will go */}
    <div className="w-full h-full max-w-[1200px] bg-white shadow-lg mx-auto my-4 overflow-scroll">
       <div className="p-4 text-gray-500 italic">
         Canvas Area: Drop components here.
       </div>
    </div>
    
    {/* Grid Background Pattern Simulation */}
    <div className="absolute inset-0 pointer-events-none opacity-10" 
         style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
    </div>
  </div>
);

const PropertyInspector = () => (
  <div className="h-full bg-gray-800 text-gray-300 p-2 overflow-y-auto border-l border-gray-700">
    <h3 className="font-bold mb-2 text-sm uppercase tracking-wider">Properties</h3>
    <div className="text-xs text-gray-500">Select an element to edit properties.</div>
  </div>
);

const CodeEditorPanel = () => (
  <div className="h-full bg-gray-900 text-gray-300 p-2 overflow-hidden border-t border-gray-700">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-mono text-blue-400">index.html</span>
      <span className="text-xs text-gray-500">Ln 1, Col 1</span>
    </div>
    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
{`<div class="container">
  <h1>Hello World</h1>
  <p>This is a sample paragraph.</p>
</div>`}
    </pre>
  </div>
);

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden">
      
      {/* 1. Top Toolbar */}
      <header className="h-12 shrink-0">
        <TopToolbar />
      </header>

      {/* 2. Main Workspace (Resizable Panels) */}
      <main className="flex-grow overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="gui-editor-layout">
          
          {/* Left Sidebar: Component Library */}
          <Panel defaultSize={15} minSize={10} maxSize={30}>
            <ComponentLibrary />
          </Panel>

          <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />

          {/* Center Splitter: Vertical split between Canvas and Code */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup direction="vertical" autoSaveId="center-split">
              
              {/* Top Half: Visual Canvas */}
              <Panel defaultSize={60} minSize={20}>
                <VisualCanvas />
              </Panel>

              <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors" />

              {/* Bottom Half: Code Editor / Console */}
              <Panel defaultSize={40} minSize={10}>
                <CodeEditorPanel />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />

          {/* Right Sidebar: Property Inspector */}
          <Panel defaultSize={15} minSize={10} maxSize={30}>
            <PropertyInspector />
          </Panel>

        </PanelGroup>
      </main>

      {/* 3. Status Bar (Optional Footer) */}
      <footer className="h-6 shrink-0 bg-gray-900 border-t border-gray-800 flex items-center px-4 text-xs text-gray-500 justify-between">
        <span>Ready</span>
        <span>UTF-8 | LF | HTML</span>
      </footer>

    </div>
  );
}
