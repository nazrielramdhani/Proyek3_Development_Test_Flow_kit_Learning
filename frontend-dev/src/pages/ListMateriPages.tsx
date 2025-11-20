import React, { useState, useEffect } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import Sidebar from "../components/custom/Sidebar";
import Pagination from "@/components/custom/Pagination";
import ModulesTable from "../components/custom/ModuleTable"; // sementara pakai ModuleTable sebagai placeholder
import ConfirmationModal from "../components/custom/ConfirmationModal";
import { useNavigate } from "react-router-dom";

export interface Materi {
  id: string;
  judul: string;
  jenis: string;
  jml_mahasiswa?: number;
}

const initialMateri: Materi[] = [];

const ListMateriPage = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem('session')
  let session = null
  if (sessionData != null){
      session = JSON.parse(sessionData);
      apiKey = session.token
  }
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [materi, setMateri] = useState<Materi[]>(initialMateri);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchDataMateri = async (page:number, keyword:string) => {
    setCurrentPage(page);
    setSearchTerm(keyword);
    try {
      const response = await fetch(`${apiUrl}/materi/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${itemsPerPage}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          navigate('/error');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      let temp: Materi[] = [];
      for (let i = 0; i < data.data.length; i++) {
        temp.push({
          id: data.data[i].id_materi || data.data[i].ms_id_materi,
          judul: data.data[i].judul_materi || data.data[i].ms_nama_materi || "",
          jenis: data.data[i].jenis_materi || "default",
          jml_mahasiswa: data.data[i].jml_mahasiswa || 0
        });
      }
      setMateri(temp);
      setTotalPages(data.max_page || 1);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const deleteDataMateri = async (id:string) => {
    try {
      let param = { id_materi: id }
      const response = await fetch(`${apiUrl}/materi/delete`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body:JSON.stringify(param)
      });

      if (!response.ok) {
        if (response.status === 403) navigate('/error');
        else if (response.status === 500) {
          const data = await response.json();
          setDeleteErrorMessage(`${data.message}`);
          setTimeout(() => setDeleteErrorMessage(null), 2000);
        } else {
          setDeleteErrorMessage(`HTTP error! status: ${response.status}`);
          setTimeout(() => setDeleteErrorMessage(null), 2000);
        }
      }else{
        setDeleteMessage("Materi berhasil dihapus.");
        setTimeout(() => setDeleteMessage(null), 2000);
        fetchDataMateri(1, searchTerm); 
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    fetchDataMateri(pageNumber, searchTerm)
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleDelete = (id: string) => {
    deleteDataMateri(id)
    closeModal();
  };

  const openModal = (m: Materi) => {
    setMateriToDelete(m);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setMateriToDelete(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    fetchDataMateri(1,e.target.value);
  };

  useEffect(() => {
    if (session != null){
      if (session.login_type != "teacher"){
          navigate("/dashboard-student")
      }else{
        fetchDataMateri(1,searchTerm)
      }
    }else{
      navigate("/login")
    }
    
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

  const addMateri = () => {
    navigate("/module") // ganti ke route add-materi bila ada
  };
  const editMateri = (m: Materi) => {
    navigate("/module?idModul="+m.id) // ganti sesuai route edit materi
  };

  return (
    <div className="flex flex-col lg:flex-row w-screen lg:w-screen">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 ${isSidebarOpen ? "ml-64" : "ml-20"} transition-all duration-300`}>
        <div className="w-full bg-white p-4 shadow mb-6">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
              Kelola Data Materi Pembelajaran
            </h1>
            <div className="flex flex-row justify-between items-center space-y-0 gap-4">
              <div className="relative w-full md:w-1/2">
                <input
                  type="text"
                  placeholder="Search or type"
                  className="w-full p-2 pl-10 border text-sm border-gray-300 rounded-md"
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button
                className="flex items-center justify-center text-sm bg-blue-800 text-white py-2 px-3 md:px-4 lg:px-5 rounded hover:bg-blue-700"
                onClick={addMateri}
              >
                <FaPlus className="mr-0 md:mr-2" />
                <span className="hidden md:inline">Tambah Materi</span>
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-screen p-4 md:p-6">
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            {deleteMessage && <div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">{deleteMessage}</div>}
            {deleteErrorMessage && <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{deleteErrorMessage}</div>}
            {materi.length === 0 ? (
              <div className="p-4 text-center text-red-500">
                Data tidak ditemukan
              </div>
            ) : (
              <ModulesTable modules={materi as any} onDelete={openModal} onEdit={editMateri} />
            )}
          </div>
          <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </div>

      {isModalOpen && materiToDelete && (
        <ConfirmationModal
          message="Apakah kamu benar-benar ingin menghapus materi ini? Akan dihapus permanen."
          onConfirm={() => handleDelete(materiToDelete.id)}
          onCancel={closeModal}
          isSidebarOpen={isSidebarOpen}
        />
      )}
    </div>
  );
};

export default ListMateriPage;