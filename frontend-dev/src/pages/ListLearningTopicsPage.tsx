import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import Sidebar from '../components/custom/Sidebar';
import Pagination from '@/components/custom/Pagination';
import LearningTopicTable, { LearningTopic } from '../components/custom/LearningTopicTable';
// import ConfirmationModal from '../components/custom/ConfirmationModal'; <--- GAK PERLU INI LAGI
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
  
  // State buat handle konfirmasi dinamis
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'publish' | 'unpublish' | null>(null);

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

  // Handler tombol
  const handleTogglePublish = (id: string) => {
    setSelectedTopicId(id);
    setActionType('publish');
    setShowConfirmation(true);
  };

  const handleToggleTakedown = (id: string) => {
    setSelectedTopicId(id);
    setActionType('unpublish');
    setShowConfirmation(true);
  };

  const handleDelete = (id: string) => {
    setSelectedTopicId(id);
    setActionType('delete');
    setShowConfirmation(true);
  };

  const handleAddTopic = () => {
    navigate('/Topic-Detail');
  };

  const handleEditTopic = (id:string) => {
    navigate(`/Topic-Detail?id_topik=${encodeURIComponent(id)}`);
  };

  // Logic konfirmasi pusat
  const handleConfirmAction = () => {
    if (selectedTopicId !== null && actionType !== null) {
      if (actionType === 'publish') {
        publishTopik(selectedTopicId);
      } else if (actionType === 'unpublish') {
        takedownTopik(selectedTopicId);
      } else if (actionType === 'delete') {
        deleteDataTopik(selectedTopicId);
      }
      closeModal();
    }
  };

  const closeModal = () => {
    setShowConfirmation(false);
    setSelectedTopicId(null);
    setActionType(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    fetchDataTopik(1, e.target.value, orderBy, order);
  };

  // --- API CALLS ---
  const fetchDataTopik = async (page:number, keyword:string, orderBy:string, asc:string) => {
    setCurrentPage(page);
    setSearchQuery(keyword);

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

      const data = await response.json(); 
      const temp: LearningTopic[] = (data || []).map((t:any) => ({
        id: t.id_topik ?? t.ms_id_topik,
        name: t.nama_topik ?? t.ms_nama_topik,
        description: t.deskripsi_topik ?? t.ms_deskripsi_topik ?? '',
        studentCount: t.jml_mahasiswa ?? 0,
        status: (t.status_tayang === 1 || t.status === 'P') ? 'P' : 'D'
      }));

      setTopics(temp);
      setTotalPages(1); 
    } catch (error) {
      console.error('Error fetching topik pembelajaran:', error);
      setTopics([]);
      setErrorMessage('Gagal mengambil data topik');
      setTimeout(()=>setErrorMessage(''), 3000);
    }
  };

  const publishTopik = async (id:string) => {
    try {
      const url = `${apiUrl}/topik-pembelajaran/publish?id_topik=${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        method: 'PUT',
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
          const d = await response.json().catch(()=>null);
          setErrorMessage(d?.detail || d?.message || 'Gagal publish topik');
          setTimeout(()=>setErrorMessage(''), 3500);
          return;
        }
      }

      setInfoMessage('Topik berhasil dipublish');
      setTimeout(()=>setInfoMessage(''), 2000);
      fetchDataTopik(currentPage,searchQuery,orderBy, order)
    } catch (error) {
      console.error('Error publish:', error);
      setErrorMessage('Terjadi kesalahan saat publish');
      setTimeout(()=>setErrorMessage(''), 3000);
    }
  };

  const takedownTopik = async (id:string) => {
    try {
      const url = `${apiUrl}/topik-pembelajaran/takedown?id_topik=${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          navigate('/error');
          return;
        } else if (response.status === 400) {
          const d = await response.json().catch(()=>null);
          setErrorMessage(d?.detail || d?.message || 'Tidak bisa take down topik');
          setTimeout(()=>setErrorMessage(''), 4000);
          return;
        } else {
          const d = await response.json().catch(()=>null);
          setErrorMessage(d?.detail || d?.message || `Gagal takedown (status ${response.status})`);
          setTimeout(()=>setErrorMessage(''), 3500);
          return;
        }
      }

      setInfoMessage('Topik berhasil di-takedown');
      setTimeout(()=>setInfoMessage(''), 2000);
      fetchDataTopik(currentPage,searchQuery,orderBy, order)
    } catch (error) {
      console.error('Error takedown:', error);
      setErrorMessage('Terjadi kesalahan saat takedown');
      setTimeout(()=>setErrorMessage(''), 3000);
    }
  };

  const deleteDataTopik = async (id: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/topik-pembelajaran?id_topik=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.detail || "Gagal menghapus topik.");
        setTimeout(() => setErrorMessage(""), 3000);
        return;
      }

      setInfoMessage("Topik berhasil dihapus.");
      setTimeout(() => setInfoMessage(""), 3000);
      fetchDataTopik(currentPage, searchQuery, orderBy, order);
    } catch (error) {
      console.error(error);
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

  // --- VARIABEL DINAMIS BUAT MODAL & TOMBOL ---
  let modalTitle = '';
  let modalMessage = '';
  let confirmBtnText = '';
  let confirmBtnColor = '';

  if (actionType === 'publish') {
    modalTitle = 'Konfirmasi Publish';
    modalMessage = 'Apakah Anda yakin ingin mem-publish topik ini?';
    confirmBtnText = 'Publish';
    confirmBtnColor = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  } else if (actionType === 'unpublish') {
    modalTitle = 'Konfirmasi Unpublish';
    modalMessage = 'Apakah Anda yakin ingin men-takedown (unpublish) topik ini?';
    confirmBtnText = 'Unpublish';
    confirmBtnColor = 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
  } else {
    modalTitle = 'Konfirmasi Hapus';
    modalMessage = 'Apakah Anda yakin ingin menghapus topik ini?';
    confirmBtnText = 'Hapus';
    confirmBtnColor = 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
  }

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
                onToggleTakedown={handleToggleTakedown}
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

      {/* --- INI MODAL MANUAL YANG UDAH DI-EMBED --- */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {modalTitle}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {modalMessage}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${confirmBtnColor}`}
                onClick={handleConfirmAction}
              >
                {confirmBtnText}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={closeModal}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------- */}
    </div>
  );
};

export default ListLearningTopicsPage;

// import React, { useState, useEffect } from 'react';
// import { FaSearch, FaPlus } from 'react-icons/fa';
// import Sidebar from '../components/custom/Sidebar';
// import Pagination from '@/components/custom/Pagination';
// import LearningTopicTable, { LearningTopic } from '../components/custom/LearningTopicTable';
// import ConfirmationModal from '../components/custom/ConfirmationModal';
// import { useNavigate } from "react-router-dom";

// const ListLearningTopicsPage: React.FC = () => {
//   const apiUrl = import.meta.env.VITE_API_URL;
//   let apiKey = import.meta.env.VITE_API_KEY;
//   const sessionData = localStorage.getItem('session')
//   let session = null
//   if (sessionData != null){
//       session = JSON.parse(sessionData);
//       apiKey = session.token
//   }

//   const [topics, setTopics] = useState<LearningTopic[]>([]);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [searchQuery, setSearchQuery] = useState<string>('');
//   const [currentPage, setCurrentPage] = useState<number>(1);
//   const [order, setOrder] = useState<'asc' | 'desc'>('asc');
//   const [orderBy, setOrderBy] = useState<string>('jml_mahasiswa');
//   const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
//   const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
//   const [infoMessage, setInfoMessage] = useState<string>('');
//   const [errorMessage, setErrorMessage] = useState<string>('');
//   const [totalPages,setTotalPages]= useState<number>(1);
//   const itemsPerPage = 10;
//   const navigate = useNavigate();

//   const toggleSidebar = () => {
//     setIsSidebarOpen(!isSidebarOpen);
//   };

//   const handlePageChange = (page: number) => {
//     fetchDataTopik(page,searchQuery, orderBy, order)
//   };

//   const handleRequestSort = (property: string) => {
//     const isAscending = orderBy === property && order === 'asc';
//     setOrder(isAscending ? 'desc' : 'asc');
//     setOrderBy(property);
//     fetchDataTopik(currentPage, searchQuery, property, isAscending ? 'desc' : 'asc')
//   };

//   const handleTogglePublish = (id: string) => {
//     publishTopik(id);
//   };

//   const handleToggleTakedown = (id: string) => {
//     takedownTopik(id);
//   };

//   const handleDelete = (id: string) => {
//     setShowConfirmation(true);
//     setTopicToDelete(id);
//   };

//   const handleAddTopic = () => {
//     navigate('/Topic-Detail');
//   };

//   const handleEditTopic = (id:string) => {
//     // buka halaman detail/edit dengan query param id_topik
//     navigate(`/Topic-Detail?id_topik=${encodeURIComponent(id)}`);
//   };

//   const confirmDelete = () => {
//     if (topicToDelete !== null) {
//       deleteDataTopik(topicToDelete)
//       setShowConfirmation(false);
//       setTopicToDelete(null);
//     }
//   };

//   const cancelDelete = () => {
//     setShowConfirmation(false);
//     setTopicToDelete(null);
//   };

//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchQuery(e.target.value);
//     setCurrentPage(1);
//     fetchDataTopik(1, e.target.value, orderBy, order);
//   };

//   // --- Fetch topik pembelajaran dari backend ---
//   const fetchDataTopik = async (page:number, keyword:string, orderBy:string, asc:string) => {
//     setCurrentPage(page);
//     setSearchQuery(keyword);

//     const url = `${apiUrl}/topik-pembelajaran`;

//     try {
//       const response = await fetch(url, {
//         method: 'GET',
//         headers: {
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${apiKey}`
//         }
//       });

//       if (!response.ok) {
//         if (response.status === 403) {
//           navigate('/error');
//           return;
//         } else {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//       }

//       const data = await response.json(); // diasumsikan array topik
//       const temp: LearningTopic[] = (data || []).map((t:any) => ({
//         id: t.id_topik ?? t.ms_id_topik,
//         name: t.nama_topik ?? t.ms_nama_topik,
//         description: t.deskripsi_topik ?? t.ms_deskripsi_topik ?? '',
//         studentCount: t.jml_mahasiswa ?? 0,
//         status: (t.status_tayang === 1 || t.status === 'P') ? 'P' : 'D'
//       }));

//       setTopics(temp);
//       setTotalPages(1); // backend belum paging — ubah nanti jika backend tambahkan paging
//     } catch (error) {
//       console.error('Error fetching topik pembelajaran:', error);
//       setTopics([]);
//       setErrorMessage('Gagal mengambil data topik');
//       setTimeout(()=>setErrorMessage(''), 3000);
//     }
//   };

//   // --- Publish (menggunakan query param sesuai backend) ---
//   const publishTopik = async (id:string) => {
//     try {
//       const url = `${apiUrl}/topik-pembelajaran/publish?id_topik=${encodeURIComponent(id)}`;
//       const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${apiKey}`
//         }
//       });

//       if (!response.ok) {
//         if (response.status === 403) {
//           navigate('/error');
//           return;
//         } else {
//           const d = await response.json().catch(()=>null);
//           setErrorMessage(d?.detail || d?.message || 'Gagal publish topik');
//           setTimeout(()=>setErrorMessage(''), 3500);
//           return;
//         }
//       }

//       setInfoMessage('Topik berhasil dipublish');
//       setTimeout(()=>setInfoMessage(''), 2000);
//       fetchDataTopik(currentPage,searchQuery,orderBy, order)
//     } catch (error) {
//       console.error('Error publish:', error);
//       setErrorMessage('Terjadi kesalahan saat publish');
//       setTimeout(()=>setErrorMessage(''), 3000);
//     }
//   };

//   // --- Takedown (menggunakan query param sesuai backend) ---
//   const takedownTopik = async (id:string) => {
//     try {
//       const url = `${apiUrl}/topik-pembelajaran/takedown?id_topik=${encodeURIComponent(id)}`;
//       const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${apiKey}`
//         }
//       });

//       if (!response.ok) {
//         if (response.status === 403) {
//           navigate('/error');
//           return;
//         } else if (response.status === 400) {
//           // backend mengembalikan detail kalau tidak bisa di-takedown
//           const d = await response.json().catch(()=>null);
//           setErrorMessage(d?.detail || d?.message || 'Tidak bisa take down topik');
//           setTimeout(()=>setErrorMessage(''), 4000);
//           return;
//         } else {
//           const d = await response.json().catch(()=>null);
//           setErrorMessage(d?.detail || d?.message || `Gagal takedown (status ${response.status})`);
//           setTimeout(()=>setErrorMessage(''), 3500);
//           return;
//         }
//       }

//       setInfoMessage('Topik berhasil di-takedown');
//       setTimeout(()=>setInfoMessage(''), 2000);
//       fetchDataTopik(currentPage,searchQuery,orderBy, order)
//     } catch (error) {
//       console.error('Error takedown:', error);
//       setErrorMessage('Terjadi kesalahan saat takedown');
//       setTimeout(()=>setErrorMessage(''), 3000);
//     }
//   };

//   const deleteDataTopik = async (id: string) => {
//     try {
//       const response = await fetch(
//         `${apiUrl}/topik-pembelajaran?id_topik=${encodeURIComponent(id)}`,
//         {
//           method: "DELETE",
//           headers: {
//             Accept: "application/json",
//             Authorization: `Bearer ${apiKey}`,
//           },
//         }
//       );

//       if (!response.ok) {
//         const data = await response.json().catch(() => null);
//         setErrorMessage(data?.detail || "Gagal menghapus topik.");
//         setTimeout(() => setErrorMessage(""), 3000);
//         return;
//       }

//       setInfoMessage("Topik berhasil dihapus.");
//       setTimeout(() => setInfoMessage(""), 3000);
//       fetchDataTopik(currentPage, searchQuery, orderBy, order);
//     } catch (error) {
//       console.error(error);
//     }
//   };


//   useEffect(() => {
//     if (session != null){
//       if (session.login_type !== "teacher"){
//         navigate("/dashboard-student")
//       }else{
//         fetchDataTopik(1,searchQuery,orderBy, order)
//       }
//     }else{
//       navigate("/login")
//     }

//     const mediaQuery = window.matchMedia("(min-width: 768px)");
//     const handleMediaQueryChange = (event: MediaQueryListEvent) => {
//       setIsSidebarOpen(event.matches);
//     };

//     setIsSidebarOpen(mediaQuery.matches);
//     mediaQuery.addEventListener("change", handleMediaQueryChange);
//     return () => {
//       mediaQuery.removeEventListener("change", handleMediaQueryChange);
//     };
//   }, []);

//   return (
//     <div className="flex flex-col lg:flex-row w-screen lg:w-screen">
//       <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
//       <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 overflow-x-auto`}>
//         <div className="w-full bg-white p-4 shadow mb-6">
//           <div className="max-w-screen-xl mx-auto">
//             <h1 className="lg:text-2xl text-xl font-bold text-blue-800 mb-6 mt-4">
//               Kelola Data Topik Pembelajaran
//             </h1>
//             <div className="flex flex-row justify-between items-center space-y-0 gap-4">
//               <div className="relative w-full md:w-1/2">
//                 <input
//                   type="text"
//                   placeholder="Search or type"
//                   value={searchQuery}
//                   onChange={handleSearchChange}
//                   className="w-full p-2 pl-10 border text-sm border-gray-300 rounded-md"
//                 />
//                 <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//               </div>
//               <button
//                className="flex items-center justify-center text-sm bg-blue-800 text-white py-2 px-3 md:px-4 lg:px-5 rounded hover:bg-blue-700"
//                 onClick={handleAddTopic}
//               >
//                 <FaPlus className="mr-0 md:mr-2" />
//                 <span className="hidden md:inline">Tambah Topik Pembelajaran</span>
//               </button>
//             </div>
//           </div>
//         </div>

//         <div className="min-h-screen scroll-auto p-4 md:p-6 ">
//           <div className="bg-white shadow-md rounded-lg overflow-x-auto">
//             {infoMessage && <div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">{infoMessage}</div>}
//             {errorMessage && <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{errorMessage}</div>}
//             {topics.length === 0 ? (
//               <div className="p-4 text-center text-red-500">Data tidak ditemukan</div>
//             ) : (
//               <LearningTopicTable
//                 topics={topics}
//                 orderBy={orderBy}
//                 order={order}
//                 onSort={handleRequestSort}
//                 onTogglePublish={handleTogglePublish}
//                 onToggleTakedown={handleToggleTakedown}
//                 onDelete={handleDelete}
//                 onEdit={handleEditTopic}
//               />
//             )}
//           </div>
//           <div className="flex justify-center items-center py-4 text-xs lg:text-sm">
//             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
//           </div>
//         </div>
//       </div>

//       {showConfirmation && (
//         <ConfirmationModal
//           message="Apakah Anda yakin ingin menghapus topik ini?"
//           onConfirm={confirmDelete}
//           onCancel={cancelDelete}
//           isSidebarOpen={isSidebarOpen}
//         />
//       )}
//     </div>
//   );
// };

// export default ListLearningTopicsPage;
