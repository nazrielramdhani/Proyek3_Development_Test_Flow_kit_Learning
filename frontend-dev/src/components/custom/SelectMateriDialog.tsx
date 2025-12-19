// import React, { useState, useEffect } from "react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import Pagination from "@/components/custom/Pagination";
// import { useNavigate } from "react-router-dom";
// import { FaSearch } from "react-icons/fa";

// // --- TIPE DATA MATERI ---
// interface Materi {
//   id: string;
//   name: string;
//   description: string;
//   type: string;
// }

// interface SelectMateriDialogProps {
//   isDialogOpen: boolean;
//   setIsDialogOpen: (open: boolean) => void;
//   onAddMateri: (materis: Materi[]) => void;
//   selectedMateri: Materi[];
//   topicName: string;
// }

// const SelectMateriDialog: React.FC<SelectMateriDialogProps> = ({
//   isDialogOpen,
//   setIsDialogOpen,
//   onAddMateri,
//   selectedMateri,
//   topicName,
// }) => {

//   const navigate = useNavigate();
//   const apiUrl = import.meta.env.VITE_API_URL;

//   // Setup API Key
//   let apiKey = import.meta.env.VITE_API_KEY;
//   const sessionData = localStorage.getItem("session");
//   if (sessionData) {
//     try {
//       const session = JSON.parse(sessionData);
//       apiKey = session.token;
//     } catch (e) { console.error("Error parsing session data", e); }
//   }

//   // --- STATE ---
//   const [materis, setMateris] = useState<Materi[]>([]);            
//   const [filteredMateri, setFilteredMateri] = useState<Materi[]>([]); 
//   const [search, setSearch] = useState("");                       
  
//   // State Pagination
//   const [currentPage, setCurrentPage] = useState<number>(1);
//   const itemsPerPage = 8; 

//   const [tempSelectedMateri, setTempSelectedMateri] = useState<Materi[]>(selectedMateri ?? []);

//   // =================================================================
//   //     PERHITUNGAN PAGINATION (DIPINDAHKAN KE ATAS)
//   // =================================================================
//   // Kita hitung dulu variable ini di sini supaya bisa dipakai oleh 'handleSelectAll'
  
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
//   // 'currentMateri' adalah materi yang HANYA tampil di halaman ini
//   const currentMateri = filteredMateri.slice(indexOfFirstItem, indexOfLastItem);
  
//   const totalPages = Math.ceil(filteredMateri.length / itemsPerPage);

//   // =================================================================

//   // Reset pilihan saat dialog dibuka
//   useEffect(() => {
//     setTempSelectedMateri(selectedMateri ?? []);
//   }, [isDialogOpen, selectedMateri]);

//   // Fetch data saat dialog dibuka
//   useEffect(() => {
//     if (isDialogOpen) {
//         fetchAllMateri();
//     }
//   }, [isDialogOpen]);

//   // Reset ke halaman 1 jika search berubah
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [search]);

//   // Mapping helper
//   const mapRowsToMateri = (rows: any[]): Materi[] => {
//     return (rows || []).map((m: any) => ({
//       id: m.id_materi ?? m.ms_id_materi ?? m.id ?? String(Math.random()),
//       name: m.judul_materi ?? m.ms_nama_modul ?? m.name ?? "-",
//       description: m.deskripsi_materi ?? m.ms_deskripsi_modul ?? m.description ?? "-",
//       type: String(m.jenis_materi ?? m.type ?? "default"),
//     }));
//   };

//   // --- FETCH ALL DATA ---
//   const fetchAllMateri = async () => {
//     try {
//       if (!apiUrl) return;

//       const response = await fetch(`${apiUrl}/materi?limit=100`, { 
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//           Authorization: `Bearer ${apiKey}`,
//         },
//       });

//       if (!response.ok) {
//         if (response.status === 403) navigate("/error");
//         return;
//       }

//       const data = await response.json();
//       let rows: any[] = [];

//       if (Array.isArray(data)) {
//          rows = data;
//       } else if (data && (Array.isArray(data.data) || Array.isArray(data.rows))) {
//         rows = data.data || data.rows;
//       }

//       const mapped = mapRowsToMateri(rows);
//       setMateris(mapped);
//       setFilteredMateri(mapped);
//     } catch (error) {
//       console.error("Error fetching materi:", error);
//     }
//   };

