import React, { useState, useEffect } from "react";
import Sidebar from "../components/custom/SidebarStudent";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa"; // Import search icon

// Define a type for our material data
type Material = {
  id: string;
  nama: string;
  deskripsi: string;
  type?: string;
  first_materi_id?: string;
};

// This is the new page component
const TopicPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]); // To hold the list from the API
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // --- Session Check & API Config ---
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem("session");
  let session = null;
  if (sessionData != null) {
    session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  // --- Session Check & Data Fetch ---
  useEffect(() => {
    if (session != null) {
      if (session.login_type !== "student") {
        navigate("/dashboard-teacher");
      } else {
        // --- THIS IS THE NEW PART ---
        fetch(`${apiUrl}/topik_pembelajaran`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
          .then((res) => res.json())
          .then((data: { topik: Material[] }) => {
            // Note: the key is "topik" as defined in your main.py
            setMaterials(data.topik); 
          })
          .catch((err) =>
            console.error("Failed to fetch topics:", err)
          );
        // --- END NEW PART ---
      }
    } else {
      navigate("/login");
    }
  }, [navigate, session, apiUrl, apiKey]);
  // --- End Session Check & Data Fetch ---


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Function to track student access to a topic
  const handleTrackAccess = async (topicId: string, firstMateriId: string) => {
    try {
      console.log('[DEBUG] Tracking access for topic:', topicId);
      console.log('[DEBUG] API URL:', `${apiUrl}/topik/${topicId}/track-access`);
      console.log('[DEBUG] Token:', apiKey ? 'Token exists' : 'No token');
      
      // Call API to track access
      const response = await fetch(`${apiUrl}/topik/${topicId}/track-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[DEBUG] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Tracking result:', data);
      } else {
        const errorText = await response.text();
        console.error('[DEBUG] Failed to track access:', response.status, errorText);
      }
      
      // Navigate to materi page regardless of tracking result
      navigate(`/topic/${topicId}/materi/${firstMateriId}`);
    } catch (error) {
      console.error('[DEBUG] Error tracking access:', error);
      // Still navigate even if tracking fails
      navigate(`/topic/${topicId}/materi/${firstMateriId}`);
    }
  };

  // --- Sidebar responsiveness ---
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsSidebarOpen(event.matches);
    };
    setIsSidebarOpen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaQueryChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);
  // --- End Sidebar responsiveness ---

// Filter materials based on search term
  // FIX: We use (material.nama || "") to turn NULL into "" so it doesn't crash
  const filteredMaterials = materials?.filter((material) => {
    const nama = material.nama || "";
    const deskripsi = material.deskripsi || "";
    const term = searchTerm.toLowerCase();

    return nama.toLowerCase().includes(term) || deskripsi.toLowerCase().includes(term);
  });

  return (
    // Use light gray background for the content area
    // Use light gray background for the content area
    <div className="flex flex-col lg:flex-row w-screen lg:w-screen min-h-screen bg-slate-100">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* This is the main content area for your new page */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        } flex flex-col`}
      >
        {/* --- Header Bar --- */}
        <div className="w-full bg-white p-4 shadow">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="text-xl lg:text-2xl font-bold text-blue-800 mb-6 mt-4">
              Topik Pembelajaran
            </h1>
            <div className="relative w-full md:w-1/2">
              <input
                type="text"
                placeholder="Search for Materi Pembelajaran"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 text-sm pl-10 border border-gray-300 rounded-md"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>


        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-full mx-auto">

{/* --- MODIFICATION START: Simple If/Else --- */}
            {filteredMaterials?.length > 0 ? (
              <>
                {/* 1. Header Row (Only shows if data exists) */}
                <div className="flex text-xl px-4 font-bold text-blue-800 mb-4">
                  <div className="w-4/12">Nama Topik</div>
                  <div className="w-6/12">Deskripsi</div>
                  <div className="w-2/12 text-center">Action</div>
                </div>

                {/* 2. List Items */}
                <div className="space-y-4">
                  {filteredMaterials.map((material) => (
                    <div 
                      key={material.id} 
                      className="flex items-center bg-white p-4 rounded-lg shadow"
                    >
                      <div className="w-4/12 font-bold text-gray-800">{material.nama}</div>
                      <div className="w-6/12 text-sm text-gray-600">{material.deskripsi}</div>
                      <div className="w-2/12 flex justify-center">
                        {material.type === 'topic' ? (
                          material.first_materi_id ? (
                            <button 
                              onClick={() => handleTrackAccess(material.id, material.first_materi_id || '')}
                              className="font-bold rounded lg:text-base md:text-sm text-xs lg:py-2 lg:px-4 py-1 px-2 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Lihat Materi
                            </button>
                          ) : (
                            <button 
                              disabled 
                              className="font-bold rounded lg:text-base md:text-sm text-xs lg:py-2 lg:px-4 py-1 px-2 bg-gray-400 text-white"
                            >
                              Belum Ada
                            </button>
                          )
                        ) : (
                          <button className="font-bold rounded lg:text-base md:text-sm text-xs lg:py-2 lg:px-4 py-1 px-2 bg-blue-600 text-white">
                            Preview
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* --- ELSE: Display Nothing --- */
              null
            )}
            {/* --- MODIFICATION END --- */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicPage;