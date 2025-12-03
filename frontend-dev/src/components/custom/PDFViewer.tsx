import { useState } from "react";
import Swal from "sweetalert2";

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
}

export const PDFViewer = ({ fileUrl, fileName }: PDFViewerProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "File PDF tidak ditemukan atau tidak dapat dimuat.",
      confirmButtonColor: "#1e40af"
    });
  };

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📄❌</div>
          <p className="text-red-600 text-lg font-semibold mb-2">File PDF Tidak Dapat Dimuat</p>
          <p className="text-gray-600">Silakan hubungi administrator atau coba lagi nanti</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container w-full h-full flex justify-center items-center relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat PDF...</p>
          </div>
        </div>
      )}
      <iframe
        src={fileUrl}
        title={fileName}
        style={{
          width: "90%",
          height: "700px",
          border: "none",
          display: isLoading ? "none" : "block"
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};