//   // --- SEARCH ---
//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const val = e.target.value;
//     setSearch(val);
//     const lowerVal = val.toLowerCase();
//     const filtered = materis.filter((m) =>
//       (m.name || "").toLowerCase().includes(lowerVal) ||
//       (m.description || "").toLowerCase().includes(lowerVal)
//     );
//     setFilteredMateri(filtered);
//   };

//   // --- SELECTION LOGIC ---
//   const isSelected = (id: string) =>
//     Array.isArray(tempSelectedMateri) && tempSelectedMateri.some((m) => m.id === id);

//   const toggleSelection = (id: string) => {
//     const obj = materis.find((x) => x.id === id);
//     if (!obj) return;
//     if (isSelected(id)) setTempSelectedMateri((prev) => prev.filter((x) => x.id !== id));
//     else setTempSelectedMateri((prev) => [...prev, obj]);
//   };

//   // ---------------------------------------------------------
//   //          FITUR SELECT ALL (PER HALAMAN)
//   // ---------------------------------------------------------
//   const handleSelectAll = () => {
//     // Cek hanya data di halaman ini (currentMateri)
//     if (currentMateri.length === 0) return;

//     // Cek apakah semua item DI HALAMAN INI sudah terpilih?
//     const allSelectedOnPage = currentMateri.every((m) => isSelected(m.id));

//     if (allSelectedOnPage) {
//       // Jika semua di halaman ini sudah terpilih -> UNCHECK semuanya (hanya yang di halaman ini)
//       setTempSelectedMateri((prev) =>
//         prev.filter((p) => !currentMateri.some((cm) => cm.id === p.id))
//       );
//     } else {
//       // Jika belum semua terpilih -> CHECK yang belum terpilih (hanya di halaman ini)
//       const newSelected = [...tempSelectedMateri];
//       currentMateri.forEach((m) => {
//         // Hanya masukkan jika belum ada di daftar terpilih
//         if (!isSelected(m.id)) {
//             newSelected.push(m);
//         }
//       });
//       setTempSelectedMateri(newSelected);
//     }
//   };

//   // --- UI HELPERS ---
//   const typeColor = (type: any) => {
//     const safeType = String(type || "").toLowerCase();
//     switch (safeType) {
//       case "teks": case "text": return "bg-blue-100 text-blue-700";
//       case "pdf": case "dokumen pdf": case "dokumen": return "bg-green-100 text-green-700";
//       case "video": return "bg-purple-100 text-purple-700";
//       default: return "bg-gray-200 text-gray-700";
//     }
//   };

//   const handleAdd = () => {
//     const unique = Array.from(new Map(tempSelectedMateri.map((x) => [x.id, x])).values());
//     onAddMateri(unique);
//     setIsDialogOpen(false);
//   };

//   return (
//     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//       <DialogContent className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-5xl mx-auto max-h-screen overflow-y-auto">

//         <DialogHeader>
//           <DialogTitle className="text-xl font-bold text-center mb-6">
//             Tambahkan Materi Pada Topik
//           </DialogTitle>
//         </DialogHeader>

//         {/* SEARCH BAR */}
//         <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
//           <Button
//             onClick={handleSelectAll}
//             className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
//           >
//             {/* Ubah teks agar user paham ini per halaman (Opsional) */}
//             Pilih Semua
//           </Button>

//           <div className="relative w-full md:w-72">
//             <FaSearch className="absolute left-3 top-3 text-gray-400" />
//             <input
//               value={search}
//               onChange={handleSearch}
//               placeholder="Search or type"
//               className="w-full border border-blue-500 rounded-lg py-2 pl-10 pr-3 focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* TABLE */}
//         <div className="overflow-x-auto text-sm">
//           <table className="min-w-full bg-white border rounded-lg shadow-md">
//             <thead>
//               <tr className="bg-blue-800 text-white">
//                 <th className="py-2 px-3 border w-[5%]">No</th>
//                 <th className="py-2 px-3 border w-[5%]">Select</th>
//                 <th className="py-2 px-3 border w-[25%]">Nama Materi</th>
//                 <th className="py-2 px-3 border w-[45%]">Deskripsi</th>
//                 <th className="py-2 px-3 border w-[20%]">Jenis Materi</th>
//               </tr>
//             </thead>

