import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import LayoutForm from "@/pages/LayoutForm";
import logo_polban from "../assets/logo/polban.png";
import { ClipLoader } from "react-spinners";
import ReactPlayer from 'react-player';

// --- Types ---
type MaterialData = {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'pdf' | 'video';
  content: string;
};

type TopicData = {
  nama_topik: string;
  deskripsi_topik: string;
};

// --- Helper Components for Content ---
const TextContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-white p-8 shadow-sm rounded-lg text-gray-800 leading-relaxed min-h-[400px]">
    <p className="whitespace-pre-wrap font-sans text-base text-justify">
      {content}
    </p>
  </div>
);

const PdfContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-gray-100 p-4 rounded-lg shadow-sm h-[600px]">
    <iframe src={content} width="100%" height="100%" title="pdf-viewer" className="rounded border-0"/>
  </div>
);

const VideoContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-black p-0 rounded-lg shadow-sm flex justify-center items-center min-h-[400px] overflow-hidden">
    {/* Use ReactPlayer here */}
    <ReactPlayer 
      url={content} 
      controls={true}
      width="100%"
      height="400px" // Or whatever height you prefer
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
        
        if (data.materials && data.materials.length > 0) {
          setMaterials(data.materials);
        } else {
          setError("Tidak ada materi yang tersedia untuk topik ini.");
        }
      } catch (error) {
        console.error("Failed to load materials:", error);
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

  // --- 2. Set Active Material based on URL ---
  useEffect(() => {
    if (materials.length > 0 && materiId) {
      console.log('Looking for material:', materiId);
      console.log('Available materials:', materials.map(m => m.id));
      
      const current = materials.find((m) => m.id === materiId);
      
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
  const currentIndex = materials.findIndex(m => m.id === activeMaterial?.id);
  
  const showPrevious = currentIndex > 0;
  const showNext = currentIndex < materials.length - 1;

  const handleNavigate = (targetId: string) => {
    navigate(`/topic/${topicId}/materi/${targetId}`);
  };

  const handleNext = () => {
    if (showNext) handleNavigate(materials[currentIndex + 1].id);
  };

  const handlePrev = () => {
    if (showPrevious) handleNavigate(materials[currentIndex - 1].id);
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
          {activeMaterial?.title || ""}
        </h3>
        <p className="text-gray-600 mt-2 text-sm">
          {activeMaterial?.description || ""} 
        </p>
      </div>

      <div className="flex flex-col md:flex-row w-screen min-h-screen">
        <div className="flex flex-col md:flex-row w-screen min-h-screen gap-8 ml-10 mr-10 mt-10">
            
          {/* --- LEFT SIDEBAR (Navigation List) --- */}
          <div className="w-full lg:w-64 flex flex-col gap-2">
            {/* Top Arrow */}
            <div className="bg-blue-700 text-white py-2 text-center rounded-t-md text-xs font-bold cursor-pointer hover:bg-blue-800">
              ^
            </div>

            <div className="flex flex-col gap-2">
              {materials.map((material) => {
                const isActive = activeMaterial?.id === material.id;
                return (
                  <button
                    key={material.id}
                    onClick={() => handleNavigate(material.id)}
                    className={`
                      w-full text-left px-4 py-3 rounded-md text-sm font-semibold transition-all duration-200 border
                      ${isActive 
                        ? "bg-blue-700 text-white border-blue-700 shadow-md" 
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    {material.title}
                  </button>
                );
              })}
            </div>

            {/* Bottom Arrow */}
            <div className="bg-blue-700 text-white py-2 text-center rounded-b-md text-xs font-bold cursor-pointer hover:bg-blue-800">
              v
            </div>
          </div>

          {/* --- RIGHT CONTENT AREA --- */}
          <div className="w-full lg:flex-1 flex flex-col gap-4">
            
            {/* Toolbar (Dropdown & Actions) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="relative w-full sm:w-64">
                <select 
                  className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full font-medium text-sm"
                  value={activeMaterial?.id || ''}
                  onChange={(e) => handleNavigate(e.target.value)}
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                  </svg>
                </div>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none bg-blue-700 text-white px-5 py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors text-sm shadow-sm">
                  Unduh
                </button>
                <button className="flex-1 sm:flex-none bg-blue-700 text-white px-5 py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors text-sm shadow-sm">
                  Buka Di Tab Baru
                </button>
              </div>
            </div>

            {/* Content Display */}
            <div className="min-h-[500px] bg-white rounded-lg shadow-sm p-6">
              {activeMaterial ? (
                <>
                  {activeMaterial.type === 'text' && <TextContent content={activeMaterial.content} />}
                  {activeMaterial.type === 'pdf' && <PdfContent content={activeMaterial.content} />}
                  {activeMaterial.type === 'video' && <VideoContent content={activeMaterial.content} />}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 p-8">
                  Pilih materi dari menu di samping.
                </div>
              )}
            </div>

            {/* Footer Navigation Buttons */}
            <div className="flex justify-between items-center pt-2">
              {/* SEBELUMNYA (Left) */}
              <div>
                {showPrevious ? (
                  <button 
                    onClick={handlePrev}
                    className="bg-white text-gray-700 px-6 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors border border-gray-300 shadow-sm"
                  >
                    Sebelumnya
                  </button>
                ) : (
                  <div className="w-32"></div>
                )}
              </div>

              {/* BERIKUTNYA (Right) */}
              <div>
                {showNext ? (
                  <button 
                    onClick={handleNext}
                    className="bg-blue-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-800 transition-colors shadow-md"
                  >
                    Berikutnya
                  </button>
                ) : (
                  <div className="w-32"></div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </LayoutForm>
  );
};

export default MateriPage;