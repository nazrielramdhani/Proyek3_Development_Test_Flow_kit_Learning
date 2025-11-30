import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import LayoutForm from "@/pages/LayoutForm";
import logo_polban from "../assets/logo/polban.png";
import { ClipLoader } from "react-spinners";
import ReactPlayer from 'react-player';
import { PDFViewer } from "@/components/custom/PDFViewer";
import { FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import ReactMarkdown from 'react-markdown';
import showdown from 'showdown';

// --- Types ---
type MaterialData = {
  id_materi: string;
  judul_materi: string;
  deskripsi_materi: string;
  jenis_materi: 'text' | 'pdf' | 'video';
  file_materi: string | null;
  text_materi: string | null;
  video_materi: string | null;
};

type TopicData = {
  nama_topik: string;
  deskripsi_topik: string;
};

// --- Helper Components for Content ---
const TextContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-white p-8 shadow-sm rounded-lg text-gray-800 leading-relaxed min-h-[400px] overflow-auto">
    <ReactMarkdown
      components={{
        // 1. Custom Image Styling: Centers it and makes it responsive
        img: ({node, ...props}) => (
          <div className="flex justify-center my-6">
            <img 
              {...props} 
              className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
              alt={props.alt || "Materi Image"}
            />
          </div>
        ),
        // 2. Paragraph Styling: Keeps your text spacing
        p: ({node, ...props}) => (
          <p {...props} className="mb-4 whitespace-pre-wrap text-justify" />
        ),
        // 3. Header Styling (Optional, enables # H1 and ## H2)
        h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-bold mb-4 mt-6 text-blue-800" />,
        h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mb-3 mt-5 text-gray-800" />,
        ul: ({node, ...props}) => <ul {...props} className="list-disc pl-6 mb-4" />,
        li: ({node, ...props}) => <li {...props} className="mb-1" />,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

  const PdfContent: React.FC<{ content: string }> = ({ content }) => { //buat pdf
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const pdfUrl = `${apiUrl}/materi_uploaded/${content}`;
  
  console.log('PDF URL:', pdfUrl);
  
  return (
    <div className="bg-gray-50 rounded-lg shadow-sm">
      <PDFViewer fileUrl={pdfUrl} fileName={content} />
    </div>
  );
};

const VideoContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-black p-0 rounded-lg shadow-sm flex justify-center items-center overflow-hidden aspect-video mx-auto w-3/4">
    <ReactPlayer 
      src={content} 
      controls
      playing
      width="100%"
      height="100%"
    />
  </div>
);

const MateriPage: React.FC = () => {
  const navigate = useNavigate();
  const { topicId, materiId } = useParams<{ topicId: string; materiId: string }>();

  // --- Config & State ---
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  const [activeMaterial, setActiveMaterial] = useState<MaterialData | null>(null);
  const [topicData, setTopicData] = useState<TopicData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 1. Fetch Data ---
  useEffect(() => {
    const sessionData = localStorage.getItem('session');
    
    if (!sessionData) {
      navigate("/login");
      return;
    }

    const session = JSON.parse(sessionData);
    
    if (session.login_type !== "student") {
      navigate("/dashboard-teacher");
      return;
    }

    const fetchTopicAndMaterials = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching data for topic: ${topicId}`);
        
        // Fetch topic info
        const topicRes = await fetch(`${apiUrl}/api/topik-pembelajaran`, {
          headers: { 
            Authorization: `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          },
        });

        if (topicRes.ok) {
          const topicDataAll = await topicRes.json();
          const currentTopic = topicDataAll.topik.find((t: any) => t.id === topicId);
          if (currentTopic) {
            setTopicData({
              nama_topik: currentTopic.nama,
              deskripsi_topik: currentTopic.deskripsi
            });
          }
        }

        // Fetch materials
        const res = await fetch(`${apiUrl}/api/topik/${topicId}/materials`, {
          headers: { 
            Authorization: `Bearer ${session.token}`,
            'Content-Type': 'application/json'
          },
        });

        console.log('Response status:', res.status);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Received data:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.materials && Array.isArray(data.materials) && data.materials.length > 0) {
          setMaterials(data.materials);
        } else {
          setMaterials([]);
          setError("Tidak ada materi yang tersedia untuk topik ini.");
        }
      } catch (error) {
        console.error("Failed to load materials:", error);
        setMaterials([]);
        setError(`Gagal memuat materi: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (topicId) {
      fetchTopicAndMaterials();
    } else {
      setError("Topic ID tidak ditemukan");
    }
  }, [topicId, navigate, apiUrl]);

  // --- 3. Scroll Sidebar to Active Item ---
  useEffect(() => {
    if (activeMaterial && sidebarRef.current) {
      // Find the button element for the active material
      // (This assumes the button index matches the material index)
      const index = materials.findIndex(m => m.id_materi === activeMaterial.id_materi);
      if (index !== -1) {
         const buttons = sidebarRef.current.querySelectorAll('button');
         if (buttons[index]) {
            buttons[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
         }
      }
    }
  }, [activeMaterial, materials]);

  // --- 2. Set Active Material based on URL ---
  useEffect(() => {
    if (materials.length > 0 && materiId) {
      console.log('Looking for material:', materiId);
      console.log('Available materials:', materials.map(m => m.id_materi));
      
      const current = materials.find((m) => m.id_materi === materiId);
      
      if (current) {
        console.log('Found material:', current);
        setActiveMaterial(current);
      } else {
        console.log('Material not found, defaulting to first');
        setActiveMaterial(materials[0]);
      }
    } else if (materials.length > 0 && !materiId) {
      setActiveMaterial(materials[0]);
    }
  }, [materiId, materials]);

  // --- 3. Navigation Logic ---
  const currentIndex = materials.findIndex(m => m.id_materi === activeMaterial?.id_materi);
  
  const showPrevious = currentIndex > 0;
  const showNext = currentIndex < materials.length - 1;

  const handleNavigate = (targetId: string) => {
    navigate(`/topic/${topicId}/materi/${targetId}`);
  };

  // Helper function untuk mendapatkan content dari material
  const getContentFromMaterial = (material: MaterialData): string => {
    if (material.jenis_materi === 'pdf') return material.file_materi || '';
    if (material.jenis_materi === 'text') return material.text_materi || '';
    if (material.jenis_materi === 'video') return material.video_materi || '';
    return '';
  };

  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleScrollUp = () => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollBy({ top: -200, behavior: "smooth" });
    }
  };

  const handleScrollDown = () => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollBy({ top: 200, behavior: "smooth" });
    }
  };

  const handleOpenNewTab = () => {
    if (!activeMaterial) return;

    // --- 1. Handle TEXT (Markdown -> HTML) ---
    if (activeMaterial.jenis_materi === 'text') {
      const converter = new showdown.Converter();
      const htmlBody = converter.makeHtml(activeMaterial.text_materi || '');
      const htmlPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${activeMaterial.judul_materi}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #374151; }
            img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px; border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <h1>${activeMaterial.judul_materi}</h1>
          ${htmlBody}
        </body>
        </html>
      `;
      const blob = new Blob([htmlPage], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    // --- 2. Handle PDF (Fix URL and Open) ---
    } else if (activeMaterial.jenis_materi === 'pdf') {
      let url = activeMaterial.file_materi || '';
      
      // Logic: If it's just a filename (e.g. "doc.pdf"), add the backend path
      if (!url.startsWith('http') && !url.startsWith('/')) {
         url = `${apiUrl}/materi_uploaded/${url}`;
      } else if (url.startsWith('/')) {
         url = `${apiUrl}${url}`;
      }
      
      // Open the clean URL directly in a new tab
      window.open(url, '_blank');

    // --- 3. Handle VIDEO ---
    } else {
      window.open(activeMaterial.video_materi || '', '_blank');
    }
  };

  const handleDownload = async () => {
    if (!activeMaterial) return;

    // --- 1. Handle TEXT (Convert to Word .doc) ---
    if (activeMaterial.jenis_materi === 'text') {
      const converter = new showdown.Converter();
      const htmlContent = converter.makeHtml(activeMaterial.text_materi || '');
      const documentContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${activeMaterial.judul_materi}</title></head>
        <body><h1>${activeMaterial.judul_materi}</h1>${htmlContent}</body>
        </html>
      `;
      const blob = new Blob([documentContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const element = document.createElement("a");
      element.href = url;
      element.download = `${activeMaterial.judul_materi.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
      
    // --- 2. Handle PDF (Fetch and Download) ---
    } else if (activeMaterial.jenis_materi === 'pdf') {
      let url = activeMaterial.file_materi || '';
      
      // FIX: Ensure the URL points to the /materi_uploaded/ folder on backend
      if (!url.startsWith('http') && !url.startsWith('/')) {
         url = `${apiUrl}/materi_uploaded/${url}`;
      } else if (url.startsWith('/')) {
         url = `${apiUrl}${url}`;
      }
      
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('File tidak ditemukan');
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        // Rename the file to the Material Title for better UX
        link.download = `${activeMaterial.judul_materi.replace(/\s+/g, '_')}.pdf`;
        
        document.body.appendChild(link);
        link.click();
        
        // Cleanup untuk mencegah memory leak
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (error) {
        console.error("Download failed:", error);
        alert("Gagal mengunduh file. Silakan coba lagi.");
      }

    // --- 3. Handle VIDEO (YouTube) ---
    } else {
      navigator.clipboard.writeText(activeMaterial.video_materi || '')
        .then(() => alert("Link YouTube berhasil disalin!"))
        .catch(() => console.log("Clipboard failed"));
      window.open("https://y2mate.nu/ysM1/", "_blank");
    }
  };

  const handleNext = () => {
    if (showNext) handleNavigate(materials[currentIndex + 1].id_materi);
  };

  const handlePrev = () => {
    if (showPrevious) handleNavigate(materials[currentIndex - 1].id_materi);
  };

  // --- Loading Screen ---
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <ClipLoader size={50} color={"#1e40af"} loading={true} />
      </div>
    );
  }

  // --- Error Screen ---
  if (error) {
    return (
      <div className="min-h-screen w-screen bg-gray-100 flex flex-col font-sans">
        <header className="flex items-center justify-between w-full px-6 py-3 bg-blue-900 text-white shadow-md">
          <div className="flex items-center gap-3">
            <img src={logo_polban} alt="Polban Logo" className="w-10 h-10" />
            <h1 className="text-xl font-bold">Coverage Test</h1>
          </div>
          <Link to="/topic" className="text-white font-semibold hover:text-gray-200 transition-colors text-sm">
            Kembali
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <Link to="/topic" className="bg-blue-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-800">
              Kembali ke Topik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Render ---
  if (isLoading) return <div className="fixed inset-0 flex items-center justify-center bg-white z-50"><ClipLoader size={50} color={"#1e40af"} /></div>;
  
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;

  return (
    <LayoutForm screenName={topicData?.nama_topik || "Materi Pembelajaran"}>

      {/* --- TOPIC INFO SECTION (Attached to top bar) --- */}
      <div className="bg-white px-6 py-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          {topicData?.nama_topik || "Loading..."} 
        </h2>
        
        {/* Change this to use activeMaterial data */}
        <h3 className="text-lg font-bold text-gray-800 mt-1">
          {activeMaterial?.judul_materi || ""}
        </h3>
        <p className="text-gray-600 mt-2 text-sm">
          {activeMaterial?.deskripsi_materi || ""} 
        </p>
      </div>

      <div className="flex flex-col md:flex-row w-screen min-h-screen">
        <div className="flex flex-col md:flex-row w-screen min-h-screen gap-8 ml-10 mr-10 mt-10 mb-10">
            
          {/* --- LEFT SIDEBAR (Navigation List) --- */}
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-2">
            
            {/* Top Arrow (Scrolls Up) */}
            <div 
              onClick={handleScrollUp}
              className="bg-blue-800 text-white py-2 text-center rounded-t-xl text-xs font-bold cursor-pointer hover:bg-blue-700 shadow-sm transition-colors select-none"
            >
              ^
            </div>

            {/* List Container (Scrollable) */}
            <div 
              ref={sidebarRef} // <--- Attach Ref Here
              className="flex flex-col gap-2 overflow-y-auto max-h-[500px] lg:max-h-[calc(100vh-300px)] pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
            >
              {/* Map ALL materials (No slice) */}
              {materials.map((material, index) => {
                const isActive = activeMaterial?.id_materi === material.id_materi;
                return (
                  <button
                    key={material.id_materi}
                    onClick={() => handleNavigate(material.id_materi)}
                    className={`
                      w-full text-left px-4 py-3 rounded-x1 text-sm font-semibold transition-all duration-200 border flex-shrink-0
                      ${isActive 
                        ? "bg-blue-700 text-white border-blue-700 shadow-md transform translate-x-1" 
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-blue-800 hover:border-blue-300"
                      }
                    `}
                  >
                    <div className="flex gap-2">
                        <span className="opacity-70 font-normal min-w-[20px]">{index + 1}.</span>
                        <span className="break-words">{material.judul_materi}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Arrow (Scrolls Down) */}
            <div 
              onClick={handleScrollDown}
              className="bg-blue-800 text-white py-2 text-center rounded-b-xl text-xs font-bold cursor-pointer hover:bg-blue-700 shadow-sm transition-colors select-none"
            >
              v
            </div>
          </div>

          {/* --- RIGHT CONTENT AREA --- */}
          <div className="w-full lg:flex-1 flex flex-col gap-4">
            
            {/* Toolbar (Actions Only) */}
            {/* 1. self-end: Pushes box to the right */}
            {/* 2. w-fit: Shrinks box width to fit content (instead of full width) */}
            {/* 3. p-2: Reduced padding to make it "smaller" */}
            <div className="self-end w-fit flex flex-row items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleDownload} // <--- ADD THIS
                  className="flex-1 sm:flex-none bg-blue-700 text-white px-5 py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  <FaDownload /> <span className="hidden sm:inline">Unduh</span>
                </button>
              <button 
                  onClick={handleOpenNewTab} // <--- ADD THIS
                  className="flex-1 sm:flex-none bg-white text-blue-800 border border-blue-800 px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                  <FaExternalLinkAlt /> <span className="hidden sm:inline">Buka Di Tab Baru</span>
              </button>
              </div>
            </div>

            {/* Content Display */}
            <div className="min-h-[500px] bg-white rounded-lg shadow-sm p-6">
              {activeMaterial ? (
                <>
                  {activeMaterial.jenis_materi === 'text' && <TextContent content={getContentFromMaterial(activeMaterial)} />}
                  {activeMaterial.jenis_materi === 'pdf' && <PdfContent content={getContentFromMaterial(activeMaterial)} />}
                  {activeMaterial.jenis_materi === 'video' && <VideoContent content={getContentFromMaterial(activeMaterial)} />}
                </>
              ) : (
                <div className="flex items-center justify-end h-full text-gray-400 p-8">
                  Pilih materi dari menu di samping.
                </div>
              )}
            </div>

            {/* Footer Navigation Buttons */}
            <div className="flex justify-end items-center pt-4 gap-3">
              
              {/* SEBELUMNYA (Only show if not first) */}
              {showPrevious && (
                <button 
                  onClick={handlePrev} 
                  className="bg-white text-gray-700 px-6 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors border border-gray-300 shadow-sm flex items-center justify-center gap-2"
                >
                  Sebelumnya
                </button>
              )}

              {/* BERIKUTNYA (Only show if not last) */}
              {showNext && (
                <button 
                  onClick={handleNext} 
                  className="bg-blue-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  Berikutnya
                </button>
              )}
              
            </div>

          </div>
        </div>
      </div>
    </LayoutForm>
  );
};

export default MateriPage;