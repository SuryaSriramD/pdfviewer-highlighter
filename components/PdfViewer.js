import React, { useRef, useState, useEffect, useCallback } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import PdfHighlighter from "./PdfHighlighter";
import PdfToolbar from "./PdfToolbar";
import { FaHighlighter, FaTimes, FaChevronLeft, FaChevronRight, FaTrash, FaSearchPlus, FaSearchMinus } from "react-icons/fa";

const PdfViewer = ({ pdfUrl, onHighlight }) => {
  const pdfContainerRef = useRef(null);
  const [pdfId, setPdfId] = useState(null);
  const [existingHighlights, setExistingHighlights] = useState([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isHighlightingEnabled, setIsHighlightingEnabled] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [pdfHighlighterKey, setPdfHighlighterKey] = useState(0);
  const [pdfFilename, setPdfFilename] = useState("");
  const [scale, setScale] = useState(1);

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
    if (!pdfId) {
      console.error('No PDF ID available');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/pdfs/highlights/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdf_id: pdfId,
          user_id: 'default-user', // Add default user ID since we don't have authentication yet
          highlights: [highlight],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save highlight:', errorData);
        throw new Error(`Failed to save highlight: ${response.statusText}`);
      }

      // Update local state
      setExistingHighlights(prev => [...prev, highlight]);
      console.log('Highlight saved successfully');
    } catch (error) {
      console.error('Error saving highlight:', error);
      alert('Failed to save highlight');
    }
  };

  // Function to delete a highlight
  const deleteHighlight = async (highlight) => {
    if (!pdfId || !highlight.timestamp) {
      console.error('Cannot delete highlight: Missing PDF ID or timestamp', { pdfId, highlight });
      alert('Cannot delete highlight: Missing required information');
      return;
    }

    try {
      console.log('Deleting highlight:', highlight);
      
      // Encode the timestamp to handle special characters
      const encodedTimestamp = encodeURIComponent(highlight.timestamp);
      
      const response = await fetch(
        `http://localhost:8000/pdfs/highlights/${pdfId}/${encodedTimestamp}`,
        {
          method: 'DELETE',
        }
      );

      const responseData = await response.text();
      console.log('Delete response:', response.status, responseData);

      if (response.ok) {
        console.log('Highlight deleted successfully');
        
        // Update local state
        const updatedHighlights = existingHighlights.filter(h => h.timestamp !== highlight.timestamp);
        setExistingHighlights(updatedHighlights);
        
        // Force re-render of PdfHighlighter by creating a new array reference
        const highlightsForHighlighter = [...updatedHighlights];
        setPdfHighlighterKey(prev => prev + 1); // Add this state for forcing re-render
      } else {
        console.error('Failed to delete highlight:', responseData);
        alert(`Failed to delete highlight: ${response.status} ${responseData}`);
      }
    } catch (error) {
      console.error('Error deleting highlight:', error);
      alert('Failed to delete highlight: ' + error.message);
    }
  };

  // Function to delete all highlights
  const deleteAllHighlights = async () => {
    if (!pdfId) {
      console.error('Cannot delete highlights: No PDF ID available');
      return;
    }

    try {
      // Confirm before deleting all highlights
      if (!window.confirm('Are you sure you want to delete all highlights?')) {
        return;
      }

      console.log('Deleting all highlights for PDF:', pdfId);
      
      // Delete each highlight one by one
      let successCount = 0;
      let failCount = 0;
      
      for (const highlight of existingHighlights) {
        if (!highlight.timestamp) {
          console.warn('Skipping highlight without timestamp:', highlight);
          failCount++;
          continue;
        }
        
        try {
          // Encode the timestamp to handle special characters
          const encodedTimestamp = encodeURIComponent(highlight.timestamp);
          
          const response = await fetch(
            `http://localhost:8000/pdfs/highlights/${pdfId}/${encodedTimestamp}`,
            {
              method: 'DELETE',
            }
          );
          
          if (response.ok) {
            successCount++;
          } else {
            console.error(`Failed to delete highlight ${highlight.timestamp}:`, await response.text());
            failCount++;
          }
        } catch (error) {
          console.error(`Error deleting highlight ${highlight.timestamp}:`, error);
          failCount++;
        }
      }
      
      console.log(`Deleted ${successCount} highlights, failed to delete ${failCount} highlights`);
      
      if (failCount > 0) {
        alert(`Deleted ${successCount} highlights, but failed to delete ${failCount} highlights. Check console for details.`);
      } else {
        console.log('All highlights deleted successfully');
      }
      
      // Clear all highlights from local state
      setExistingHighlights([]);
      setPdfHighlighterKey(prev => prev + 1); // Force re-render of PdfHighlighter
    } catch (error) {
      console.error('Error deleting all highlights:', error);
      alert('Failed to delete all highlights: ' + error.message);
    }
  };

  // Load existing highlights when PDF is loaded
  const loadHighlights = useCallback(async () => {
    if (!pdfId) return;
    
    setIsLoadingHighlights(true);
    try {
      const response = await fetch(`http://localhost:8000/pdfs/highlights/${pdfId}`);
      if (!response.ok) {
        throw new Error(`Failed to load highlights: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Flatten the highlights array if needed
      const highlights = data.highlights.flatMap(doc => doc.highlights || []);
      console.log('Loaded highlights:', highlights);
      setExistingHighlights(highlights);
    } catch (error) {
      console.error('Error loading highlights:', error);
      alert('Failed to load highlights');
    } finally {
      setIsLoadingHighlights(false);
    }
  }, [pdfId]);

  // Load highlights when PDF ID changes or when document loads
  useEffect(() => {
    if (pdfId && pdfLoaded) {
      console.log('Loading highlights for PDF ID:', pdfId);
      loadHighlights();
    }
  }, [pdfId, pdfLoaded, loadHighlights]);

  // Extract PDF ID from URL and load PDF info
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/view\/([^\/]+)/);
    if (match && match[1]) {
      const id = match[1];
      console.log('Setting PDF ID:', id);
      setPdfId(id);
      
      // Fetch PDF info
      const fetchPdfInfo = async () => {
        try {
          const response = await fetch(`http://localhost:8000/pdfs/info/${id}`);
          if (response.ok) {
            const data = await response.json();
            setPdfFilename(data.filename || "Untitled PDF");
          }
        } catch (error) {
          console.error('Error fetching PDF info:', error);
          setPdfFilename("Untitled PDF");
        }
      };
      
      fetchPdfInfo();
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

  // Toggle highlights panel
  const toggleHighlightsPanel = () => {
    setShowHighlightsPanel(!showHighlightsPanel);
  };

  // Add zoom functions
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.1, 3)); // Max zoom 300%
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.1, 0.5)); // Min zoom 50%
  };

  return (
    <div className="pdf-viewer-container">
      {/* Add header */}
      <div className="pdf-viewer-header">
        <div className="header-content">
          <h1 className="pdf-title">{pdfFilename}</h1>
        </div>
      </div>

      <PdfToolbar onToolSelect={handleToolSelect} selectedTool={selectedTool} />
      
      {/* Move zoom controls below toolbar */}
      <div className="zoom-controls">
        <button onClick={zoomIn} className="zoom-button" title="Zoom In">
          <FaSearchPlus />
        </button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button onClick={zoomOut} className="zoom-button" title="Zoom Out">
          <FaSearchMinus />
        </button>
      </div>

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
              defaultScale={scale}
              onDocumentLoad={handleDocumentLoad}
            />
          </Worker>
          
          {pdfLoaded && (
            <PdfHighlighter 
              key={pdfHighlighterKey}
              pdfContainerRef={pdfContainerRef}
              onHighlight={saveHighlight}
              existingHighlights={existingHighlights}
              isHighlightingEnabled={isHighlightingEnabled}
            />
          )}
          {isLoadingHighlights && (
            <div className="loading-highlights">
              Loading highlights...
            </div>
          )}
        </div>
      </div>

      {/* Highlights Panel Toggle Button */}
      <button 
        className="highlights-panel-toggle"
        onClick={toggleHighlightsPanel}
        title={showHighlightsPanel ? "Hide Highlights" : "Show Highlights"}
      >
        {showHighlightsPanel ? <FaChevronRight /> : <FaChevronLeft />}
        <FaHighlighter style={{ marginLeft: showHighlightsPanel ? 0 : 8 }} />
      </button>

      {/* Highlights Panel */}
      <div className={`highlights-panel ${showHighlightsPanel ? 'open' : ''}`}>
        <div className="highlights-panel-header">
          <h3>Highlights</h3>
          <div className="header-buttons">
            {existingHighlights && existingHighlights.length > 0 && (
              <button 
                className="clear-all-button"
                onClick={deleteAllHighlights}
                title="Clear All Highlights"
              >
                Clear All
              </button>
            )}
            <button 
              className="close-panel-button"
              onClick={toggleHighlightsPanel}
              title="Close Panel"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        <div className="highlights-list">
          {existingHighlights && existingHighlights.length > 0 ? (
            existingHighlights.map((highlight, index) => (
              <div key={highlight.timestamp || index} className="highlight-item">
                <div 
                  className="highlight-color" 
                  style={{ backgroundColor: highlight.color || '#ffff00' }}
                />
                <div className="highlight-text">
                  {highlight.text || `Highlight ${index + 1}`}
                </div>
                <button 
                  className="delete-highlight-button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this highlight?')) {
                      deleteHighlight(highlight);
                    }
                  }}
                  title="Delete Highlight"
                >
                  <FaTrash />
                </button>
              </div>
            ))
          ) : (
            <div className="no-highlights">
              No highlights yet. Use the highlight tool to add some.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .pdf-viewer-container {
          position: relative;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .pdf-viewer-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          z-index: 1000;
          display: flex;
          align-items: center;
          padding: 0 20px;
        }

        .header-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }

        .pdf-title {
          margin: 0;
          font-size: 18px;
          color: #333;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80%;
        }

        .pdf-content {
          flex-grow: 1;
          margin-left: 60px;
          margin-top: 60px; /* Add margin to account for header */
          position: relative;
          height: calc(100vh - 60px); /* Adjust height to account for header */
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

        /* Highlights Panel Toggle Button */
        .highlights-panel-toggle {
          position: fixed;
          right: ${showHighlightsPanel ? '300px' : '0'};
          top: 50%;
          transform: translateY(-50%);
          background: #fff;
          border: none;
          border-radius: ${showHighlightsPanel ? '4px 0 0 4px' : '4px 0 0 4px'};
          box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
          padding: 12px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1001;
          transition: right 0.3s ease;
        }

        .highlights-panel-toggle:hover {
          background: #f0f0f0;
        }

        /* Highlights Panel */
        .highlights-panel {
          position: fixed;
          top: 0;
          right: ${showHighlightsPanel ? '0' : '-300px'};
          width: 300px;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          transition: right 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .highlights-panel.open {
          right: 0;
        }

        .highlights-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #eee;
        }

        .highlights-panel-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .header-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .clear-all-button {
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 5px 10px;
          font-size: 12px;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-all-button:hover {
          background: #f8f8f8;
          color: #ff4444;
          border-color: #ff4444;
        }

        .close-panel-button {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #666;
          font-size: 16px;
          padding: 5px;
        }

        .close-panel-button:hover {
          color: #333;
        }

        .highlights-list {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .highlight-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #eee;
          position: relative;
        }

        .highlight-color {
          width: 16px;
          height: 16px;
          border-radius: 3px;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .highlight-text {
          flex: 1;
          font-size: 14px;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .delete-highlight-button {
          background: transparent;
          border: none;
          color: #ff4444;
          cursor: pointer;
          padding: 5px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .delete-highlight-button:hover {
          opacity: 1;
        }

        .no-highlights {
          color: #666;
          font-size: 14px;
          text-align: center;
          padding: 20px;
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

        .zoom-controls {
          position: fixed;
          left: 0;
          bottom: 20px; /* Changed from top to bottom */
          width: 60px;
          background: white;
          padding: 10px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
          border-radius: 0 8px 8px 0;
          z-index: 999;
        }

        .zoom-button {
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          transition: all 0.2s;
        }

        .zoom-button:hover {
          background: #f0f0f0;
          color: #333;
          border-color: #999;
        }

        .zoom-level {
          font-size: 14px;
          color: #666;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default PdfViewer;