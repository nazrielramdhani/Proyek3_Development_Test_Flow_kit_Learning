import React, { useEffect, useState } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
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
  if (sessionData) {
    session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  // Perubahan 1: Memisahkan data asli (raw data) dan data yang ditampilkan (filtered data)
  const [rawData, setRawData] = useState<Materi[]>([]); 
  const [materi, setMateri] = useState<Materi[]>([]); // Data yang ditampilkan setelah di-filter
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // Keyword yang sedang dicari
  const [searchInput, setSearchInput] = useState(""); // Nilai input field
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const itemsPerPage = 10;
  const navigate = useNavigate();

  // Fungsi untuk melakukan filter data berdasarkan keyword
  const filterAndPaginateData = (data: Materi[], keyword: string, page: number) => {
    const lowerKeyword = keyword.toLowerCase();

    // 1. Filter data berdasarkan judul atau deskripsi (Logika diambil dari kode Topik Pembelajaran yang berhasil)
    const filteredData = data.filter(m =>
      (m.judul && m.judul.toLowerCase().includes(lowerKeyword)) ||
      (m.deskripsi && m.deskripsi.toLowerCase().includes(lowerKeyword))
    );

    // 2. Tentukan total halaman berdasarkan data yang sudah di-filter
    const totalItems = filteredData.length;
    const totalPagesCount = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    setTotalPages(totalPagesCount);

    // 3. Tentukan data untuk halaman saat ini
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // 4. Update state materi (data yang ditampilkan)
    setMateri(paginatedData);
    setCurrentPage(page);
  };
  
  // FETCH MATERI UTAMA (ambil semua data tanpa keyword di URL)
  const fetchDataMateri = async (page: number, keyword: string) => {
    try {
      // Perubahan 2: Hapus keyword dari URL API, agar selalu mengambil semua data
      // Jika Anda tidak ingin mengambil semua data (ribuan record), API harus diperbaiki.
      // Untuk saat ini, kita ikuti logika Topik Pembelajaran.
      const res = await fetch(
        `${apiUrl}/materi?page=${page}&limit=1000`, // Batasi limit besar jika memungkinkan, atau hapus limit.
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (res.status === 403) return navigate("/error");

      const data = await res.json();
      const list: Materi[] = data.map((m: any) => ({
        id: m.id_materi,
        judul: m.judul_materi,
        deskripsi: m.deskripsi_materi,
        jenis: m.jenis_materi && m.jenis_materi.trim() !== ""
          ? m.jenis_materi
          : (m.file_materi && m.file_materi.trim() !== "" ? "Dokumen PDF"
              : (m.text_materi && m.text_materi.trim() !== "" ? "Teks"
                  : (m.video_materi && m.video_materi.trim() !== "" ? "Video"
                      : "Tidak Diketahui"))),
        jml_mahasiswa: m.jml_mahasiswa ?? 0,
      }));

      // Perubahan 3: Simpan data mentah, lalu filter dan paginasi
      setRawData(list);
      filterAndPaginateData(list, keyword, page);
      
    } catch (err) {
      console.error(err);
      // Jika fetch gagal, tampilkan data kosong
      setRawData([]);
      setMateri([]);
      setTotalPages(1);
    }
  };

  // DELETE
  const handleDeleteConfirmed = async () => {
    if (!materiToDelete) return;

    try {
      const res = await fetch(`${apiUrl}/materi/${materiToDelete.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        const d = await res.json();
        setErrorMessage(d.detail || "Gagal menghapus materi.");
        setTimeout(() => setErrorMessage(""), 2500);
      } else {
        setInfoMessage("Materi berhasil dihapus.");
        setTimeout(() => setInfoMessage(""), 2000);
        // Perubahan 4: Setelah delete, fetch ulang data lengkap
        fetchDataMateri(currentPage, searchTerm); 
      }
    } catch (err) {
      console.error(err);
    }

    setShowModal(false);
    setMateriToDelete(null);
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchInput(keyword);
    // Perubahan 5: Langsung filter saat input berubah (real-time search)
    // dan kembali ke halaman 1
    setSearchTerm(keyword);
    filterAndPaginateData(rawData, keyword, 1); 
  };
  
  // Perubahan 6: Hapus handleSearchSubmit karena kita sudah menggunakan real-time search
  // Kita buat fungsi ini agar form tidak submit ke server jika enter ditekan
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const resetSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    filterAndPaginateData(rawData, "", 1);
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const openDeleteModal = (m: Materi) => {
    setMateriToDelete(m);
    setShowModal(true);
  };

  const navigateAdd = () => navigate("/add-materi");
  const navigateEdit = (m: Materi) => navigate(`/add-materi?id=${m.id}`);

  // Perubahan 7: Saat ganti halaman, gunakan data mentah yang sudah ada, lalu filter
  const handlePageChange = (page: number) => {
    filterAndPaginateData(rawData, searchTerm, page);
  }

  // Perubahan 8: Perbaiki logika useEffect
  useEffect(() => {
    if (!session) return navigate("/login");
    if (session.login_type !== "teacher") return navigate("/dashboard-student");
    
    // Panggil fetchDataMateri hanya sekali saat mount untuk mendapatkan rawData
    fetchDataMateri(1, searchTerm); 
  }, []); // Dependency array kosong, hanya berjalan saat mount

  return (
    <div className="flex flex-col lg:flex-row w-screen">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className={`flex-1 ${isSidebarOpen ? "ml-64" : "ml-20"} transition-all`}>
        <div className="w-full bg-white p-4 shadow mb-6"> {/* Menyesuaikan struktur div */}
          <div className="max-w-screen-xl mx-auto">
            <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
              Materi Pembelajaran
            </h1>

            {/* SEARCH */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <form className="relative w-full md:w-1/2" onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  placeholder="Cari Judul atau Deskripsi Materi..."
                  className="w-full p-2 pl-10 border text-sm border-gray-300 rounded-md"
                  value={searchInput}
                  onChange={handleSearchInput}
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </form>

              <button
                className="flex items-center justify-center text-sm bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700 w-full md:w-auto"
                onClick={navigateAdd}
              >
                <FaPlus className="mr-2" />
                Tambah Materi
              </button>
            </div>
            {/* AKHIR SEARCH */}

          </div>
        </div>

        <div className="min-h-screen p-4 md:p-6">
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            {infoMessage && <div className="p-4 mb-4 text-green-600 bg-green-100 rounded-md">{infoMessage}</div>}
            {errorMessage && <div className="p-4 mb-4 text-red-600 bg-red-100 rounded-md">{errorMessage}</div>}

            {/* Menampilkan pesan jika tidak ada data setelah filtering */}
            {materi.length === 0 && searchTerm ? (
              <div className="p-4 text-center text-red-500">Data tidak ditemukan untuk kata kunci "{searchTerm}"</div>
            ) : materi.length === 0 && rawData.length === 0 ? (
                <div className="p-4 text-center text-red-500">Data tidak ditemukan</div>
            ) : (
              <LearningMateriTable materi={materi} onEdit={navigateEdit} onDelete={openDeleteModal} />
            )}
          </div>

          <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </div>

      {showModal && materiToDelete && (
        <ConfirmationModal
          message={`Apakah yakin ingin menghapus materi "${materiToDelete.judul}" ?`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowModal(false)}
          isSidebarOpen={isSidebarOpen}
        />
      )}
    </div>
  );
};

export default ListMateriPage;

// import React, { useEffect, useState } from "react";
// import { FaPlus, FaSearch } from "react-icons/fa";
// import Sidebar from "../components/custom/Sidebar";
// import Pagination from "@/components/custom/Pagination";
// import LearningMateriTable from "../components/custom/LearningMateriTable";
// import ConfirmationModal from "../components/custom/ConfirmationModal";
// import { useNavigate } from "react-router-dom";

// interface Materi {
//   id: string;
//   judul: string;
//   deskripsi?: string;
//   jenis: string;
//   jml_mahasiswa?: number;
// }

// const ListMateriPage: React.FC = () => {
//   const apiUrl = import.meta.env.VITE_API_URL;
//   let apiKey: string = import.meta.env.VITE_API_KEY;

//   const sessionData = localStorage.getItem("session");
//   let session = null;
//   if (sessionData) {
//     session = JSON.parse(sessionData);
//     apiKey = session.token;
//   }

//   const [materi, setMateri] = useState<Materi[]>([]);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchInput, setSearchInput] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);

//   const [showModal, setShowModal] = useState(false);
//   const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
//   const [infoMessage, setInfoMessage] = useState("");
//   const [errorMessage, setErrorMessage] = useState("");

//   const itemsPerPage = 10;
//   const navigate = useNavigate();

//   // FETCH MATERI
//   const fetchDataMateri = async (page: number, keyword: string) => {
//     setCurrentPage(page);

//     try {
//       const res = await fetch(
//         `${apiUrl}/materi?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${itemsPerPage}`,
//         {
//           method: "GET",
//           headers: {
//             Accept: "application/json",
//             Authorization: `Bearer ${apiKey}`,
//           },
//         }
//       );

//       if (res.status === 403) return navigate("/error");

//       const data = await res.json();
//       const list: Materi[] = data.map((m: any) => ({
//         id: m.id_materi,
//         judul: m.judul_materi,
//         deskripsi: m.deskripsi_materi,
//         jenis: m.jenis_materi && m.jenis_materi.trim() !== ""
//               ? m.jenis_materi
//               : (m.file_materi && m.file_materi.trim() !== "" ? "Dokumen PDF"
//                   : (m.text_materi && m.text_materi.trim() !== "" ? "Teks"
//                     : (m.video_materi && m.video_materi.trim() !== "" ? "Video"
//                         : "Tidak Diketahui"))),
//         jml_mahasiswa: m.jml_mahasiswa ?? 0,
//       }));

//       setMateri(list);
//       setTotalPages(Math.max(1, data.length ? Math.ceil(data.length / itemsPerPage) : 1));
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // DELETE
//   const handleDeleteConfirmed = async () => {
//     if (!materiToDelete) return;

//     try {
//       const res = await fetch(`${apiUrl}/materi/${materiToDelete.id}`, {
//         method: "DELETE",
//         headers: {
//           Accept: "application/json",
//           Authorization: `Bearer ${apiKey}`,
//         },
//       });

//       if (!res.ok) {
//         const d = await res.json();
//         setErrorMessage(d.detail || "Gagal menghapus materi.");
//         setTimeout(() => setErrorMessage(""), 2500);
//       } else {
//         setInfoMessage("Materi berhasil dihapus.");
//         setTimeout(() => setInfoMessage(""), 2000);
//         fetchDataMateri(1, searchTerm);
//       }
//     } catch (err) {
//       console.error(err);
//     }

//     setShowModal(false);
//     setMateriToDelete(null);
//   };

//   const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchInput(e.target.value);
//   };

//   const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setSearchTerm(searchInput);
//     fetchDataMateri(1, searchInput);
//   };

//   const resetSearch = () => {
//     setSearchInput("");
//     setSearchTerm("");
//     fetchDataMateri(1, "");
//   };

//   const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

//   const openDeleteModal = (m: Materi) => {
//     setMateriToDelete(m);
//     setShowModal(true);
//   };

//   const navigateAdd = () => navigate("/add-materi");
//   const navigateEdit = (m: Materi) => navigate(`/add-materi?id=${m.id}`);

//   const handlePageChange = (page: number) => fetchDataMateri(page, searchTerm);

//   useEffect(() => {
//     if (!session) return navigate("/login");
//     if (session.login_type !== "teacher") return navigate("/dashboard-student");
//     fetchDataMateri(1, searchTerm);
//   }, []);

//   return (
//     <div className="flex flex-col lg:flex-row w-screen">
//       <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

//       <div className={`flex-1 ${isSidebarOpen ? "ml-64" : "ml-20"} transition-all`}>
//         <div className="bg-white p-4 shadow mb-6">
//           <div className="max-w-screen-xl mx-auto">
//             <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
//               Materi Pembelajaran
//             </h1>

//             {/* SEARCH */}
//             <div className="flex flex-row justify-between items-center gap-4">
//               <form className="relative w-full md:w-1/2" onSubmit={handleSearchSubmit}>
//                 <input
//                   type="text"
//                   placeholder="Search or type"
//                   className="w-full p-2 pl-10 border text-sm border-gray-300 rounded-md"
//                   value={searchInput}
//                   onChange={handleSearchInput}
//                 />
//                 <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//               </form>

//               <button
//                 className="flex items-center justify-center text-sm bg-blue-800 text-white py-2 px-4 rounded hover:bg-blue-700"
//                 onClick={navigateAdd}
//               >
//                 <FaPlus className="mr-2" />
//                 Tambah Materi
//               </button>
//             </div>
//           </div>
//         </div>

//         <div className="min-h-screen p-4 md:p-6">
//           <div className="bg-white shadow-md rounded-lg overflow-x-auto">
//             {infoMessage && <div className="p-4 mb-4 text-green-600 bg-green-100 rounded-md">{infoMessage}</div>}
//             {errorMessage && <div className="p-4 mb-4 text-red-600 bg-red-100 rounded-md">{errorMessage}</div>}

//             {materi.length === 0 ? (
//               <div className="p-4 text-center text-red-500">Data tidak ditemukan</div>
//             ) : (
//               <LearningMateriTable materi={materi} onEdit={navigateEdit} onDelete={openDeleteModal} />
//             )}
//           </div>

//           <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
//             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
//           </div>
//         </div>
//       </div>

//       {showModal && materiToDelete && (
//         <ConfirmationModal
//           message={`Apakah yakin ingin menghapus materi "${materiToDelete.judul}" ?`}
//           onConfirm={handleDeleteConfirmed}
//           onCancel={() => setShowModal(false)}
//           isSidebarOpen={isSidebarOpen}
//         />
//       )}
//     </div>
//   );
// };

// export default ListMateriPage;
