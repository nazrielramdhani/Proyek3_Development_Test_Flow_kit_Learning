import React, { useState, useEffect } from "react";
import LayoutForm from "./LayoutForm"; // 1. Using the template from ModuleTestPage.tsx
import { useNavigate, useParams, Link } from "react-router-dom";
import { ClipLoader } from "react-spinners"; // 2. Using the loading logic from ModuleTestPage.tsx

// --- Mock Data: This mimics the structure from your screenshots ---
// TODO: Replace this with an API call
const mockSubMaterials = [
  { id: "1", title: "Pengantar", type: "text", content: "According to all known laws of aviation, there is no way a bee should be able to fly. Its wings are too small to get its fat little body off the ground. The bee, of course, flies anyway because bees don't care what humans think is impossible. Yellow, black. Yellow, black. Yellow, black. Ooh, black and yellow! Let's shake it up a little. Barry! Breakfast is ready!" },
  { id: "2", title: "Apa itu PBO?", type: "pdf", content: "/path/to/your/dummy.pdf" },
  { id: "3", title: "Bahasa - Bahasa di PBO", type: "video", content: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { id: "4", title: "Cara Mengoding PBO", type: "text", content: "This is the text for 'Cara Mengoding PBO'." },
  { id: "5", title: "Constructor", type: "text", content: "This is the text for 'Constructor'." },
  { id: "6", title: "Setter", type: "text", content: "This is the text for 'Setter'." },
  { id: "7", title: "Getter", type: "text", content: "This is the text for 'Getter'." },
  { id: "8", title: "Inheritance", type: "text", content: "This is the text for 'Inheritance'." },
  { id: "9", title: "Penutup", type: "text", content: "This is the text for 'Penutup'." },
];

const mockTopic = {
  title: "Pemrograman Tingkat 2",
  subtitle: "Pemrograman Berbasis Godot",
  materials: mockSubMaterials
};
// --- End Mock Data ---


// --- Helper components to render different content types ---
const TextContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-white p-6 shadow-inner text-gray-700 leading-relaxed h-full">
    <pre className="whitespace-pre-wrap font-sans">{content}</pre>
  </div>
);

const PdfContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-gray-800 p-6 shadow-inner h-full">
    {/* TODO: Replace with 'react-pdf' */}
    <iframe src={content} width="100%" height="100%" title="pdf-viewer"></iframe>
  </div>
);

const VideoContent: React.FC<{ content: string }> = ({ content }) => (
    <div className="bg-gray-800 p-6 shadow-inner h-full">
      {/* TODO: Replace with 'react-player' */}
      <p className="text-white">Video Player for: {content}</p>
    </div>
);
// --- End Helper components ---


const MateriPage: React.FC = () => {
  // --- Start: Logic from ModuleTestPage.tsx template ---
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;

  const sessionData = localStorage.getItem('session');
  let session = null;
  if (sessionData != null) {
      session = JSON.parse(sessionData);
      apiKey = session.token;
  }

  // Loading Overlay component from your template
  const LoadingOverlay: React.FC = () => (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-4 rounded shadow-lg flex items-center">
          <ClipLoader size={35} color={"#123abc"} loading={true} />
          <span className="ml-2">Loading Data...</span>
        </div>
      </div>
  );
  
  const [isLoading, setIsLoading] = useState(false); 
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // --- End: Logic from ModuleTestPage.tsx template ---

  // --- Start: New state and logic for this page ---
  const { materiId } = useParams<{ materiId: string }>(); 
  const [activeMaterial, setActiveMaterial] = useState(mockSubMaterials[0]);

  // Session check (combined with data fetching)
  useEffect(() => {
    if (session != null) {
      if (session.login_type !== "student") {
        navigate("/dashboard-teacher");
      } else {
        // TODO: Add API call logic here
        console.log("Loading material for ID:", materiId);
      }
    } else {
      navigate("/login");
    }
  }, [sessionData, navigate, materiId, apiKey, apiUrl]); // Added dependencies

  const renderContent = () => {
    // Renders Text, PDF, or Video based on activeMaterial.type
    switch (activeMaterial.type) {
      case 'text':
        return <TextContent content={activeMaterial.content} />;
      case 'pdf':
        return <PdfContent content={activeMaterial.content} />;
      case 'video':
        return <VideoContent content={activeMaterial.content} />;
      default:
        return <p>Content type not supported.</p>;
    }
  };
  // --- End: New state and logic ---

  // 3. Wrap everything in LayoutForm
  // The 'screenName' prop will be displayed in the NavbarForm
  return (
    <LayoutForm screenName={mockTopic.title}> 
      {/* --- Display Loading/Error Overlays (from template) --- */}
      {isLoading && <LoadingOverlay />}
      {infoMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 mb-4 text-green-500 bg-green-100 rounded-md">
          {infoMessage}
          </div>
      )}
      {errorMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 mb-4 text-red-500 bg-red-100 rounded-md">
          {errorMessage}
          </div>
      )}

      {/* --- 4. Main Content Wrapper (full screen, now inside LayoutForm) --- */}
      <div className="flex flex-1 w-full h-full p-6 gap-6">
        
        {/* --- Left-side Sub-Navigation --- */}
        <div className="w-1/4 flex flex-col">
          <p className="text-sm text-gray-600 mb-4">{mockTopic.subtitle}</p>
          <div className="flex flex-col space-y-2 overflow-y-auto">
            {mockTopic.materials.map((material, index) => (
              <button
                key={material.id}
                onClick={() => setActiveMaterial(material)}
                className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors ${
                  activeMaterial.id === material.id
                    ? "bg-blue-800 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-50 shadow"
                } ${index === 0 ? 'rounded-t-lg' : ''} ${index === mockTopic.materials.length - 1 ? 'rounded-b-lg' : ''}`}
              >
                {material.title}
              </button>
            ))}
          </div>
        </div>

        {/* --- Right-side Content Area --- */}
        <div className="w-3/4 flex flex-col h-full">
          <div className="flex justify-between items-center bg-white p-4 rounded-t-lg shadow">
            <select className="p-2 border border-gray-300 rounded-md text-sm">
              <option>{activeMaterial.title}</option>
            </select>
            <div className="space-x-2">
              <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300">
                Unduh
              </button>
              <button className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                Buka Di Tab Baru
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-b-lg shadow overflow-auto min-h-0">
            {renderContent()}
          </div>
          <div className="flex justify-between mt-4">
            <button className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400">
              Sebelumnya
            </button>
            <button className="bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </LayoutForm>
  );
};

export default MateriPage;