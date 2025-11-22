import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/custom/Pagination';
import { FaSearch } from 'react-icons/fa'; 
import { useNavigate } from "react-router-dom";

// ===========================================================================
//                  API CONFIGURATION & HELPER METHOD
// Bagian ini sebelumnya ada di topicService.ts dan sekarang di pindahin ke 
// kompinen biar file yang ini bisa berdiri sendiri
// ===========================================================================

// Base URL API
const API_URL = import.meta.env.VITE_API_URL;

// Template tipe data unutk respone API
type ApiResult<T> = {
  ok: boolean; // res .ok dari fetch
  status: number; //HTTP Status
  data?: T; // isi data jika success
  message?: string; // pesan error jika ada
};

// Helper untuk menyusun header request API (mengirim token)
const getHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  Authorization: token ? `Bearer ${token}` : "",
});



// ===========================================================================
//                              FUNGSI MATERI
// Function untuk memanggil endpoint pencarian materi.
// ===========================================================================
async function searchMateri(page = 1, limit = 8, token?: string, searchQuery = ""): Promise<ApiResult<any>> {

  // Query search ditambahkan jika ad ainput pencarian
  const query = searchQuery ? `${searchQuery}` : ''; 

  // URL final untuk API search
  const url = `${API_URL}/materi/search?page=${page}&limit=${limit}${query}`;
  
  // Request GET
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(token),
  });

  // Menyimpan status dan payload response
  const status = res.status;
  const payload = await res.json().catch(() => null);
  return { ok: res.ok, status, data: payload, message: payload?.message };
}



// --- INTERFACE MATERI ---
interface Materi {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  type: string;
}

interface AddMateriToTopicProps {
    isDialogOpen: boolean;
    setIsDialogOpen: (open: boolean) => void;
    topicName: string;
    selectedMateri: Materi[];
    onConfirmSelection: (materiList: Materi[]) => void;
}

