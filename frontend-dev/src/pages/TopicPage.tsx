import React, { useState, useEffect } from "react";
import Sidebar from "../components/custom/SidebarStudent";
import { useNavigate, Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa"; // Import search icon

// Define a type for our material data
type Material = {
  id: string;
  nama: string;
  deskripsi: string;
  type: string;
  first_materi_id?: string | null;
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
        // Fetch data from the endpoint in main.py
        fetch(`${apiUrl}/api/topik-pembelajaran`, {
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
  const filteredMaterials = materials.filter((material) =>
    material.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // Use light gray background for the content area
    <div className="flex h-screen">
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
            <h1 className="text-xl font-bold text-blue-800 mb-6 mt-4">
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

            <div className="flex text-sm font-semibold text-gray-500 px-4 mb-2">
              <div className="w-4/12">Nama Topik</div>
              <div className="w-6/12">Deskripsi</div>
              <div className="w-2/12 text-center">Action</div>
            </div>

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
                        /* Case 1: Topic HAS materials -> Go to first material */
                        <Link to={`/topic/${material.id}/materi/${material.first_materi_id}`}>
                          <button className="bg-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                            Lihat Materi
                          </button>
                        </Link>
                      ) : (
                        /* Case 2: Topic is EMPTY -> Disabled Button */
                        <button 
                          disabled 
                          className="bg-gray-300 text-gray-500 px-6 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"
                        >
                          Belum Ada
                        </button>
                      )
                    ) : (
                      /* Case 3: Not a topic (e.g. single file) */
                      <button className="bg-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicPage;