import React from 'react';
import { FaEdit, FaTrash, FaSortUp, FaSortDown, FaCloudUploadAlt, FaCloudDownloadAlt } from 'react-icons/fa';

interface Topic {
  id: string;
  name: string;
  description: string;
  status: 'P' | 'D';
  studentAccess: number;
}

interface TopicTableProps {
  topics: Topic[];
  orderBy: string;
  order: 'asc' | 'desc';
  onSort: (property: string) => void;
  onTogglePublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const getStatusStyle = (status: 'P' | 'D') => {
  return status === 'P'
    ? 'bg-green-100 text-green-700'
    : 'bg-yellow-100 text-yellow-700';
};

const getStatusLabel = (status: 'P' | 'D') => {
  return status === 'P' ? 'Published' : 'Draft';
};

const TopicTable: React.FC<TopicTableProps> = ({ topics, orderBy, order, onSort, onTogglePublish, onDelete, onEdit }) => {
  return (
    <table className="min-w-full">
      <thead className="bg-blue-800 text-white text-xs lg:text-sm">
        <tr>
          <th className="py-3 px-4 border-b border-r">Nama Topik</th>
          <th className="py-3 px-4 border-b border-r">Deskripsi</th>

          <th
            className="py-3 px-4 border-b border-r cursor-pointer"
            onClick={() => onSort('status')}
          >
            <div className="flex items-center">
              Status Tayang
              {orderBy === 'status' ? (
                order === 'asc' ? <FaSortUp className="ml-2" /> : <FaSortDown className="ml-2" />
              ) : (
                <FaSortDown className="ml-2 opacity-50" />
              )}
            </div>
          </th>

          <th
            className="py-3 px-4 border-b border-r cursor-pointer"
            onClick={() => onSort('jml_student')}
          >
            <div className="flex items-center">
              Jumlah Mahasiswa yang Mengakses
              {orderBy === 'jml_student' ? (
                order === 'asc' ? <FaSortUp className="ml-2" /> : <FaSortDown className="ml-2" />
              ) : (
                <FaSortDown className="ml-2 opacity-50" />
              )}
            </div>
          </th>

          <th className="py-3 px-4 border-b">Action</th>
        </tr>
      </thead>

      <tbody className="text-xs lg:text-sm">
        {topics.map((topic, index) => (
          <tr key={topic.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b`}>
            <td className="py-3 px-4 border-r">{topic.name}</td>
            <td className="py-3 px-4 border-r">{topic.description}</td>

            <td className="py-3 px-4 border-r">
              <span className={`px-2 py-1 rounded ${getStatusStyle(topic.status)}`}>
                {getStatusLabel(topic.status)}
              </span>
            </td>

            <td className="py-3 px-4 border-r">{topic.studentAccess === 0 ? '-' : topic.studentAccess}</td>

            <td className="py-3 px-4 flex items-center space-x-2">
              {/* Edit disable jika published */}
              <FaEdit
                className={`cursor-pointer ${topic.status === 'P' ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500'}`}
                onClick={() => topic.status !== 'P' && onEdit(topic.id)}
              />

              {/* Delete disable jika published */}
              <FaTrash
                className={`cursor-pointer ${topic.status === 'P' ? 'text-gray-300 cursor-not-allowed' : 'text-red-500'}`}
                onClick={() => topic.status !== 'P' && onDelete(topic.id)}
              />

              {/* Toggle publish */}
              {topic.status === 'D' ? (
                <FaCloudUploadAlt
                  className="cursor-pointer text-green-600"
                  onClick={() => onTogglePublish(topic.id)}
                />
              ) : topic.status === 'P' && topic.studentAccess === 0 ? (
                <FaCloudDownloadAlt
                  className="cursor-pointer text-gray-600"
                  onClick={() => onTogglePublish(topic.id)}
                />
              ) : (
                <FaCloudDownloadAlt className="text-gray-300 cursor-not-allowed" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TopicTable;
