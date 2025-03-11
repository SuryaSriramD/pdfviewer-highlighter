import React, { useState, useEffect, useRef, useCallback } from "react";

const PdfHighlighter = ({ pdfContainerRef, onHighlight, existingHighlights = [], isHighlightingEnabled }) => {
  const [selectedColor, setSelectedColor] = useState("#ffff00");
  const [highlights, setHighlights] = useState([]);
  const [selectionRects, setSelectionRects] = useState([]);
  const highlightLayerRef = useRef(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [viewerPagesFound, setViewerPagesFound] = useState(false);

  // Load existing highlights
  useEffect(() => {
    if (existingHighlights && existingHighlights.length > 0) {
      setHighlights(existingHighlights);
    }
  }, [existingHighlights]);

  // FIXED: Completely revised highlight layer positioning
  const positionHighlightLayer = useCallback(() => {
    if (!pdfContainerRef.current) return;

    const container = pdfContainerRef.current;
    
    // First, find the text layers which contain the actual text
    const textLayers = container.querySelectorAll('.rpv-core__text-layer');
    if (textLayers.length > 0) {
      console.log(`Found ${textLayers.length} text layers`);
      setViewerPagesFound(true);
      
      // For each text layer, create a highlight layer that's positioned exactly on top of it
      textLayers.forEach((textLayer, pageIndex) => {
        // Get the exact position and dimensions of the text layer
        const textLayerRect = textLayer.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Find or create a highlight layer for this page
        let pageHighlightLayer = container.querySelector(`.page-highlight-layer-${pageIndex}`);
        if (!pageHighlightLayer) {
          pageHighlightLayer = document.createElement('div');
          pageHighlightLayer.className = `page-highlight-layer page-highlight-layer-${pageIndex}`;
          pageHighlightLayer.style.position = 'absolute';
          pageHighlightLayer.style.pointerEvents = 'none';
          pageHighlightLayer.style.zIndex = '2'; // Same z-index as text layer
          pageHighlightLayer.dataset.pageIndex = pageIndex;
          
          // Insert the highlight layer as a sibling of the text layer
          textLayer.parentNode.insertBefore(pageHighlightLayer, textLayer.nextSibling);
        }
        
        // Position the highlight layer exactly over the text layer
        pageHighlightLayer.style.top = `${textLayer.offsetTop}px`;
        pageHighlightLayer.style.left = `${textLayer.offsetLeft}px`;
        pageHighlightLayer.style.width = `${textLayerRect.width}px`;
        pageHighlightLayer.style.height = `${textLayerRect.height}px`;
        
        console.log(`Positioned highlight layer for page ${pageIndex} at:`, {
          top: pageHighlightLayer.style.top,
          left: pageHighlightLayer.style.left,
          width: pageHighlightLayer.style.width,
          height: pageHighlightLayer.style.height
        });
      });
      
      return;
    }
    
    // Fallback: If no text layers found, try canvas layers
    const canvasLayers = container.querySelectorAll('.rpv-core__canvas-layer');
    if (canvasLayers.length > 0) {
      console.log(`Found ${canvasLayers.length} canvas layers`);
      setViewerPagesFound(true);
      
      canvasLayers.forEach((canvasLayer, pageIndex) => {
        const canvasLayerRect = canvasLayer.getBoundingClientRect();
        
        let pageHighlightLayer = container.querySelector(`.page-highlight-layer-${pageIndex}`);
        if (!pageHighlightLayer) {
          pageHighlightLayer = document.createElement('div');
          pageHighlightLayer.className = `page-highlight-layer page-highlight-layer-${pageIndex}`;
          pageHighlightLayer.style.position = 'absolute';
          pageHighlightLayer.style.pointerEvents = 'none';
          pageHighlightLayer.style.zIndex = '2';
          pageHighlightLayer.dataset.pageIndex = pageIndex;
          
          canvasLayer.parentNode.insertBefore(pageHighlightLayer, canvasLayer.nextSibling);
        }
        
        pageHighlightLayer.style.top = `${canvasLayer.offsetTop}px`;
        pageHighlightLayer.style.left = `${canvasLayer.offsetLeft}px`;
        pageHighlightLayer.style.width = `${canvasLayerRect.width}px`;
        pageHighlightLayer.style.height = `${canvasLayerRect.height}px`;
      });
      
      return;
    }
    
    // Last resort: Try to find any viewer pages
    const viewerPages = container.querySelectorAll('.rpv-core__viewer-page');
    if (viewerPages.length > 0) {
      console.log(`Found ${viewerPages.length} viewer pages`);
      setViewerPagesFound(true);
      
      viewerPages.forEach((page, pageIndex) => {
        const pageRect = page.getBoundingClientRect();
        
        let pageHighlightLayer = container.querySelector(`.page-highlight-layer-${pageIndex}`);
        if (!pageHighlightLayer) {
          pageHighlightLayer = document.createElement('div');
          pageHighlightLayer.className = `page-highlight-layer page-highlight-layer-${pageIndex}`;
          pageHighlightLayer.style.position = 'absolute';
          pageHighlightLayer.style.pointerEvents = 'none';
          pageHighlightLayer.style.zIndex = '2';
          pageHighlightLayer.dataset.pageIndex = pageIndex;
          
          page.appendChild(pageHighlightLayer);
        }
        
        pageHighlightLayer.style.top = '0';
        pageHighlightLayer.style.left = '0';
        pageHighlightLayer.style.width = '100%';
        pageHighlightLayer.style.height = '100%';
      });
    } else {
      console.error('No text layers, canvas layers, or viewer pages found');
    }
  }, [pdfContainerRef]);

  // Initialize highlight layer with more frequent checks
  useEffect(() => {
    if (!pdfContainerRef.current) return;
    
    const container = pdfContainerRef.current;
    
    // Handle scroll events
    const handleScroll = () => {
      requestAnimationFrame(positionHighlightLayer);
    };
    
    container.addEventListener('scroll', handleScroll);
    
    // Setup more frequent position updates after PDF loads
    const positionIntervals = [
      100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 4000, 5000
    ].map(delay => setTimeout(positionHighlightLayer, delay));
    
    // Also position on window resize
    window.addEventListener('resize', positionHighlightLayer);
    
    // Initial positioning
    positionHighlightLayer();
    
    // Create a mutation observer to detect when the PDF viewer adds pages
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          positionHighlightLayer();
        }
      }
    });
    
    // Start observing the container for changes
    observer.observe(container, { childList: true, subtree: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', positionHighlightLayer);
      positionIntervals.forEach(interval => clearTimeout(interval));
      observer.disconnect();
    };
  }, [pdfContainerRef, positionHighlightLayer]);

  // FIXED: Improved relative position calculation
  const getRelativePosition = useCallback((rect) => {
    if (!pdfContainerRef.current) return null;
    
    const container = pdfContainerRef.current;
    
    // First try to find text layers
    const textLayers = container.querySelectorAll('.rpv-core__text-layer');
    if (textLayers.length > 0) {
      // Find which text layer contains this rect
      for (let i = 0; i < textLayers.length; i++) {
        const textLayer = textLayers[i];
        const textLayerRect = textLayer.getBoundingClientRect();
        
        // Check if the rect is within this text layer
        if (
          rect.top >= textLayerRect.top &&
          rect.bottom <= textLayerRect.bottom &&
          rect.left >= textLayerRect.left &&
          rect.right <= textLayerRect.right
        ) {
          return {
            pageIndex: i,
            left: rect.left - textLayerRect.left,
            top: rect.top - textLayerRect.top,
            width: rect.width,
            height: rect.height
          };
        }
      }
    }
    
    // Fallback to canvas layers
    const canvasLayers = container.querySelectorAll('.rpv-core__canvas-layer');
    if (canvasLayers.length > 0) {
      for (let i = 0; i < canvasLayers.length; i++) {
        const canvasLayer = canvasLayers[i];
        const canvasLayerRect = canvasLayer.getBoundingClientRect();
        
        if (
          rect.top >= canvasLayerRect.top &&
          rect.bottom <= canvasLayerRect.bottom &&
          rect.left >= canvasLayerRect.left &&
          rect.right <= canvasLayerRect.right
        ) {
          return {
            pageIndex: i,
            left: rect.left - canvasLayerRect.left,
            top: rect.top - canvasLayerRect.top,
            width: rect.width,
            height: rect.height
          };
        }
      }
    }
    
    // Last resort: viewer pages
    const viewerPages = container.querySelectorAll('.rpv-core__viewer-page');
    if (viewerPages.length > 0) {
      for (let i = 0; i < viewerPages.length; i++) {
        const page = viewerPages[i];
        const pageRect = page.getBoundingClientRect();
        
        if (
          rect.top >= pageRect.top &&
          rect.bottom <= pageRect.bottom &&
          rect.left >= pageRect.left &&
          rect.right <= pageRect.right
        ) {
          return {
            pageIndex: i,
            left: rect.left - pageRect.left,
            top: rect.top - pageRect.top,
            width: rect.width,
            height: rect.height
          };
        }
      }
      
      // If we couldn't find a specific page, use the first page
      const firstPage = viewerPages[0];
      const firstPageRect = firstPage.getBoundingClientRect();
      
      return {
        pageIndex: 0,
        left: rect.left - firstPageRect.left,
        top: rect.top - firstPageRect.top,
        width: rect.width,
        height: rect.height
      };
    }
    
    // Absolute fallback: container-relative positioning
    const containerRect = container.getBoundingClientRect();
    return {
      pageIndex: 0,
      left: rect.left - containerRect.left + container.scrollLeft,
      top: rect.top - containerRect.top + container.scrollTop,
      width: rect.width,
      height: rect.height
    };
  }, [pdfContainerRef]);

  // FIXED: Improved highlight creation
  useEffect(() => {
    if (!pdfContainerRef.current) return;
    
    const container = pdfContainerRef.current;
    
    // Find all highlight layers
    const pageHighlightLayers = container.querySelectorAll('.page-highlight-layer');
    
    if (pageHighlightLayers.length === 0) {
      positionHighlightLayer();
      return; // Will be called again after positioning
    }
    
    // Clear existing highlights from all pages
    pageHighlightLayers.forEach(layer => {
      while (layer.firstChild) {
        layer.removeChild(layer.firstChild);
      }
    });
    
    // Create highlight elements directly in the DOM
    if (highlights && highlights.length > 0) {
      highlights.forEach((highlight, highlightIndex) => {
        if (highlight && highlight.rects && Array.isArray(highlight.rects)) {
          highlight.rects.forEach((rect, rectIndex) => {
            if (rect) {
              const pageIndex = rect.pageIndex || 0;
              const pageLayer = Array.from(pageHighlightLayers).find(
                layer => parseInt(layer.dataset.pageIndex) === pageIndex
              );
              
              if (pageLayer) {
                const highlightContainer = document.createElement('div');
                highlightContainer.style.position = 'absolute';
                highlightContainer.style.left = `${rect.left}px`;
                highlightContainer.style.top = `${rect.top}px`;
                highlightContainer.style.width = `${rect.width}px`;
                highlightContainer.style.height = `${rect.height}px`;
                highlightContainer.style.cursor = 'pointer';
                
                const highlightElement = document.createElement('div');
                highlightElement.style.position = 'absolute';
                highlightElement.style.left = '0';
                highlightElement.style.top = '0';
                highlightElement.style.width = '100%';
                highlightElement.style.height = '100%';
                highlightElement.style.backgroundColor = highlight.color || '#ffff00';
                highlightElement.style.opacity = '0.5';
                highlightElement.style.mixBlendMode = 'multiply';
                highlightElement.style.borderRadius = '2px';
                highlightElement.style.zIndex = '2';
                highlightElement.title = 'Click to delete highlight';
                highlightElement.style.cursor = 'pointer';

                // Add click handler to the highlight element
                highlightElement.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const confirmDelete = window.confirm('Do you want to delete this highlight?');
                  if (confirmDelete) {
                    deleteHighlight({
                      ...highlight,
                      pdf_id: window.location.pathname.split('/').pop() // Get PDF ID from URL
                    });
                  }
                });

                highlightContainer.appendChild(highlightElement);
                pageLayer.appendChild(highlightContainer);
              }
            }
          });
        }
      });
    }
  }, [highlights, pdfContainerRef, positionHighlightLayer]);

  // FIXED: Improved text selection handling
  useEffect(() => {
    if (!isHighlightingEnabled) {
      setSelectedText("");
      setSelectionPosition(null);
      return;
    }

    const checkSelection = () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && selection.rangeCount > 0) {
        setSelectedText(text);
        
        // Get selection range and rects
        const range = selection.getRangeAt(0);
        const rects = Array.from(range.getClientRects());
        
        if (rects.length > 0) {
          // Get the last rect to position the button
          const lastRect = rects[rects.length - 1];
          
          // Set position for the highlight button
          setSelectionPosition({
            left: lastRect.left + (lastRect.width / 2),
            top: lastRect.bottom + 10
          });
          
          // Calculate positions relative to PDF pages
        const adjustedRects = rects.map(rect => {
          const pos = getRelativePosition(rect);
          return pos ? {
            ...pos,
              text: text
          } : null;
        }).filter(Boolean);

          if (adjustedRects.length > 0) {
            setSelectionRects(adjustedRects);
          }
        }
      } else {
        setSelectedText("");
        setSelectionPosition(null);
      }
    };

    // Check for selection on mouseup
    const handleMouseUp = (e) => {
      // Don't trigger if clicking on the highlight button
      if (e.target.classList.contains('highlight-button') || 
          e.target.closest('.highlight-button')) {
        e.stopPropagation();
        return;
      }
      
      setTimeout(checkSelection, 100);
    };

    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isHighlightingEnabled, getRelativePosition]);

  // FIXED: Improved highlight application
  const applyHighlight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectionRects || selectionRects.length === 0) {
      return;
    }

    const newHighlight = {
      rects: selectionRects,
      color: selectedColor,
      text: selectedText,
      timestamp: new Date().toISOString(),
    };

    // Add to highlights
    setHighlights(prevHighlights => {
      const updatedHighlights = [...prevHighlights, newHighlight];
      return updatedHighlights;
    });
    
    if (onHighlight) {
      onHighlight(newHighlight);
    }

    // Clear selection
    window.getSelection().removeAllRanges();
    setSelectedText("");
    setSelectionPosition(null);
    setSelectionRects([]);
    
    // Force reposition of highlight layers
    setTimeout(positionHighlightLayer, 50);
  };

  // Add deleteHighlight function
  const deleteHighlight = async (highlight) => {
    try {
      const response = await fetch(
        `http://localhost:8000/pdfs/highlights/${highlight.pdf_id}/${highlight.timestamp}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        // Remove the highlight from local state
        setHighlights(prevHighlights => 
          prevHighlights.filter(h => h.timestamp !== highlight.timestamp)
        );
      } else {
        console.error('Failed to delete highlight');
      }
    } catch (error) {
      console.error('Error deleting highlight:', error);
    }
  };

  // Remove any existing highlight mode indicators from the DOM
  useEffect(() => {
    // Find and remove any existing highlight mode indicators
    const existingIndicators = document.querySelectorAll('.highlight-mode-indicator');
    existingIndicators.forEach(indicator => {
      indicator.remove();
    });
  }, []);

  return (
    <>
      {/* Color picker below header */}
      {isHighlightingEnabled && (
        <div
          style={{
            position: "fixed",
            top: 80, // Changed from 20 to 80 to position below header
            left: 70,
            zIndex: 9999,
            background: "#fff",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            gap: "8px",
          }}>
            <label 
              style={{ 
                fontSize: "14px",
                color: "#333",
                fontWeight: "500",
              }}
            >
              Highlight Color:
            </label>
            <div style={{
              position: "relative",
              width: "32px",
              height: "32px",
              borderRadius: "4px",
              overflow: "hidden",
              border: "2px solid #eee"
            }}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
                style={{
                  position: "absolute",
                  top: "-2px",
                  left: "-2px",
                  width: "36px",
                  height: "36px",
                  border: "none",
                  cursor: "pointer",
                }}
              />
            </div>
          </div>
          {!viewerPagesFound && (
            <button
              onClick={positionHighlightLayer}
              style={{
                padding: "6px 12px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => e.target.style.background = "#45a049"}
              onMouseOut={(e) => e.target.style.background = "#4CAF50"}
            >
              Retry Setup
            </button>
          )}
        </div>
      )}

      {/* Hidden highlight layer reference */}
      <div
        ref={highlightLayerRef}
        style={{ display: "none" }}
        className="highlight-layer"
      />

      {/* Single highlight button that appears near the selected text */}
      {isHighlightingEnabled && selectedText && selectionPosition && (
        <div
          style={{
            position: "fixed",
            left: `${selectionPosition.left}px`,
            top: `${selectionPosition.top}px`,
            transform: "translate(-50%, 0)",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "8px solid #333",
              marginBottom: "-1px",
            }}
          />
          <button
            className="highlight-button"
            onClick={applyHighlight}
            style={{
              background: "#333",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                background: selectedColor,
                borderRadius: "2px",
              }}
            />
            Highlight
          </button>
        </div>
      )}
    </>
  );
};

export default PdfHighlighter;