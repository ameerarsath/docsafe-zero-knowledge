/**
 * TypeScript declarations for react-pdf
 */

declare module 'react-pdf' {
  export interface DocumentProps {
    file: string | File | Blob;
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    className?: string;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    scale?: number;
    rotate?: number;
    className?: string;
    renderTextLayer?: boolean;
    renderAnnotationLayer?: boolean;
  }

  export const Document: React.ComponentType<DocumentProps>;
  export const Page: React.ComponentType<PageProps>;
  
  export const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string;
    };
    version: string;
  };
}