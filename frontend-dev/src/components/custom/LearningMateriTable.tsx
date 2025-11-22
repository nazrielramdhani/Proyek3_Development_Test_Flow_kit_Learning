import React from "react";
import { FaTrash, FaEdit, FaInfoCircle } from "react-icons/fa";

interface Materi {
  id: string;
  judul: string;
  deskripsi?: string;
  jenis: string;
  jml_mahasiswa?: number;
}

interface Props {
  materi?: Materi[]; 
  onEdit: (m: Materi) => void;
  onDelete: (m: Materi) => void;
  onDetail?: (m: Materi) => void;
}

const formatJenis = (jenisRaw: string | undefined) => {
  if (!jenisRaw) return "Tidak Diketahui";
  const j = jenisRaw.toLowerCase();
  if (j.includes("pdf") || j.includes("dokumen")) return "Dokumen PDF";
  if (j.includes("video")) return "Video";
  if (j.includes("teks") || j.includes("text")) return "Teks";
  return jenisRaw.charAt(0).toUpperCase() + jenisRaw.slice(1);
};

const LearningMateriTable: React.FC<Props> = ({ materi = [], onEdit, onDelete, onDetail }) => {
  return (
    <table className="min-w-full bg-white border rounded-lg shadow-md text-xs lg:text-sm">
      <thead>
        <tr className="bg-blue-800 text-white">
          <th className="py-3 px-4 border">Judul Materi</th>
          <th className="py-3 px-4 border">Deskripsi</th>
          <th className="py-3 px-4 border">Jenis Materi</th>
          <th className="py-3 px-4 border text-center">Action</th>
        </tr>
      </thead>
      <tbody>
        {materi.length === 0 ? (
          <tr>
            <td colSpan={4} className="py-6 text-center text-red-500">Data tidak ditemukan</td>
          </tr>
        ) : (
          materi.map((item, idx) => (
            <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
              <td className="py-3 px-4 border font-medium">{item.judul}</td>
              <td className="py-3 px-4 border">{item.deskripsi || "-"}</td>
              <td className="py-3 px-4 border">{formatJenis(item.jenis)}</td>
              <td className="py-3 px-4 border text-center">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2 rounded-full bg-white shadow-sm hover:bg-blue-50 text-blue-600"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="p-2 rounded-full bg-white shadow-sm hover:bg-red-50 text-red-600"
                    title="Hapus"
                  >
                    <FaTrash />
                  </button>
                  {onDetail && (
                    <button
                      onClick={() => onDetail(item)}
                      className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-50 text-gray-700"
                      title="Detail"
                    >
                      <FaInfoCircle />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default LearningMateriTable;
