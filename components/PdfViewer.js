import React, { useRef, useState, useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import PdfHighlighter from "./PdfHighlighter";
import PdfToolbar from "./PdfToolbar";

const PdfViewer = ({ pdfUrl, onHighlight }) => {
  const pdfContainerRef = useRef(null);
  const [pdfId, setPdfId] = useState(null);
  const [existingHighlights, setExistingHighlights] = useState([]);
  const fileInputRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isHighlightingEnabled, setIsHighlightingEnabled] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  // Function to handle tool selection
  const handleToolSelect = (toolId) => {
    // First, disable all tools
    setShowSearchBar(false);
    setIsHighlightingEnabled(false);
    
    // Then enable the selected tool
    if (toolId === 'search') {
      setShowSearchBar(true);
    } else if (toolId === 'highlight') {
      setIsHighlightingEnabled(true);
    }
    
    // Update the selected tool state
    setSelectedTool(toolId);
  };

  // Function to handle PDF upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.includes('pdf')) {
      alert('Please select a valid PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/pdfs/upload/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.pdf_id) {
        setPdfId(data.pdf_id);
        window.location.href = `/view/${data.pdf_id}`;
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Failed to upload PDF');
    }
  };

  // Function to save highlights to backend
  const saveHighlight = async (highlight) => {
    if (!pdfId) return;

    try {
      const response = await fetch('http://localhost:8000/pdfs/highlights/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_id: pdfId,
          user_id: 'default-user',
          highlights: [highlight],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save highlight');
      }

      // Update local state
      setExistingHighlights(prev => [...prev, highlight]);
      
      if (onHighlight) {
        onHighlight(highlight);
      }
    } catch (error) {
      console.error('Error saving highlight:', error);
      alert('Failed to save highlight');
    }
  };

  // Load existing highlights when PDF is loaded
  useEffect(() => {
    const loadHighlights = async () => {
      if (!pdfId) return;

      try {
        const response = await fetch(`http://localhost:8000/pdfs/highlights/${pdfId}`);
        if (response.ok) {
          const data = await response.json();
          setExistingHighlights(data.highlights);
        }
      } catch (error) {
        console.error('Error loading highlights:', error);
      }
    };

    loadHighlights();
  }, [pdfId]);

  // Extract PDF ID from URL if available
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/view\/([^\/]+)/);
    if (match && match[1]) {
      setPdfId(match[1]);
    }
  }, []);

  // Handle PDF loading completion
  const handleDocumentLoad = () => {
    setPdfLoaded(true);
    
    // Add a small delay to ensure the PDF is fully rendered
    setTimeout(() => {
      // Fix any overflow issues that might cause scrollbars
      const viewerElements = document.querySelectorAll('.rpv-core__viewer, .rpv-core__viewer-container, .rpv-core__inner-page');
      viewerElements.forEach(el => {
        el.style.overflow = 'visible';
      });
    }, 500);
  };

  // Remove any existing highlight mode indicators
  useEffect(() => {
    // Find and remove any existing highlight mode indicators
    const removeExistingIndicators = () => {
      const existingIndicators = document.querySelectorAll('.highlight-mode-active');
      existingIndicators.forEach(indicator => {
        if (indicator.textContent.includes('Highlight Mode Active')) {
          indicator.remove();
        }
      });
    };
    
    // Run on mount and when highlighting is enabled/disabled
    removeExistingIndicators();
    
    // Set up an interval to periodically check and remove duplicate indicators
    const interval = setInterval(removeExistingIndicators, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isHighlightingEnabled]);

  return (
    <div className="pdf-viewer-container">
      <PdfToolbar onToolSelect={handleToolSelect} selectedTool={selectedTool} />
      
      {showSearchBar && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search in document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="pdf-content">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        
        <div ref={pdfContainerRef} className="pdf-container">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer 
              fileUrl={pdfUrl}
              defaultScale={1}
              onDocumentLoad={handleDocumentLoad}
            />
          </Worker>
          
          <PdfHighlighter 
            pdfContainerRef={pdfContainerRef}
            onHighlight={saveHighlight}
            existingHighlights={existingHighlights}
            isHighlightingEnabled={isHighlightingEnabled}
          />
        </div>
      </div>

      <style jsx>{`
        .pdf-viewer-container {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
        }

        .pdf-content {
          flex-grow: 1;
          margin-left: 60px;
          position: relative;
          height: 100%;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .pdf-container {
          height: 100%;
          width: 90%;
          max-width: 1000px;
          overflow: auto;
          background: white;
          margin: 0 auto;
          padding: 20px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          position: relative;
        }

        .search-bar {
          position: fixed;
          top: 20px;
          left: 70px;
          z-index: 1000;
          padding: 10px;
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .search-bar input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 250px;
          font-size: 14px;
        }

        .search-bar input:focus {
          outline: none;
          border-color: #1976d2;
        }

        :global(.rpv-core__viewer) {
          width: 100% !important;
          height: 100% !important;
          overflow: visible !important;
        }

        :global(.rpv-core__viewer-page) {
          margin: 0 auto !important;
        }
        
        :global(.rpv-core__viewer-container) {
          overflow: visible !important;
        }
      `}</style>
    </div>
  );
};

export default PdfViewer;