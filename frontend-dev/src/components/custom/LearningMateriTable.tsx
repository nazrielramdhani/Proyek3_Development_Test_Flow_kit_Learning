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
  materi: Materi[];
  onEdit: (m: Materi) => void;
  onDelete: (m: Materi) => void;
  onDetail?: (m: Materi) => void;
}

const LearningMateriTable: React.FC<Props> = ({ materi, onEdit, onDelete, onDetail }) => {
  return (
    <table className="min-w-full border border-gray-300 text-sm">
      <thead className="bg-gray-100 text-gray-700 font-semibold">
        <tr>
          <td className="py-3 px-4 border">Judul Materi</td>
          <td className="py-3 px-4 border">Deskripsi</td>
          <td className="py-3 px-4 border">Jenis Materi</td>
          <td className="py-3 px-4 border text-center">Action</td>
        </tr>
      </thead>
      <tbody>
        {materi.map((item, index) => (
          <tr key={index} className="hover:bg-gray-50">
            <td className="py-3 px-4 border font-medium">{item.judul}</td>
            <td className="py-3 px-4 border">{item.deskripsi || "-"}</td>
            <td className="py-3 px-4 border capitalize">
              {item.jenis === "file" ? "Dokumen PDF" :
               item.jenis === "text" ? "Teks" :
               item.jenis === "video" ? "Video" : "Tidak diketahui"}
            </td>
            <td className="py-3 px-4 border text-center space-x-3">
              <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800">
                <FaEdit />
              </button>
              <button onClick={() => onDelete(item)} className="text-red-600 hover:text-red-800">
                <FaTrash />
              </button>
              {onDetail && (
                <button onClick={() => onDetail(item)} className="text-gray-700 hover:text-black">
                  <FaInfoCircle />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export default LearningMateriTable;