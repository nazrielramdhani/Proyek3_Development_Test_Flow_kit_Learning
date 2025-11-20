import React from 'react';
import { FaEdit, FaTrash, FaCloudUploadAlt, FaCloudDownloadAlt, FaSortUp, FaSortDown } from 'react-icons/fa';

export interface LearningTopic {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  status: 'P' | 'D';
}

interface Props {
  topics: LearningTopic[];
  orderBy: string;
  order: 'asc' | 'desc';
  onSort: (property: string) => void;
  onTogglePublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const getStatusStyle = (status: 'P' | 'D') => {
  switch (status) {
    case 'P': return 'bg-green-100 text-green-600';
    case 'D': return 'bg-yellow-100 text-yellow-600';
    default: return '';
  }
};
const getStatusLabel = (status: 'P' | 'D') => status === 'P' ? 'Published' : 'Draft';

const formatStudentCount = (n: number) => (n === 0 ? '-' : n);

const LearningTopicTable: React.FC<Props> = ({ topics, orderBy, order, onSort, onTogglePublish, onDelete, onEdit }) => {
  return (
    <table className="min-w-full">
      <thead className="bg-blue-800 text-white text-xs lg:text-sm">
        <tr>
          <th className="py-3 px-2 md:px-6 text-left border-b border-r">Nama Topik</th>
          <th className="py-3 px-2 md:px-6 text-left border-b border-r">Deskripsi</th>
          <th
            className="py-3 px-2 md:px-6 text-left border-b border-r cursor-pointer"
            onClick={() => onSort('status')}
          >
            <div className="flex items-center">
              Status Tayang
              {orderBy === 'status' ? (order === 'asc' ? <FaSortUp className="ml-2 text-white" /> : <FaSortDown className="ml-2 text-white" />) : <FaSortDown className="ml-2 text-white opacity-50" />}
            </div>
          </th>
          <th
            className="py-3 px-6 text-left border-b border-r cursor-pointer"
            onClick={() => onSort('jml_mahasiswa')}
          >
            <div className="flex items-center">
              Jumlah Mahasiswa Mengakses
              {orderBy === 'jml_mahasiswa' ? (order === 'asc' ? <FaSortUp className="ml-2 text-white" /> : <FaSortDown className="ml-2 text-white" />) : <FaSortDown className="ml-2 text-white opacity-50" />}
            </div>
          </th>
          <th className="py-3 px-6 text-left border-b">Action</th>
        </tr>
      </thead>

      <tbody className="text-xs lg:text-sm">
        {topics.map((t, idx) => (
          <tr key={t.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            <td className="py-3 px-2 md:px-6 border-r align-top whitespace-normal">{t.name}</td>
            <td className="py-3 px-2 md:px-6 border-r align-top whitespace-normal">{t.description}</td>
            <td className="py-3 px-2 md:px-6 border-r align-top">
              <span className={`px-2 py-1 rounded ${getStatusStyle(t.status)}`}>{getStatusLabel(t.status)}</span>
            </td>
            <td className="py-3 px-6 border-r align-top">{formatStudentCount(t.studentCount)}</td>
            <td className="py-3 px-6 flex items-center space-x-2">
              <FaEdit
                className={`cursor-pointer ${t.status === 'P' ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500'}`}
                onClick={() => t.status !== 'P' && onEdit(t.id)}
                title="Edit"
              />
              <FaTrash
                className={`cursor-pointer ${t.status === 'P' ? 'text-gray-300 cursor-not-allowed' : 'text-red-500'}`}
                onClick={() => t.status !== 'P' && onDelete(t.id)}
                title="Hapus"
              />
              {t.status === 'D' ? (
                <FaCloudUploadAlt className="cursor-pointer text-green-500" onClick={() => onTogglePublish(t.id)} title="Publish" />
              ) : (t.status === 'P' && (t.studentCount === 0)) ? (
                <FaCloudDownloadAlt className="cursor-pointer text-gray-500" onClick={() => onTogglePublish(t.id)} title="Take down" />
              ) : (
                <FaCloudDownloadAlt className="cursor-not-allowed text-gray-300" title="Tidak bisa take down" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LearningTopicTable;