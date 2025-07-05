import { useState, useEffect } from 'react';

let Document: any = null;
let Page: any = null;
let pdfjs: any = null;
if (typeof window !== 'undefined') {
  // Only require react-pdf on the client
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reactPdf = require('react-pdf');
  Document = reactPdf.Document;
  Page = reactPdf.Page;
  pdfjs = reactPdf.pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export default function RulesPanel() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchPage, setSearchPage] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(typeof window !== 'undefined');
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevSpread() {
    setPageNumber((prev) => Math.max(1, prev - 2));
  }
  function goToNextSpread() {
    if (numPages) setPageNumber((prev) => Math.min(numPages - 1, prev + 2));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(searchTerm);
    if (!isNaN(n) && n >= 1 && numPages && n <= numPages) {
      setPageNumber(n % 2 === 0 ? n - 1 : n);
      setSearchPage(n);
    }
  }

  if (!isClient || !Document || !Page) {
    return <div className="text-[#6b3e26] font-serif">Loading PDF viewer...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#fff8e1] p-4 rounded-lg shadow-lg border-2 border-[#bfa76a]">
      <h2 className="text-2xl font-bold text-[#6b3e26] mb-2 font-serif">Game Rules</h2>
      <form onSubmit={handleSearch} className="mb-2 flex gap-2">
        <input
          type="text"
          placeholder="Go to page..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border border-[#bfa76a] rounded px-2 py-1 text-[#6b3e26] font-serif"
        />
        <button type="submit" className="bg-[#bfa76a] text-[#fff8e1] px-3 py-1 rounded font-bold">Go</button>
      </form>
      <div className="flex gap-4 mb-2">
        <button onClick={goToPrevSpread} disabled={pageNumber <= 1} className="bg-[#bfa76a] text-[#fff8e1] px-3 py-1 rounded font-bold">Prev</button>
        <span className="text-[#6b3e26] font-serif">Page {pageNumber}{numPages ? `-${Math.min(pageNumber+1, numPages)}` : ''} of {numPages}</span>
        <button onClick={goToNextSpread} disabled={numPages ? pageNumber+1 >= numPages : true} className="bg-[#bfa76a] text-[#fff8e1] px-3 py-1 rounded font-bold">Next</button>
      </div>
      <div className="flex flex-row gap-4 justify-center items-start w-full overflow-x-auto">
        <Document
          file="/knowledge/MR32.pdf"
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-[#6b3e26] font-serif">Loading PDF...</div>}
          className="flex flex-row gap-4"
        >
          <Page
            pageNumber={pageNumber}
            width={350}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="border border-[#bfa76a] rounded shadow bg-white"
          />
          {numPages && pageNumber + 1 <= numPages && (
            <Page
              pageNumber={pageNumber + 1}
              width={350}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="border border-[#bfa76a] rounded shadow bg-white"
            />
          )}
        </Document>
      </div>
    </div>
  );
} 