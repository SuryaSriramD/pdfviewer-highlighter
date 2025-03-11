import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PdfViewer from '../../components/PdfViewer';

export default function ViewPdf() {
  const router = useRouter();
  const { id } = router.query;
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (id) {
      const url = `http://localhost:8000/pdfs/pdf/${id}`;
      setPdfUrl(url);
      
      // Record PDF access
      const recordPdfAccess = async () => {
        try {
          await fetch(`http://localhost:8000/pdfs/access/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: 'default-user', // Replace with actual user ID if you have authentication
            }),
          });
          console.log('PDF access recorded');
        } catch (error) {
          console.error('Error recording PDF access:', error);
        }
      };

      recordPdfAccess();
    }
  }, [id]);

  if (!pdfUrl) {
    return <div>Loading...</div>;
  }

  return <PdfViewer pdfUrl={pdfUrl} />;
} 