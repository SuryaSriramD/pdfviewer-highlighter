import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
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
      setError(error.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
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
      </div>
    </div>
  );
}