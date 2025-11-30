import Swal from "sweetalert2";

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
}

export const PDFViewer = ({ fileUrl, fileName }: PDFViewerProps) => {
  return (
    <div className="pdf-viewer-container w-full h-full flex justify-center items-center">
      <iframe
        src={fileUrl}
        title={fileName}
        style={{
          width: "90%",
          height: "700px",
          border: "none",
        }}
        onError={() =>
          Swal.fire("Error", "File PDF doesn't exist.", "error")
        }
      />
    </div>
  );
};