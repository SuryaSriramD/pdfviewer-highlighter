import React from 'react';
import { FaHighlighter, FaCrop, FaSearch, FaSquare, FaStickyNote } from 'react-icons/fa';

const PdfToolbar = ({ onToolSelect, selectedTool }) => {
  const tools = [
    { id: 'highlight', icon: FaHighlighter, label: 'Highlight Text' },
    { id: 'clip', icon: FaCrop, label: 'Clip Selection' },
    { id: 'rectangle', icon: FaSquare, label: 'Draw Rectangle' },
    { id: 'search', icon: FaSearch, label: 'Find in Document' },
    { id: 'sticky', icon: FaStickyNote, label: 'Add Sticky Note' },
  ];

  const handleToolClick = (toolId) => {
    console.log(`Toolbar: Clicked on tool ${toolId}`);
    onToolSelect(toolId);
  };

  return (
    <div className="pdf-toolbar">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`toolbar-button ${selectedTool === tool.id ? 'active' : ''}`}
          onClick={() => handleToolClick(tool.id)}
          title={tool.label}
        >
          <tool.icon />
        </button>
      ))}
      <style jsx>{`
        .pdf-toolbar {
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          background: #fff;
          padding: 10px;
          border-radius: 0 8px 8px 0;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 1000;
        }

        .toolbar-button {
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: all 0.2s ease;
        }

        .toolbar-button:hover {
          background: #f0f0f0;
          color: #000;
        }

        .toolbar-button.active {
          background: #e3f2fd;
          color: #1976d2;
        }
      `}</style>
    </div>
  );
};

export default PdfToolbar; 