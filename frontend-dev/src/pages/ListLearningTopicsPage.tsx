import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import Sidebar from '../components/custom/Sidebar';
import Pagination from '@/components/custom/Pagination';
import LearningTopicTable, { LearningTopic } from '../components/custom/LearningTopicTable';
import ConfirmationModal from '../components/custom/ConfirmationModal';
import { useNavigate } from "react-router-dom";

const ListLearningTopicsPage: React.FC = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem('session')
  let session = null
  if (sessionData != null){
      session = JSON.parse(sessionData);
      apiKey = session.token
  }

  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<string>('jml_mahasiswa');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [totalPages,setTotalPages]= useState<number>(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handlePageChange = (page: number) => {
    fetchDataTopik(page,searchQuery, orderBy, order)
  };

  const handleRequestSort = (property: string) => {
    const isAscending = orderBy === property && order === 'asc';
    setOrder(isAscending ? 'desc' : 'asc');
    setOrderBy(property);
    fetchDataTopik(currentPage, searchQuery, property, isAscending ? 'desc' : 'asc')
  };

  const handleTogglePublish = (id: string) => {
    publishTopik(id);
  };

  const handleDelete = (id: string) => {
    setShowConfirmation(true);
    setTopicToDelete(id);
  };

  const handleAddTopic = () => {
    navigate('/Topic-Detail');
  };

  const handleEditTopic = (id:string) => {
    navigate(`/Topic-Detail=${id}`);
  };

  const confirmDelete = () => {
    if (topicToDelete !== null) {
      deleteDataTopik(topicToDelete)
      setShowConfirmation(false);
      setTopicToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmation(false);
    setTopicToDelete(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); 
    fetchDataTopik(1, e.target.value, orderBy, order);
  };

  // --- Fetch topik pembelajaran dari backend ---
  const fetchDataTopik = async (page:number, keyword:string, orderBy:string, asc:string) => {
    setCurrentPage(page);
    setSearchQuery(keyword);

    // endpoint topik pembelajaran (backend)
    const url = `${apiUrl}/topik-pembelajaran`;

    try {
      const response = await fetch(url, {
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
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json(); // diasumsikan array topik
      // map sesuai interface LearningTopic
      const temp: LearningTopic[] = (data || []).map((t:any) => ({
        id: t.id_topik ?? t.ms_id_topik,
        name: t.nama_topik ?? t.ms_nama_topik,
        description: t.deskripsi_topik ?? t.ms_deskripsi_topik ?? '',
        studentCount: t.jml_mahasiswa ?? 0,
        status: (t.status_tayang === 1 || t.status === 'P') ? 'P' : 'D'
      }));

      setTopics(temp);
      setTotalPages(1); // backend belum paging — ubah nanti jika backend tambahkan paging
    } catch (error) {
      console.error('Error fetching topik pembelajaran:', error);
      setTopics([]);
    }
  };

  const publishTopik = async (id:string) => {
    try {
      let param = { id_topik: id }
      // gunakan endpoint topik pembelajaran publish/takedown jika tersedia
      const response = await fetch(`${apiUrl}/topik-pembelajaran/publish`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body:JSON.stringify(param)
      });

      if (!response.ok) {
        if (response.status === 403) navigate('/error');
        else {
          const d = await response.json().catch(()=>null);
          setErrorMessage(d?.message || 'Gagal publish topik');
          setTimeout(()=>setErrorMessage(''), 3000);
        }
      } else {
        fetchDataTopik(currentPage,searchQuery,orderBy, order)
      }
    } catch (error) {
      console.error('Error publish:', error);
    }
  };

  const deleteDataTopik = async (id:string) => {
    try {
      let param = { id_topik: id }
      const response = await fetch(`${apiUrl}/topik/deleteTopik`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body:JSON.stringify(param)
      });

      if (!response.ok) {
        if (response.status === 403) navigate('/error');
        else if (response.status === 500) {
          const data = await response.json();
          setErrorMessage(`${data.message}`);
          setTimeout(() => setErrorMessage(''), 3000);
        }
      } else {
        setInfoMessage("Topik berhasil dihapus.");
        setTimeout(() => setInfoMessage(''), 3000);
        fetchDataTopik(currentPage, searchQuery, orderBy,order);
      }
    } catch (error) {
      console.error('Error delete topik:', error);
    }
  };

  useEffect(() => {
    if (session != null){
      if (session.login_type !== "teacher"){
        navigate("/dashboard-student")
      }else{
        fetchDataTopik(1,searchQuery,orderBy, order)
      }
    }else{
      navigate("/login")
    }
    
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsSidebarOpen(event.matches);
    };

    setIsSidebarOpen(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaQueryChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row w-screen lg:w-screen">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 overflow-x-auto`}>
        <div className="w-full bg-white p-4 shadow mb-6">
          <div className="max-w-screen-xl mx-auto">
            <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
              Kelola Data Topik Pembelajaran
            </h1>
            <div className="flex flex-row justify-between items-center space-y-0 gap-4">
              <div className="relative w-full md:w-1/2">
                <input
                  type="text"
                  placeholder="Search or type"
                  value={searchQuery}
                  onChange={handleSearchChange} 
                  className="w-full p-2 pl-10 border text-sm border-gray-300 rounded-md"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button 
               className="flex items-center justify-center text-sm bg-blue-800 text-white py-2 px-3 md:px-4 lg:px-5 rounded hover:bg-blue-700"
                onClick={handleAddTopic}
              >
                <FaPlus className="mr-0 md:mr-2" />
                <span className="hidden md:inline">Tambah Topik Pembelajaran</span>
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-screen scroll-auto p-4 md:p-6 ">
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            {infoMessage && <div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">{infoMessage}</div>}
            {errorMessage && <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{errorMessage}</div>}
            {topics.length === 0 ? (
              <div className="p-4 text-center text-red-500">Data tidak ditemukan</div>
            ) : (
              <LearningTopicTable
                topics={topics}
                orderBy={orderBy}
                order={order}
                onSort={handleRequestSort}
                onTogglePublish={handleTogglePublish}
                onDelete={handleDelete}
                onEdit={handleEditTopic}
              />
            )}
          </div>
          <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </div>

      {showConfirmation && (
        <ConfirmationModal 
          message="Apakah Anda yakin ingin menghapus topik ini?" 
          onConfirm={confirmDelete} 
          onCancel={cancelDelete} 
          isSidebarOpen={isSidebarOpen}
        />
      )}
    </div>
  );
};

export default ListLearningTopicsPage;