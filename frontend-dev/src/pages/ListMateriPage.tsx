import React, { useEffect, useState } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import Sidebar from "../components/custom/Sidebar";
import Pagination from "@/components/custom/Pagination";
import LearningMateriTable from "../components/custom/LearningMateriTable";
import ConfirmationModal from "../components/custom/ConfirmationModal";
import { useNavigate } from "react-router-dom";

interface Materi {
  id: string;
  judul: string;
  deskripsi?: string;
  jenis: string;
  jml_mahasiswa?: number;
}

const ListMateriPage: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey: string = import.meta.env.VITE_API_KEY;

  const sessionData = localStorage.getItem("session");
  let session = null;
  if (sessionData != null) {
    session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  const [materi, setMateri] = useState<Materi[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const itemsPerPage = 10;
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handlePageChange = (page: number) => {
    fetchMateri(page, searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    fetchMateri(1, e.target.value);
  };

  const handleAdd = () => navigate("/add-materi");
  const handleEdit = (m: Materi) => navigate(`/add-materi?id=${m.id}`);

  const openModal = (m: Materi) => {
    setMateriToDelete(m);
    setShowConfirmation(true);
  };

  const closeModal = () => {
    setShowConfirmation(false);
    setMateriToDelete(null);
  };

  const fetchMateri = async (page: number, keyword: string) => {
    setCurrentPage(page);
    let url = `${apiUrl}/materi?keyword=${keyword}&page=${page}&limit=${itemsPerPage}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.status === 403) return navigate("/error");
      const data = await response.json();

      let temp: Materi[] = [];
      for (let i = 0; i < data.data.length; i++) {
        const m = data.data[i];
        temp.push({
          id: m.id_materi,
          judul: m.judul_materi,
          deskripsi: m.deskripsi_materi,
          jenis: m.file_materi
            ? "file"
            : m.text_materi
            ? "text"
            : m.video_materi
            ? "video"
            : "unknown",
          jml_mahasiswa: m.jml_mahasiswa ?? 0,
        });
      }

      setMateri(temp);
      setTotalPages(data.max_page);
    } catch (err) {
      console.error("ERROR FETCH:", err);
    }
  };

  const deleteMateri = async () => {
    if (!materiToDelete) return;

    try {
      const response = await fetch(`${apiUrl}/materi/${materiToDelete.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const res = await response.json();
        setErrorMessage(res.detail || "Gagal menghapus materi.");
        setTimeout(() => setErrorMessage(""), 3000);
      } else {
        setInfoMessage("Materi berhasil dihapus.");
        setTimeout(() => setInfoMessage(""), 3000);
        fetchMateri(currentPage, searchQuery);
      }
    } catch (err) {
      console.error("ERROR DELETE:", err);
    }

    closeModal();
  };

  useEffect(() => {
    if (!session) return navigate("/login");
    if (session.login_type !== "teacher") return navigate("/dashboard-student");

    fetchMateri(1, searchQuery);

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    setIsSidebarOpen(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setIsSidebarOpen(e.matches);

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row w-screen lg:w-screen">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 ${isSidebarOpen ? "ml-64" : "ml-20"} transition-all duration-300 overflow-x-auto`}>
        <div className="w-full bg-white p-4 shadow mb-6">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
              Materi Pembelajaran
            </h1>
            <div className="flex flex-row justify-between items-center space-y-0 gap-4">
              <div className="relative w-full md:w-1/2">
                <input
                  type="text"
                  placeholder="Search or type"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full p-2 pl-10 border text-sm border-gray-300 rounded-md"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              <button
                className="flex items-center justify-center text-sm bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700"
                onClick={handleAdd}
              >
                <FaPlus className="mr-2" />
                Tambah Materi
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-screen scroll-auto p-4 md:p-6">
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            {infoMessage && <div className="p-4 mb-4 text-green-600 bg-green-100 rounded-md">{infoMessage}</div>}
            {errorMessage && <div className="p-4 mb-4 text-red-600 bg-red-100 rounded-md">{errorMessage}</div>}

            {materi.length === 0 ? (
              <div className="p-4 text-center text-red-500">Data tidak ditemukan</div>
            ) : (
              <LearningMateriTable
                materi={materi}
                onEdit={handleEdit}
                onDelete={(m) => openModal(m)}
              />
            )}
          </div>

          <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </div>

      {showConfirmation && (
        <ConfirmationModal
          message={`Apakah Anda yakin ingin menghapus materi "${materiToDelete?.judul}" ?`}
          onConfirm={deleteMateri}
          onCancel={closeModal}
          isSidebarOpen={isSidebarOpen}
        />
      )}
    </div>
  );
};

export default ListMateriPage;