const AddMateriToTopic: React.FC<AddMateriToTopicProps> = ({ 
    isDialogOpen, 
    setIsDialogOpen, 
    topicName,
    selectedMateri,
    onConfirmSelection
}) => {
    const navigate = useNavigate();
    // const apiUrl = import.meta.env.VITE_API_URL; // Sudah didefinisikan di atas sebagai global const
    let apiKey = ''; 
    const sessionData = localStorage.getItem('session');
    if (sessionData != null) {
        apiKey = JSON.parse(sessionData).token;
    }

    // --- STATE DIALOG / POPUP PENCARIAN MATERI ---
    const [availableMateri, setAvailableMateri] = useState<Materi[]>([]); 
    const [tempSelectedMateri, setTempSelectedMateri] = useState<Materi[]>([]); 
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const itemsPerPage = 8;
    const [searchTerm, setSearchTerm] = useState<string>(''); 

    // --- Helper style berdasarkan tipe materi ---
    const getTypeStyle = (type: string) => {
        const safeType = type ? type.toLowerCase() : '';
        if (safeType.includes('video')) return 'bg-purple-100 text-purple-700';
        if (safeType.includes('pdf')) return 'bg-red-100 text-red-700';
        return 'bg-blue-100 text-blue-700';
    };

    // Fetch materi dari API search (UPDATE: Menambahkan searchTerm)
    const fetchAvailableMateri = async (page: number, search: string = searchTerm) => {
        setCurrentPage(page);
        try {
            const searchQuery = search ? `&search=${encodeURIComponent(search)}` : '';
            // Memanggil fungsi lokal searchMateri
            const res = await searchMateri(page, itemsPerPage, apiKey, searchQuery); 
            
            if (!res.ok) {
                if (res.status === 403) {
                    navigate('/error');
                    return;
                } else {
                    throw new Error(res.message || "Gagal ambil data materi");
                }
            }

            const data = res.data;
            const tempResult: Materi[] = (data?.data || []).map((m: any) => ({
                id: m.ms_id_materi || m.ms_id_modul,
                name: m.ms_nama_materi || m.ms_nama_modul,
                description: m.ms_deskripsi_materi || m.ms_deskripsi_modul,
                difficulty: m.tingkat_kesulitan,
                type: m.ms_jenis_materi || "Teks"
            }));

            setAvailableMateri(tempResult);
            setTotalPages(data?.max_page || 1);
        } catch (err) {
            console.error('Error fetching materi:', err);
        }
    };
    
    // Handler untuk perubahan input search
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };
    
    // Handler saat tombol search ditekan (atau enter)
    const handleSearchSubmit = () => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchAvailableMateri(1, searchTerm);
        }
    };

    // Logika untuk Select All
    const toggleSelectAll = () => {
        const allSelected = availableMateri.every(materi => isSelected(materi.id));
        
        if (allSelected) {
            // Hapus pilihan semua materi di halaman ini dari tempSelectedMateri
            const materiIdsInCurrentPage = new Set(availableMateri.map(m => m.id));
            setTempSelectedMateri(prev => prev.filter(m => !materiIdsInCurrentPage.has(m.id)));
        } else {
            // Pilih semua materi di halaman ini (tambahkan yang belum ada)
            const selectedIds = new Set(tempSelectedMateri.map(m => m.id));
            const newSelections = availableMateri.filter(materi => !selectedIds.has(materi.id));
            setTempSelectedMateri(prev => [...prev, ...newSelections]);
        }
    };

    // Cek apakah semua item di halaman ini sudah terpilih untuk mengontrol tombol Select All
    const isSelectAllChecked = availableMateri.length > 0 && availableMateri.every(materi => isSelected(materi.id));


    // Saat dialog dibuka: sinkronisasi selectedMateri dan reset search
    useEffect(() => {
        if (isDialogOpen) {
            setTempSelectedMateri(selectedMateri);
            setSearchTerm(''); 
        }
    }, [isDialogOpen, selectedMateri]);

    // Efek untuk memicu fetch saat currentPage berubah (termasuk saat reset ke 1 oleh handleSearchSubmit)
    useEffect(() => {
        if (isDialogOpen) {
            fetchAvailableMateri(currentPage);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, isDialogOpen]); 
    
    const toggleMateriSelection = (materiId: string) => {
        const selectedItem = availableMateri.find(m => m.id === materiId);
        if (!selectedItem) return;
        
        if (tempSelectedMateri.some(m => m.id === materiId)) {
            setTempSelectedMateri(prev => prev.filter(m => m.id !== materiId));
        } else {
            setTempSelectedMateri(prev => [...prev, selectedItem]);
        }
    };

    const isSelected = (materiId: string) => tempSelectedMateri.some(m => m.id === materiId);

    const handleConfirm = () => {
        onConfirmSelection(tempSelectedMateri); // Kirim materi yang dipilih kembali ke parent
        setIsDialogOpen(false);
    };

    const handleCancel = () => {
        // Tidak perlu reset tempSelectedMateri, karena saat dialog dibuka ulang akan disinkronisasi
        setIsDialogOpen(false);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={handleCancel}>
            <DialogContent className="bg-white p-4 md:p-10 rounded-lg shadow-lg max-w-4xl mx-auto max-h-screen overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg text-center font-bold mb-2">
                        Tambahkan Materi Pada Topik {topicName}
                    </DialogTitle>
                </DialogHeader>
                
                {/* --- BAGIAN SEARCH DAN SELECT ALL --- */}
                <div className="flex justify-between items-center mb-4">
                    {/* SELECT ALL BUTTON */}
                    <Button 
                        className="bg-blue-500 text-white rounded-full px-4 py-2 text-xs hover:bg-blue-600"
                        onClick={toggleSelectAll}
                        disabled={availableMateri.length === 0}
                    >
                        {isSelectAllChecked ? 'Hapus Semua Pilihan' : 'Pilih Semua'}
                    </Button>
                    
                    {/* SEARCH INPUT */}
                    <div className="relative w-full max-w-xs ml-4">
                        <input
                            type="text"
                            placeholder="Search or type"
                            className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
                        />
                        <FaSearch 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer" 
                            onClick={handleSearchSubmit}
                        />
                    </div>
                </div>
                {/* --- AKHIR BAGIAN SEARCH DAN SELECT ALL --- */}

                <div className="overflow-x-auto text-xs lg:text-sm">
                    <table className="min-w-full bg-white border rounded-lg shadow-md">
                        <thead>
                            <tr className="bg-blue-800 text-white">
                                <th className="py-2 px-4 border">No</th>
                                <th className="py-2 px-4 border">Select</th>
                                <th className="py-2 px-4 border">Nama Materi</th>
                                <th className="py-2 px-4 border">Deskripsi</th>
                                <th className="py-2 px-4 border">Jenis Materi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availableMateri.map((materi, index) => (
                                <tr key={materi.id} className={`text-center ${index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}>
                                    <td className="py-2 px-4 border">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-2 px-4 border">
                                        <input
                                            type="checkbox"
                                            checked={isSelected(materi.id)}
                                            onChange={() => toggleMateriSelection(materi.id)}
                                        />
                                    </td>
                                    <td className="py-2 px-4 border">{materi.name}</td>
                                    <td className="py-2 px-4 border">{materi.description}</td>
                                    <td className="py-2 px-4 border">
                                        <span className={`inline-block w-24 px-2 py-1 rounded-md text-xs font-semibold ${getTypeStyle(materi.type)}`}>
                                            {materi.type}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-center mt-2">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => fetchAvailableMateri(page)}
                    />
                </div>
                <div className="flex flex-col md:flex-row justify-end space-y-4 md:space-y-0 md:space-x-4 w-full flex-wrap">
                    <Button className="bg-transparent border border-blue-800 text-blue-800 rounded-full px-4 py-2 hover:bg-blue-100 sm:px-2 sm:py-1 sm:text-xs" onClick={handleCancel}>
                        Kembali
                    </Button>
                    <Button className="bg-blue-800 text-white rounded-full px-4 py-2 hover:bg-blue-700 sm:px-2 sm:py-1 sm:text-xs" onClick={handleConfirm}>
                        Tambahkan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddMateriToTopic;