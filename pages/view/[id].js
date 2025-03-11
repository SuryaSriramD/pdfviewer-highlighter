import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PdfViewer from '../../components/PdfViewer';

const ViewPdf = () => {
  const router = useRouter();
  const { id } = router.query;
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!id) return;

    // Set the PDF URL to the backend endpoint
    setPdfUrl(`http://localhost:8000/pdfs/pdf/${id}`);
  }, [id]);

  if (!pdfUrl) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>PDF Viewer</h1>
      <PdfViewer pdfUrl={pdfUrl} />
    </div>
  );
};

export default ViewPdf; 