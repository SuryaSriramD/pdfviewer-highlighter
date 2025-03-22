import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface PdfRecord {
  pdf_id: string;
  filename: string;
  last_accessed: string;
  access_count?: number;
}

export default function Home(): React.ReactElement {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPdfs, setRecentPdfs] = useState<PdfRecord[]>([]);
  const router = useRouter();

  // Fetch recent PDFs when the component mounts
  useEffect(() => {
    const fetchRecentPdfs = async (): Promise<void> => {
      try {
        const response = await fetch('http://localhost:8000/pdfs/recent/default-user');
        const data = await response.json();
        setRecentPdfs(data.recent_pdfs || []);
      } catch (error) {
        console.error('Error fetching recent PDFs:', error);
      }
    };

    fetchRecentPdfs();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setError('Please select a valid PDF file');
      return;
    }

    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file:', file.name);
      const response = await fetch('http://localhost:8000/pdfs/upload/', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing JSON response:', e);
        throw new Error('Invalid response from server');
      }

      if (data.pdf_id) {
        console.log('Upload successful, redirecting to:', `/view/${data.pdf_id}`);
        router.push(`/view/${data.pdf_id}`);
      } else {
        throw new Error('No PDF ID received from server');
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  // Function to clear history
  const clearHistory = async (): Promise<void> => {
    try {
      await fetch('http://localhost:8000/pdfs/recent/clear/default-user', {
        method: 'DELETE',
      });
      setRecentPdfs([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: '#f5f5f5'
    }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>
        PDF Viewer with Highlighting
      </h1>
      
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        width: '100%',
        maxWidth: '500px'
      }}>
        {error && (
          <div style={{
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="pdf-upload"
          disabled={uploading}
        />
        <label
          htmlFor="pdf-upload"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: uploading ? '#6c757d' : '#4CAF50',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            transition: 'background 0.3s'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </label>
        
        <p style={{ marginTop: '20px', color: '#666' }}>
          {uploading 
            ? 'Please wait while we process your file...'
            : 'Upload a PDF file to view and highlight text'
          }
        </p>

        {/* Recent PDFs Section */}
        {recentPdfs.length > 0 && (
          <div style={{ marginTop: '40px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '15px' }}>
              Recently Opened PDFs
            </h2>
            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0,
              borderTop: '1px solid #eee' 
            }}>
              {recentPdfs.map((pdf) => (
                <li key={pdf.pdf_id} style={{ 
                  padding: '12px 0',
                  borderBottom: '1px solid #eee',
                }}>
                  <Link 
                    href={`/view/${pdf.pdf_id}`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: '#1a73e8',
                      textDecoration: 'none',
                      fontSize: '16px'
                    }}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ marginRight: '10px', color: '#e74c3c' }}
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    {pdf.filename}
                    <span style={{ 
                      marginLeft: 'auto', 
                      fontSize: '14px', 
                      color: '#666',
                      fontWeight: 'normal'
                    }}>
                      {new Date(pdf.last_accessed).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Clear History Button */}
            <button
              onClick={clearHistory}
              style={{
                marginTop: '15px',
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#666'
              }}
            >
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 