import React, { useEffect, useState } from "react";
import { FaPlus, FaSearch, FaTrash, FaEdit } from "react-icons/fa"; // react itu nama pustaka 
import Sidebar from "../components/custom/Sidebar"; // menghubungan ke sidebar
import Pagination from "@/components/custom/Pagination"; //previous & next
import ConfirmationModal from "../components/custom/ConfirmationModal"; // ini buat pop up verifikasi apakah anda ingin menghapus, publish/unpublish
import { useNavigate } from "react-router-dom"; // kalo mau pindah" halaman gausah refresh lagi, jdi langsung pindah

//tipe data
interface Materi {
  id: string;
  judul: string;
  deskripsi?: string;
  jenis: string;
  jml_mahasiswa?: number;
}

const ListMateriPage: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL; // alamat dasar API
  let apiKey: string = import.meta.env.VITE_API_KEY; // mengambil API key

  //jaminan bahwa semua permintaan jaringan dari komponen ListMateriPage (untuk mengambil atau menghapus materi) 
  const sessionData = localStorage.getItem("session"); 
  let session = null;
  if (sessionData) {
    session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  // --- STATE --- INISIALISASI
  const [rawData, setRawData] = useState<Materi[]>([]); 
  const [materi, setMateri] = useState<Materi[]>([]); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [searchTerm, setSearchTerm] = useState(""); // kata kunci pencarian fix
  const [searchInput, setSearchInput] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1); // halaman yang sedang di lihat
  const [totalPages, setTotalPages] = useState(1); 

  const [showModal, setShowModal] = useState(false); // statu untuk modal konfirmasi hapus 
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [infoMessage, setInfoMessage] = useState(""); // memberitahu  operasi ... telah berhasil diselesaikan
  const [errorMessage, setErrorMessage] = useState(""); // informasi kesalahan yang berasal dari API


  const itemsPerPage = 8; 
  
  const navigate = useNavigate(); // navigasi buat pindah" halaman

  // -----------------------------------------------------------
  //      HELPER : WARNA BADGE BERDASARKAN JENIS MATERI
  // -----------------------------------------------------------
  const typeColor = (type: string | undefined) => { // mewarnai huruf 
    const t = (type || "").toLowerCase();
    switch (t) {
      case "teks":
      case "text":
        return "bg-blue-100 text-blue-700";
      case "pdf":
      case "dokumen pdf":
      case "dokumen":
        return "bg-green-100 text-green-700";
      case "video":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  // --- LOGIC FILTER & PAGINATION ---
  const filterAndPaginateData = (data: Materi[], keyword: string, page: number) => {
    const lowerKeyword = keyword.toLowerCase();

    // 1. Filter
    const filteredData = data.filter(
      (m) =>
        (m.judul && m.judul.toLowerCase().includes(lowerKeyword)) ||
        (m.deskripsi && m.deskripsi.toLowerCase().includes(lowerKeyword))
    );

    // 2. Total Pages, menghitung total item setelah di saring
    const totalItems = filteredData.length;
    const totalPagesCount = Math.max(1, Math.ceil(totalItems / itemsPerPage)); // pake rumus matematika buat ngebulatin ke atas
    setTotalPages(totalPagesCount); // memperbarui state totalpage

    // 3. Paginate
    const startIndex = (page - 1) * itemsPerPage; // potongan data baru harus dimulai
    const endIndex = startIndex + itemsPerPage; 
    const paginatedData = filteredData.slice(startIndex, endIndex); // array baru yang hanya berisi 8 item yang akan ditampilkan di tabel pada halaman saat ini

    // 4. Update State
    setMateri(paginatedData); // mengatur data yang akan ditampilkan di tabel 
    setCurrentPage(page); // mengatur halaman saat ini
  };

  // --- FETCH DATA ---
  const fetchDataMateri = async (page: number, keyword: string) => { // fungsi untuk mengambil data, menerima halaman dan kata kunci untuk konsistensi
    try {
      const res = await fetch(`${apiUrl}/materi?page=${page}&limit=1000`, { // melakukan get/meminta data materi dengan limit 1000
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (res.status === 403) return navigate("/error"); // untuk mengarahkan ke halaman error

      const data = await res.json();
      const list: Materi[] = data.map((m: any) => ({ // Memproses data JSON yang diterima
        id: m.id_materi,
        judul: m.judul_materi,
        deskripsi: m.deskripsi_materi,
        jenis:
          m.jenis_materi && m.jenis_materi.trim() !== ""
            ? m.jenis_materi
            : m.file_materi && m.file_materi.trim() !== ""
            ? "Dokumen PDF"
            : m.text_materi && m.text_materi.trim() !== ""
            ? "Teks"
            : m.video_materi && m.video_materi.trim() !== ""
            ? "Video"
            : "Tidak Diketahui",
        jml_mahasiswa: m.jml_mahasiswa ?? 0,
      }));

      setRawData(list); // menyimpan data lengkap yang bersih ke state rawData
      filterAndPaginateData(list, keyword, page); // Memanggil fungsi pemfilteran 
    } catch (err) { //Blok penanganan error untuk kasus gagal koneksi/respons non-JSON
      console.error(err);
      setRawData([]);
      setMateri([]);
      setTotalPages(1);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteConfirmed = async () => { // Dipanggil setelah pengguna mengklik "Ya, Hapus" 
    if (!materiToDelete) return;

    try {
      const res = await fetch(`${apiUrl}/materi/${materiToDelete.id}`, { //Melakukan permintaan DELETE ke endpoint /materi/:id menggunakan token otorisasi.
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) { //Jika respons tidak berhasil, menampilkan pesan error dan menghilangkannya setelah 2.5 detik.
        const d = await res.json();
        setErrorMessage(d.detail || "Gagal menghapus materi.");
        setTimeout(() => setErrorMessage(""), 2500);
      } else { // Jika respons berhasil  
        setInfoMessage("Materi berhasil dihapus.");
        setTimeout(() => setInfoMessage(""), 2000);
        fetchDataMateri(1, searchTerm); // memuat ulang data dari halaman 1 agar data yang terhapus hilang dari tabel
      }
    } catch (err) {
      console.error(err);
    }

    setShowModal(false); // Menutup modal dan mereset state materi yang akan dihapus
    setMateriToDelete(null);
  };

  // --- HANDLERS ---
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchInput(keyword);
    setSearchTerm(keyword);
    filterAndPaginateData(rawData, keyword, 1); // untuk filter data secara real-time, dimulai dari halaman 1
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => { // Mencegah perilaku bawaan 
    e.preventDefault();
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev); // Membalikkan status buka/tutup Sidebar.

  const openDeleteModal = (m: Materi) => { // Mengatur state materi yang akan dihapus dan menampilkan modal konfirmasi
    setMateriToDelete(m);
    setShowModal(true);
  };

  const navigateAdd = () => navigate("/add-materi"); // Mengarahkan pengguna ke halaman penambahan materi
  const navigateEdit = (m: Materi) => navigate(`/add-materi?id=${m.id}`); 

  const handlePageChange = (page: number) => { // Dipanggil dari komponen Pagination saat halaman berubah
    filterAndPaginateData(rawData, searchTerm, page);
  };


  useEffect(() => { // Efek samping 
    if (!session) return navigate("/login"); //Jika data session tidak ada, arahkan ke halaman /login.
    if (session.login_type !== "teacher") return navigate("/dashboard-student"); // Jika login bukan sebagai "teacher" (guru), arahkan ke dashboard siswa

    fetchDataMateri(1, searchTerm); 
  }, []);

  // JSX Struktur tampilan
  return (
    <div className="flex flex-col lg:flex-row w-screen"> {/* Container utama dengan tata letak flex (kolom pada ukuran kecil, baris pada ukuran besar)*/}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} /> {/*Menampilkan komponen Sidebar, mengontrol tampilan dan fungsionalitas buka/tutup.*/}

      <div className={`flex-1 ${isSidebarOpen ? "ml-64" : "ml-20"} transition-all`}> {/* mengatur margin kiri*/}
        <div className="w-full bg-white p-4 shadow mb-6">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
              Materi Pembelajaran
            </h1>

            {/* SEARCH */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <form className="relative w-full md:w-1/2" onSubmit={handleSearchSubmit}> {/*untuk mencegar refresh*/}
                <input
                  type="text"
                  placeholder="Search or type"
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
          </div>
        </div>

        {/* TABLE */}
        <div className="min-h-screen p-4 md:p-6">
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            {infoMessage && (
              <div className="p-4 mb-4 text-green-600 bg-green-100 rounded-md">
                {infoMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-4 mb-4 text-red-600 bg-red-100 rounded-md">
                {errorMessage}
              </div>
            )}

            {/* TABEL */}
            {materi.length === 0 && searchTerm ? (
              <div className="p-4 text-center text-red-500">
                Data tidak ditemukan untuk kata kunci "{searchTerm}"
              </div>
            ) : materi.length === 0 && rawData.length === 0 ? (
              <div className="p-4 text-center text-red-500">Data tidak ditemukan</div>
            ) : (
              <table className="min-w-full bg-white border rounded-lg shadow-md text-xs lg:text-sm">
                <thead>
                  <tr className="bg-blue-800 text-white">
                    <th className="py-3 px-2 md:px-6 border w-[30%] text-left">Judul Materi</th>
                    <th className="py-3 px-2 md:px-6 border w-[50%] text-left">Deskripsi</th>
                    <th className="py-3 px-2 md:px-6 border w-[15%] text-left">Jenis Materi</th>
                    <th className="py-3 px-2 md:px-6 border w-[5%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {materi.map((item, index) => (
                    <tr
                      key={item.id}
                      // --- PERUBAHAN WARNA DI SINI ---
                      // Menggunakan bg-gray-50 (abu muda) untuk selang-seling
                      className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="py-3 px-2 md:px-6 border font-normal text-left">
                        {item.judul}
                      </td>
                      
                      <td className="py-3 px-2 md:px-6 border text-left">
                        {item.deskripsi || "-"}
                      </td>
                      
                      <td className="py-3 px-2 md:px-6 border text-center align-middle">
                        <span
                          className={`inline-block min-w-[80px] px-3 py-1 rounded-md text-xs font-semibold text-center ${typeColor(
                            item.jenis
                          )}`}
                        >
                          {item.jenis}
                        </span>
                      </td>
                      
                      <td className="py-3 px-2 md:px-6 border text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigateEdit(item)}
                            className="bg-transparent !text-blue-600 border-none p-0 focus:outline-none focus:ring-0 hover:!text-blue-600 active:!text-blue-600"
                            title="Edit"
                          >
                            <FaEdit size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="bg-transparent !text-red-600 border-none p-0 focus:outline-none focus:ring-0 hover:!text-red-600 active:!text-red-600"
                            title="Delete"
                          >
                            <FaTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>

      {showModal && materiToDelete && (
        <ConfirmationModal
          message={`Apakah Anda yakin ingin menghapus materi "${materiToDelete.judul}"?`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowModal(false)}
          isSidebarOpen={isSidebarOpen}
        />
      )}
    </div>
  );
};

export default ListMateriPage;