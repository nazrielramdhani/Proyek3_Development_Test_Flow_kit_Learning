// ---------------------------------------------------
// SelectMateriDialog.tsx
// Dialog untuk memilih materi (search + select all)
// ---------------------------------------------------

// --- IMPORTS ---
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/custom/Pagination";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

// --- TIPE DATA MATERI ---
interface Materi {
  id: string;
  name: string;
  description: string;
  type: string;
}

// --- PROPS COMPONENT ---
interface SelectMateriDialogProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  onAddMateri: (materis: Materi[]) => void;
  selectedMateri: Materi[];
  topicName: string;
}

// -----------------------------------------------------------
//           COMPONENT UTAMA: SelectMateriDialog
// -----------------------------------------------------------    
const SelectMateriDialog: React.FC<SelectMateriDialogProps> = ({
  isDialogOpen,
  setIsDialogOpen,
  onAddMateri,
  selectedMateri,
  topicName,
}) => {

  // Untuk redirect jika token invalid
  const navigate = useNavigate();

  // URL API dari .env
  const apiUrl = import.meta.env.VITE_API_URL;

  // Ambil API key dari session login
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem("session");
  if (sessionData) {
    const session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  // --- STATE ---
  const [materis, setMateris] = useState<Materi[]>([]);            // Semua materi hasil fetch
  const [filteredMateri, setFilteredMateri] = useState<Materi[]>([]); // Materi setelah search
  const [search, setSearch] = useState("");                       // Input kata pencarian
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tempSelectedMateri, setTempSelectedMateri] = useState<Materi[]>(selectedMateri ?? []);

  const itemsPerPage = 8; // jumlah data per halaman

  // Jika dialog dibuka ulang → reset pilihan sementara
  useEffect(() => {
    setTempSelectedMateri(selectedMateri ?? []);
  }, [isDialogOpen]);

  // Fetch materi ketika halaman berubah
  useEffect(() => {
    fetchMateri(currentPage);
  }, [currentPage]);

  // -----------------------------------------------------------------------------------
  //                  FUNGSI MAPPING DATA API → STRUKTUR MATERI
  // Kalo API nya sering beda struktur → di bawah ini buat menyesuaikan secara fleksibel
  // -----------------------------------------------------------------------------------
  const mapRowsToMateri = (rows: any[]): Materi[] => {
    return (rows || []).map((m: any) => ({
      id: m.id_materi ?? m.ms_id_materi ?? m.id ?? String(Math.random()),
      name: m.judul_materi ?? m.ms_nama_modul ?? m.name ?? "-",
      description: m.deskripsi_materi ?? m.ms_deskripsi_modul ?? m.description ?? "-",
      type: m.jenis_materi ?? m.type ?? "default",
    }));
  };

  // ---------------------------------------------------------
  //             FETCH DATA MATERI DARI BACKEND
  // ---------------------------------------------------------
  const fetchMateri = async (page: number) => {
    try {
      const response = await fetch(`${apiUrl}/materi?page=${page}&limit=${itemsPerPage}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) navigate("/error");
        return;
      }

      const data = await response.json();

      let rows: any[] = [];
      let maxPage = 1;

      // API kadang return array, kadang object
      if (Array.isArray(data)) rows = data;
      else if (Array.isArray(data.data)) {
        rows = data.data;
        maxPage = data.max_page ?? 1;
      }

      const mapped = mapRowsToMateri(rows);

      setMateris(mapped);
      setFilteredMateri(mapped);
      setTotalPages(maxPage);
    } catch (error) {
      console.error("Error fetching materi:", error);
    }
  };

  // Cek apakah materi sudah dipilih
  const isSelected = (id: string) =>
    Array.isArray(tempSelectedMateri) && tempSelectedMateri.some((m) => m.id === id);

  // Toggle centang per item
  const toggleSelection = (id: string) => {
    const obj = materis.find((x) => x.id === id);
    if (!obj) return;

    if (isSelected(id))
      setTempSelectedMateri((prev) => prev.filter((x) => x.id !== id));
    else setTempSelectedMateri((prev) => [...prev, obj]);
  };

  // ---------------------------------------------------------
  //             FITUR SEARCH (nama + deskripsi)
  // ---------------------------------------------------------
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);

    const filtered = materis.filter((m) =>
      m.name.toLowerCase().includes(val.toLowerCase()) ||
      m.description.toLowerCase().includes(val.toLowerCase())
    );

    setFilteredMateri(filtered);
  };

  // ---------------------------------------------------------
  //        FITUR SELECT ALL (berdasarkan hasil search)
  // ---------------------------------------------------------
  const handleSelectAll = () => {
    if (filteredMateri.length === 0) return;

    const allSelected = filteredMateri.every((m) => isSelected(m.id));

    if (allSelected) {
      setTempSelectedMateri((prev) =>
        prev.filter((p) => !filteredMateri.some((fm) => fm.id === p.id))
      );
    } else {
      const newSelected = [...tempSelectedMateri];
      filteredMateri.forEach((m) => {
        if (!isSelected(m.id)) newSelected.push(m);
      });
      setTempSelectedMateri(newSelected);
    }
  };

  // ----------------------------------------------------------
  //            WARNA BADGE BERDASARKAN TIPE MATERI
  // ----------------------------------------------------------
  const typeColor = (type: string) => {
    switch (type?.toLowerCase()) {
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

  // Batal → kembali ke data awal
  const handleCancel = () => {
    setTempSelectedMateri(selectedMateri);
    setIsDialogOpen(false);
  };

  // Tambahkan materi ke parent (pastikan tidak duplikat)
  const handleAdd = () => {
    const unique = Array.from(new Map(tempSelectedMateri.map((x) => [x.id, x])).values());
    onAddMateri(unique);
    setIsDialogOpen(false);
  };

  // ----------------------------------------------------------
  //                        RENDER UTAMA
  // ----------------------------------------------------------
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-5xl mx-auto max-h-screen overflow-y-auto">

        {/* HEADER */}
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-6">
            Tambahkan Materi Pada Topik
          </DialogTitle>
        </DialogHeader>

        {/* SEARCH + SELECT ALL */}
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">

          {/* BUTTON PILIH SEMUA */}
          <Button
            onClick={handleSelectAll}
            className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
          >
            Pilih Semua
          </Button>

          {/* SEARCH BAR */}
          <div className="relative w-full md:w-72">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search or type"
              className="w-full border border-blue-500 rounded-lg py-2 pl-10 pr-3 focus:outline-none"
            />
          </div>
        </div>

        {/* TABLE LIST MATERI */}
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full bg-white border rounded-lg shadow-md">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="py-2 px-3 border">No</th>
                <th className="py-2 px-3 border">Select</th>
                <th className="py-2 px-3 border">Nama Materi</th>
                <th className="py-2 px-3 border">Deskripsi</th>
                <th className="py-2 px-3 border">Jenis Materi</th>
              </tr>
            </thead>

            <tbody>
              {filteredMateri.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                filteredMateri.map((mat, i) => (
                  <tr
                    key={mat.id}
                    className={`${i % 2 === 0 ? "bg-blue-50" : "bg-white"} text-center`}
                  >
                    <td className="py-2 px-3 border">
                      {(currentPage - 1) * itemsPerPage + i + 1}
                    </td>

                    <td className="py-2 px-3 border">
                      <input
                        type="checkbox"
                        checked={isSelected(mat.id)}
                        onChange={() => toggleSelection(mat.id)}
                      />
                    </td>

                    <td className="py-2 px-3 border text-left">{mat.name}</td>
                    <td className="py-2 px-3 border text-left">{mat.description}</td>

                    <td className="py-2 px-3 border text-center">
                      <span className={`px-3 py-1 rounded-md text-xs font-semibold ${typeColor(mat.type)}`}>
                        {mat.type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center mt-3">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>

        {/* FOOTER BUTTONS */}
        <div className="flex justify-end gap-4 mt-6">

          <Button
            className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
            onClick={handleCancel}
          >
            Kembali
          </Button>

          <Button
            onClick={handleAdd}
            className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
          >
            Tambahkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelectMateriDialog;
