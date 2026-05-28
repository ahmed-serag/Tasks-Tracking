import React, { useState, useEffect, useRef } from 'react';
import { pdfService } from '../services/pdfService';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PdfTimelineView: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numPages, setNumPages] = useState<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPdf();
  }, []);

  const loadPdf = async () => {
    setIsLoading(true);
    try {
      const file = await pdfService.getPdf();
      if (file) {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      } else {
        setPdfUrl(null);
      }
    } catch (error) {
      console.error('Failed to load PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setIsLoading(true);
    try {
      await pdfService.savePdf(file);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setNumPages(undefined);
    } catch (error) {
      console.error('Failed to save PDF:', error);
      alert('Failed to save PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove the timeline PDF?')) {
      setIsLoading(true);
      try {
        await pdfService.deletePdf();
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(null);
        setNumPages(undefined);
      } catch (error) {
        console.error('Failed to delete PDF:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mb-4"></div>
        <p>Loading timeline...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[calc(100vh-200px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Wedding Timeline PDF</h2>
          <p className="text-gray-500 text-sm mt-1">View and manage your wedding day timeline document.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          {pdfUrl && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
          >
            {pdfUrl ? 'Upload New Version' : 'Upload PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center relative">
        {pdfUrl ? (
          <div className="w-full flex flex-col items-center p-4">
            <Document 
              file={pdfUrl} 
              onLoadSuccess={onDocumentLoadSuccess} 
              className="flex flex-col items-center"
              loading={
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mb-4"></div>
                  <p>Rendering PDF...</p>
                </div>
              }
            >
              {Array.from(new Array(numPages || 0), (el, index) => (
                <div key={`page_${index + 1}`} className="mb-6 shadow-lg rounded-lg overflow-hidden">
                  <Page 
                    pageNumber={index + 1} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                    width={Math.min(window.innerWidth - 100, 800)}
                  />
                </div>
              ))}
            </Document>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timeline Uploaded</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Upload your wedding day timeline PDF to easily view and reference it here.
            </p>
            <button
              onClick={handleUploadClick}
              className="px-6 py-3 text-sm font-bold text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-xl transition-colors"
            >
              Select PDF File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
