// src/components/custom/AddMateriDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/custom/Pagination';
import { FaSearch } from 'react-icons/fa'; 
import { useNavigate } from "react-router-dom";

// ❌ AWALNYA: Import API search
// import { searchMateri } from '@/services/topicService';
// 🟢 AKHIRNYA: API tidak dipakai, jadi dihapus total

// --- INTERFACE MATERI ---
interface Materi {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    type: string;
}

interface AddMateriDialogProps {
    isDialogOpen: boolean;
    setIsDialogOpen: (open: boolean) => void;
    topicName: string;
    selectedMateri: Materi[];
    onConfirmSelection: (materiList: Materi[]) => void;
}

const AddMateriDialog: React.FC<AddMateriDialogProps> = ({ 
    isDialogOpen, 
    setIsDialogOpen, 
    topicName,
    selectedMateri,
    onConfirmSelection
}) => {

    const navigate = useNavigate();

    // =====================================================================
    // 🟢 TAMBAHAN BARU: MOCK DATA (20 materi)
    // =====================================================================
    const mockMateri: Materi[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Materi Pembelajaran ${i + 1}`,
        description: `Deskripsi lengkap mengenai materi pembelajaran nomor ${i + 1}...`,
        difficulty: ["Mudah", "Sedang", "Sulit"][i % 3],
        type: i % 3 === 0 ? "Video" : i % 3 === 1 ? "PDF" : "Text",
    }));

    // --- STATE ---
    const [availableMateri, setAvailableMateri] = useState<Materi[]>([]); 
    const [tempSelectedMateri, setTempSelectedMateri] = useState<Materi[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const itemsPerPage = 8;

    // Helper style
    const getTypeStyle = (type: string) => {
        const safeType = type.toLowerCase();
        if (safeType.includes("video")) return 'bg-purple-100 text-purple-700';
        if (safeType.includes("pdf")) return 'bg-red-100 text-red-700';
        return 'bg-blue-100 text-blue-700';
    };

    // =====================================================================
    // 🟢 AKHIRNYA: Fetch gunakan MOCK DATA, tidak pakai API lagi
    // =====================================================================
    const fetchAvailableMateri = (page: number, search: string = searchTerm) => {
        setCurrentPage(page);

        let filtered = mockMateri;

        // Search filter
        if (search.trim() !== "") {
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Pagination
        const start = (page - 1) * itemsPerPage;
        const paginated = filtered.slice(start, start + itemsPerPage);

        setAvailableMateri(paginated);
        setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    };

    // =====================================================================
    // SEARCH HANDLER
    // =====================================================================
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = () => {
        setCurrentPage(1);
        fetchAvailableMateri(1, searchTerm);
    };

    // =====================================================================
    // SELECT ALL
    // =====================================================================
    const isSelected = (materiId: string) =>
        tempSelectedMateri.some(m => m.id === materiId);

    const toggleSelectAll = () => {
        const allSelected = availableMateri.every(m => isSelected(m.id));

        if (allSelected) {
            const idsOnPage = new Set(availableMateri.map(m => m.id));
            setTempSelectedMateri(prev => prev.filter(m => !idsOnPage.has(m.id)));
        } else {
            const selectedIds = new Set(tempSelectedMateri.map(m => m.id));
            const newOnes = availableMateri.filter(m => !selectedIds.has(m.id));
            setTempSelectedMateri(prev => [...prev, ...newOnes]);
        }
    };

    const isSelectAllChecked =
        availableMateri.length > 0 &&
        availableMateri.every(m => isSelected(m.id));

    // =====================================================================
    // DIALOG OPEN SYNC
    // =====================================================================
    useEffect(() => {
        if (isDialogOpen) {
            setTempSelectedMateri(selectedMateri);
            setSearchTerm('');
        }
    }, [isDialogOpen, selectedMateri]);

    // Fetch on page change
    useEffect(() => {
        if (isDialogOpen) fetchAvailableMateri(currentPage);
    }, [currentPage, isDialogOpen]);

    // =====================================================================
    // TOGGLE SINGLE SELECT
    // =====================================================================
    const toggleMateriSelection = (materiId: string) => {
        const item = availableMateri.find(m => m.id === materiId);
        if (!item) return;

        if (isSelected(materiId)) {
            setTempSelectedMateri(prev => prev.filter(m => m.id !== materiId));
        } else {
            setTempSelectedMateri(prev => [...prev, item]);
        }
    };

    // =====================================================================
    // CONFIRM & CANCEL
    // =====================================================================
    const handleConfirm = () => {
        onConfirmSelection(tempSelectedMateri);
        setIsDialogOpen(false);
    };

    const handleCancel = () => {
        setIsDialogOpen(false);
    };

    // =====================================================================
    // RENDER
    // =====================================================================
    return (
        <Dialog open={isDialogOpen} onOpenChange={handleCancel}>
            <DialogContent className="bg-white p-4 md:p-10 rounded-lg shadow-lg max-w-4xl mx-auto max-h-screen overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg text-center font-bold mb-2">
                        Tambahkan Materi Pada Topik {topicName}
                    </DialogTitle>
                </DialogHeader>

                {/* SEARCH + SELECT ALL */}
                <div className="flex justify-between items-center mb-4">
                    <Button 
                        className="bg-blue-500 text-white rounded-full px-4 py-2 text-xs hover:bg-blue-600"
                        onClick={toggleSelectAll}
                        disabled={availableMateri.length === 0}
                    >
                        {isSelectAllChecked ? 'Hapus Semua Pilihan' : 'Pilih Semua'}
                    </Button>

                    {/* Search input */}
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

                {/* TABLE */}
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

                                    <td className="py-2 px-4 border">
                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                    </td>

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

                {/* PAGINATION */}
                <div className="flex justify-center mt-2">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => fetchAvailableMateri(page)}
                    />
                </div>

                {/* ACTION BUTTONS */}
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

export default AddMateriDialog;