//             <tbody>
//               {filteredMateri.length === 0 ? (
//                 <tr>
//                   <td colSpan={5} className="py-6 text-center text-gray-500">
//                     Data tidak ditemukan
//                   </td>
//                 </tr>
//               ) : (
//                 currentMateri.map((mat, i) => (
//                   <tr
//                     key={mat.id}
//                     className={`${i % 2 === 0 ? "bg-blue-50" : "bg-white"} text-center`}
//                   >
//                     <td className="py-2 px-3 border">
//                       {indexOfFirstItem + i + 1}
//                     </td>

//                     <td className="py-2 px-3 border">
//                       <input
//                         type="checkbox"
//                         checked={isSelected(mat.id)}
//                         onChange={() => toggleSelection(mat.id)}
//                       />
//                     </td>

//                     <td className="py-2 px-3 border text-left">{mat.name}</td>
//                     <td className="py-2 px-3 border text-left">{mat.description}</td>

//                     <td className="py-2 px-3 border text-center align-middle">
//                       <span className={`inline-block min-w-[100px] px-3 py-1 rounded-md text-xs font-semibold text-center ${typeColor(mat.type)}`}>
//                         {mat.type}
//                       </span>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* PAGINATION */}
//         <div className="flex justify-center mt-3">
//           <Pagination 
//             currentPage={currentPage} 
//             totalPages={totalPages > 0 ? totalPages : 1} 
//             onPageChange={setCurrentPage} 
//           />
//         </div>

//         {/* FOOTER */}
//         <div className="flex justify-end gap-4 mt-6">
//           <Button
//             className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
//             onClick={() => {
//                 setTempSelectedMateri(selectedMateri ?? []);
//                 setIsDialogOpen(false);
//             }}
//           >
//             Kembali
//           </Button>

//           <Button
//             onClick={handleAdd}
//             className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
//           >
//             Tambahkan
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default SelectMateriDialog;

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

interface SelectMateriDialogProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  onAddMateri: (materis: Materi[]) => void;
  selectedMateri: Materi[];
  topicName: string;
}

