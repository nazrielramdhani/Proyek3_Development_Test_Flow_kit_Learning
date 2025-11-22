// src/components/custom/SelectMateriDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/custom/Pagination';
import { useNavigate } from "react-router-dom";

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

const SelectMateriDialog: React.FC<SelectMateriDialogProps> = ({ isDialogOpen, setIsDialogOpen, onAddMateri, selectedMateri, topicName }) => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem('session');
  if (sessionData != null) {
    const session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [materis, setMateris] = useState<Materi[]>([]);
  const itemsPerPage = 8; // items per page
  // make sure tempSelectedMateri always an array
  const [tempSelectedMateri, setTempSelectedMateri] = useState<Materi[]>(selectedMateri ?? []);

  useEffect(() => {
    setTempSelectedMateri(selectedMateri ?? []);
  }, [isDialogOpen, selectedMateri]);

  useEffect(() => {
    fetchMateri(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // safe helper: map raw API rows into standardized Materi shape
  const mapRowsToMateri = (rows: any[]): Materi[] => {
    return (rows || []).map((m: any) => ({
      id: m.id_materi ?? m.ms_id_materi ?? m.id_materi ?? m.id ?? String(Math.random()),
      name: m.judul_materi ?? m.ms_nama_modul ?? m.judul ?? m.name ?? '',
      description: m.deskripsi_materi ?? m.ms_deskripsi_modul ?? m.deskripsi ?? m.description ?? '',
      type: m.jenis_materi ?? m.type ?? 'default'
    }));
  };

  const fetchMateri = async (page: number) => {
    setCurrentPage(page);
    try {
      const response = await fetch(`${apiUrl}/materi?page=${page}&limit=${itemsPerPage}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          navigate('/error');
          return;
        } else {
          // try to still parse body for error details or fallback
          console.error('HTTP error fetching materi', response.status);
          return;
        }
      }

      const data = await response.json().catch(() => null);

      // Support two shapes:
      // A) { data: [...], max_page: n }  OR
      // B) [...]  (array)
      let rows: any[] = [];
      let maxPage = 1;

      if (!data) {
        rows = [];
      } else if (Array.isArray(data)) {
        rows = data;
      } else if (Array.isArray(data.data)) {
        rows = data.data;
        // some endpoints return max_page
        if (data.max_page) maxPage = data.max_page;
      } else {
        // fallback: try to find array inside object
        rows = Object.values(data).find(v => Array.isArray(v)) || [];
      }

      const mapped = mapRowsToMateri(rows);
      setMateris(mapped);
      setTotalPages(maxPage);
    } catch (error) {
      console.error('Error fetching materi:', error);
      setMateris([]);
    }
  };

  // safe isSelected
  const isSelected = (materiId: string) => {
    return Array.isArray(tempSelectedMateri) && tempSelectedMateri.some(m => m && m.id === materiId);
  };

  const toggleSelection = (materiId: string) => {
    const m = materis.find(x => x.id === materiId);
    if (!m) return;
    if (isSelected(materiId)) {
      setTempSelectedMateri(prev => prev.filter(x => x.id !== materiId));
    } else {
      setTempSelectedMateri(prev => [...(prev ?? []), m]);
    }
  };

  const handleCancel = () => {
    setTempSelectedMateri(selectedMateri ?? []);
    setIsDialogOpen(false);
  };

  const handleAdd = () => {
    // make sure unique by id
    const unique = Array.from(new Map((tempSelectedMateri ?? []).map(x => [x.id, x])).values());
    onAddMateri(unique);
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="bg-white p-4 md:p-10 rounded-lg shadow-lg max-w-4xl mx-auto max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg text-center font-bold mb-2">
            Pilih Materi untuk Topik {topicName ? ` - ${topicName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto text-xs lg:text-sm">
          <table className="min-w-full bg-white border rounded-lg shadow-md">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="py-2 px-4 border">No</th>
                <th className="py-2 px-4 border">Select</th>
                <th className="py-2 px-4 border">Judul Materi</th>
                <th className="py-2 px-4 border">Deskripsi</th>
                <th className="py-2 px-4 border">Jenis</th>
              </tr>
            </thead>
            <tbody>
              {materis.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">Data tidak ditemukan</td>
                </tr>
              ) : (
                materis.map((mat, index) => (
                  <tr key={mat.id} className={`text-center ${index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}>
                    <td className="py-2 px-4 border">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="py-2 px-4 border">
                      <input
                        type="checkbox"
                        checked={isSelected(mat.id)}
                        onChange={() => toggleSelection(mat.id)}
                      />
                    </td>
                    <td className="py-2 px-4 border text-left">{mat.name ?? '-'}</td>
                    <td className="py-2 px-4 border text-left">{mat.description ?? '-'}</td>
                    <td className="py-2 px-4 border">{mat.type ?? 'default'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center mt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

        <div className="flex flex-col md:flex-row justify-end space-y-4 md:space-y-0 md:space-x-4 w-full flex-wrap mt-4">
          <Button className="bg-transparent border border-blue-800 text-blue-800 rounded-full px-4 py-2 hover:bg-blue-100" onClick={handleCancel}>
            Kembali
          </Button>
          <Button className="bg-blue-800 text-white rounded-full px-4 py-2 hover:bg-blue-700" onClick={handleAdd}>
            Tambahkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelectMateriDialog;