const SelectMateriDialog: React.FC<SelectMateriDialogProps> = ({
  isDialogOpen,
  setIsDialogOpen,
  onAddMateri,
  selectedMateri,
  topicName,
}) => {

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  // Setup API Key
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem("session");
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      apiKey = session.token;
    } catch (e) { console.error("Error parsing session data", e); }
  }

  // --- STATE ---
  const [materis, setMateris] = useState<Materi[]>([]);            
  const [filteredMateri, setFilteredMateri] = useState<Materi[]>([]); 
  const [search, setSearch] = useState("");                       
  
  // State Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8; 

  // Perubahan: tempSelectedMateri diinisialisasi kosong agar hanya menampung materi baru yang dipilih di pop-up
  const [tempSelectedMateri, setTempSelectedMateri] = useState<Materi[]>([]);

  // =================================================================
  //     PERHITUNGAN PAGINATION
  // =================================================================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMateri = filteredMateri.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMateri.length / itemsPerPage);

  // Reset pilihan saat dialog dibuka
  useEffect(() => {
    setTempSelectedMateri([]); // Kosongkan agar tidak membawa data lama dari list utama
  }, [isDialogOpen]);

  // Fetch data saat dialog dibuka
  useEffect(() => {
    if (isDialogOpen) {
        fetchAllMateri();
    }
  }, [isDialogOpen, selectedMateri]); // Re-fetch jika selectedMateri berubah (misal habis dihapus di list luar)

  // Reset ke halaman 1 jika search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Mapping helper
  const mapRowsToMateri = (rows: any[]): Materi[] => {
    return (rows || []).map((m: any) => ({
      id: m.id_materi ?? m.ms_id_materi ?? m.id ?? String(Math.random()),
      name: m.judul_materi ?? m.ms_nama_modul ?? m.name ?? "-",
      description: m.deskripsi_materi ?? m.ms_deskripsi_modul ?? m.description ?? "-",
      type: String(m.jenis_materi ?? m.type ?? "default"),
    }));
  };

  // --- FETCH ALL DATA DENGAN LOGIKA FILTER ---
  const fetchAllMateri = async () => {
    try {
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/materi?limit=100`, { 
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

      if (Array.isArray(data)) {
         rows = data;
      } else if (data && (Array.isArray(data.data) || Array.isArray(data.rows))) {
        rows = data.data || data.rows;
      }

      const mapped = mapRowsToMateri(rows);

      // LOGIKA FILTER: Hanya masukkan materi yang BELUM ada di list selectedMateri
      const onlyAvailableMateri = mapped.filter(
        (m) => !selectedMateri.some((sel) => sel.id === m.id)
      );

      setMateris(onlyAvailableMateri);
      setFilteredMateri(onlyAvailableMateri);
    } catch (error) {
      console.error("Error fetching materi:", error);
    }
  };

  // --- SEARCH ---
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    const lowerVal = val.toLowerCase();
    const filtered = materis.filter((m) =>
      (m.name || "").toLowerCase().includes(lowerVal) ||
      (m.description || "").toLowerCase().includes(lowerVal)
    );
    setFilteredMateri(filtered);
  };

  // --- SELECTION LOGIC ---
  const isSelected = (id: string) =>
    Array.isArray(tempSelectedMateri) && tempSelectedMateri.some((m) => m.id === id);

  const toggleSelection = (id: string) => {
    const obj = materis.find((x) => x.id === id);
    if (!obj) return;
    if (isSelected(id)) setTempSelectedMateri((prev) => prev.filter((x) => x.id !== id));
    else setTempSelectedMateri((prev) => [...prev, obj]);
  };

  // --- SELECT ALL (PER HALAMAN) ---
  const handleSelectAll = () => {
    if (currentMateri.length === 0) return;

    const allSelectedOnPage = currentMateri.every((m) => isSelected(m.id));

    if (allSelectedOnPage) {
      setTempSelectedMateri((prev) =>
        prev.filter((p) => !currentMateri.some((cm) => cm.id === p.id))
      );
    } else {
      const newSelected = [...tempSelectedMateri];
      currentMateri.forEach((m) => {
        if (!isSelected(m.id)) {
            newSelected.push(m);
        }
      });
      setTempSelectedMateri(newSelected);
    }
  };

  // --- UI HELPERS ---
  const typeColor = (type: any) => {
    const safeType = String(type || "").toLowerCase();
    switch (safeType) {
      case "teks": case "text": return "bg-blue-100 text-blue-700";
      case "pdf": case "dokumen pdf": case "dokumen": return "bg-green-100 text-green-700";
      case "video": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-200 text-gray-700";
    }
  };

  const handleAdd = () => {
    // Menghilangkan duplikat jika ada dan mengirim data ke halaman utama
    const unique = Array.from(new Map(tempSelectedMateri.map((x) => [x.id, x])).values());
    onAddMateri(unique);
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-5xl mx-auto max-h-screen overflow-y-auto">

        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-6">
            Tambahkan Materi Pada Topik
          </DialogTitle>
        </DialogHeader>

        {/* SEARCH BAR */}
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <Button
            onClick={handleSelectAll}
            className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
          >
            Pilih Semua
          </Button>

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

        {/* TABLE */}
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full bg-white border rounded-lg shadow-md">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="py-2 px-3 border w-[5%]">No</th>
                <th className="py-2 px-3 border w-[5%]">Select</th>
                <th className="py-2 px-3 border w-[25%]">Nama Materi</th>
                <th className="py-2 px-3 border w-[45%]">Deskripsi</th>
                <th className="py-2 px-3 border w-[20%]">Jenis Materi</th>
              </tr>
            </thead>

            <tbody>
              {filteredMateri.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    Data tidak ditemukan atau semua materi sudah dipilih
                  </td>
                </tr>
              ) : (
                currentMateri.map((mat, i) => (
                  <tr
                    key={mat.id}
                    className={`${i % 2 === 0 ? "bg-blue-50" : "bg-white"} text-center`}
                  >
                    <td className="py-2 px-3 border">
                      {indexOfFirstItem + i + 1}
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

                    <td className="py-2 px-3 border text-center align-middle">
                      <span className={`inline-block min-w-[100px] px-3 py-1 rounded-md text-xs font-semibold text-center ${typeColor(mat.type)}`}>
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
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages > 0 ? totalPages : 1} 
            onPageChange={setCurrentPage} 
          />
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            className="bg-white text-blue-800 border border-blue-800 rounded-full px-5 py-2 hover:bg-blue-100 hover:text-blue-800"
            onClick={() => {
                setIsDialogOpen(false);
            }}
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