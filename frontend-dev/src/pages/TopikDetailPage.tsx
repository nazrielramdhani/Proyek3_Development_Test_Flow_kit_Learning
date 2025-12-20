import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form'; 
import { useNavigate } from 'react-router-dom'; 
import LayoutForm from './LayoutForm'; 
import { Button } from '@/components/ui/button'; 
import SelectMateriDialog from '@/components/custom/SelectMateriDialog';
import ConfirmationModal from '@/components/custom/ConfirmationModal'; 
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from '@/components/ui/form'; 
import { Input } from '@/components/ui/input'; 
import { FaPlus, FaTrash } from 'react-icons/fa';
import { AiFillCaretUp, AiFillCaretDown } from 'react-icons/ai'; 

// ==================================================================================
//                  BAGIAN 1: TYPE DEFINITIONS (Definisi Tipe Data)
// ==================================================================================
interface Materi {
  id: string; 
  name: string; 
  description: string; 
  type: string; 
  nomor_urutan?: number; 
}

// ==================================================================================
//             BAGIAN 2: HELPER FUNCTIONS (Fungsi Pembantu)
// ==================================================================================

const renumber = (list: Materi[]): Materi[] =>
  list.map((m, idx) => ({ 
    ...m, 
    nomor_urutan: idx + 1 
  }));

// ========================================================================================================
// BAGIAN 3: KOMPONEN UTAMA - TopicDetailPage
// ========================================================================================================
const TopicDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = (import.meta.env.VITE_API_URL as string) || '';
  const sessionData = localStorage.getItem('session');
  let apiKey = (import.meta.env.VITE_API_KEY as string) || '';
  let session: any = null; 
  if (sessionData) {
    try {
      session = JSON.parse(sessionData); // Convert string JSON ke object JavaScript
      apiKey = session.token ?? apiKey; // Gunakan token dari session, fallback ke env API key
    } catch {
    }
  }

  const queryParameters = new URLSearchParams(window.location.search);
  const topikId = queryParameters.get('id_topik');

  const [screenName, setScreenName] = useState<string>(
    topikId ? 'Edit Topik Pembelajaran' : 'Tambah Topik Pembelajaran'
  );

  // State untuk kontrol tampilan dialog pemilihan materi
  const [isSelectMateriDialogOpen, setIsSelectMateriDialogOpen] = useState<boolean>(false);

  // State untuk menyimpan daftar materi yang dipilih user
  const [selectedMateri, setSelectedMateri] = useState<Materi[]>([]);

  // State untuk pesan sukses global (ditampilkan di atas form)
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // State untuk pesan error global
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State untuk error khusus validasi materi (misal: materi kosong)
  const [materiError, setMateriError] = useState<string | null>(null);

  // State untuk kontrol modal konfirmasi delete
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  // State untuk menyimpan materi mana yang akan dihapus
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);

  // State untuk pesan sukses operasi pada materi (tambah/hapus/urut)
  const [infoMateriMessage, setInfoMateriMessage] = useState<string | null>(null);

  // State untuk nama topik (digunakan saat membuka dialog pemilihan materi)
  const [topicName, setTopicName] = useState<string>('');

  // useForm adalah hook dari react-hook-form untuk mengelola form
  // mode: 'onBlur' = validasi dijalankan saat user keluar dari input field
  const form = useForm({ mode: 'onBlur' });

  const typeColor = (type: string | undefined) => {
    const t = (type || '').toLowerCase(); // Konversi ke lowercase untuk case-insensitive comparison
    
    switch (t) {
      case 'teks':
      case 'text':
        return 'bg-blue-100 text-blue-700'; 
      case 'pdf':
      case 'dokumen pdf':
      case 'dokumen':
        return 'bg-green-100 text-green-700'; 
      case 'video':
        return 'bg-purple-100 text-purple-700'; 
      default:
        return 'bg-gray-200 text-gray-700'; 
    }
  };

  // Format jenis materi agar konsisten
  const formatType = (type: string | undefined) => {
    const t = (type || '').toLowerCase();
    if (t.includes("pdf") || t.includes("dokumen")) return "Dokumen PDF";
    if (t.includes("video")) return "Video";
    if (t.includes("teks") || t.includes("text")) return "Teks";
    return type || "Tidak Diketahui";
  };

  const handleAddMateri = (materis: Materi[]) => {
    setSelectedMateri(prev => { 
      const merged = [...prev]; 
      
      // Loop setiap materi yang dipilih
      materis.forEach(m => {
        // Cek duplikat: apakah ID sudah ada di merged?
        if (!merged.find(x => x.id === m.id)) {
          // Jika belum ada, tambahkan dengan nomor urutan baru
          merged.push({ 
            ...m, 
            nomor_urutan: merged.length + 1 
          });
        }
      });
      return renumber(merged);
    });
  };

  const handleCancel = () => navigate('/learning-topics');

  const saveMappingMateri = async (id_topik: string, listMateri: Materi[]) => {
    // Transform array Materi menjadi format yang dibutuhkan backend
    const mapping = renumber(listMateri).map(m => ({
      id_materi: m.id,
      nomor_urutan: m.nomor_urutan ?? 1, // Fallback ke 1 jika undefined
    }));

    // Kirim HTTP PUT request ke backend
    const respMap = await fetch(
      `${API_URL}/topik-pembelajaran/${id_topik}/materi/mapping`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json', // Memberitahu server: ini JSON
          Authorization: `Bearer ${apiKey}`, // Token untuk autentikasi
        },
        body: JSON.stringify({ list_materi: mapping }), 
      }
    );

    // Validasi response
    if (!respMap.ok) {
      // Jika gagal, ambil error message dari response body
      const txt = await respMap.text().catch(() => null);
      throw new Error(txt || 'Gagal menyimpan mapping materi');
    }
  };

  /**
   * PARAMETER:
   * @param topik - Object berisi nama_topik & deskripsi_topik
   * @param listMateri - Array materi yang akan di-attach ke topik
   */
  const addDataTopik = async (topik: any, listMateri: Materi[]) => {
    try {
      // Kirim POST request untuk create topik
      const response = await fetch(`${API_URL}/topik-pembelajaran`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(topik),
      });

      // Validasi response
      if (!response.ok) {
        let message = 'Gagal menyimpan topik';

        try {
          const err = await response.json();
          if (typeof err?.detail === 'string') {
            message = err.detail;
          }
        } catch {
          // fallback jika response bukan JSON
        }

        throw new Error(message);
      }

      // Parse response untuk dapatkan id_topik yang baru dibuat
      const data = await response.json();
      const id_topik = data.id_topik;

      // Kirim mapping materi ke topik
      await saveMappingMateri(id_topik, listMateri);

      // Tampilkan pesan sukses
      setInfoMessage('Topik pembelajaran berhasil dibuat');
      
      // Auto-redirect setelah 1.5 detik
      setTimeout(() => {
        setInfoMessage(null); // Clear pesan
        navigate('/learning-topics'); // Redirect
      }, 1500);
      
    } catch (err: any) {
      // Error handling: log ke console & tampilkan ke user
      console.error('addDataTopik error', err);
      setErrorMessage(err?.message || 'Gagal menyimpan topik');
      
      // Auto-hide pesan error setelah 3 detik
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  /**
   * PARAMETER:
   * @param id - ID topik yang akan diupdate
   * @param topik - Data topik baru
   * @param listMateri - Array materi baru (akan replace yang lama)
   */
  const editDataTopik = async (
    id: string,
    topik: any,
    listMateri: Materi[]
  ) => {
    try {
      // Siapkan parameter request
      const param = {
        id_topik: id,
        nama_topik: topik.nama_topik,
        deskripsi_topik: topik.deskripsi_topik,
      };
      
      // Kirim PUT request untuk update topik
      const resp = await fetch(`${API_URL}/topik-pembelajaran`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(param),
      });
      
      // Validasi response
      if (!resp.ok) {
        let message = 'Gagal mengedit topik';

        try {
          const err = await resp.json();
          if (typeof err?.detail === 'string') {
            message = err.detail;
          }
        } catch {}

        throw new Error(message);
      }

      // Replace mapping materi (update semua materi & urutannya)
      await saveMappingMateri(id, listMateri);

      // Tampilkan pesan sukses
      setInfoMessage('Topik berhasil diupdate');
      
      // Auto-redirect setelah 1.5 detik
      setTimeout(() => {
        setInfoMessage(null);
        navigate('/learning-topics');
      }, 1500);
      
    } catch (err: any) {
      // Error handling
      console.error('editDataTopik error', err);
      setErrorMessage(err?.message || 'Gagal mengedit topik');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);
    const ok = await form.trigger();
    
    // Jika validasi gagal (misal nama topik kosong), stop eksekusi
    if (!ok) return;

    // Validasi khusus: topik harus punya minimal 1 materi
    if (selectedMateri.length === 0) {
      setMateriError('Topik setidaknya harus memiliki satu materi!');
      setTimeout(() => setMateriError(null), 2000); // Auto-hide setelah 2 detik
      return;
    }

    // Ambil nilai form
    const dataTopik = {
      nama_topik: form.getValues('namaTopik'),
      deskripsi_topik: form.getValues('deskripsiTopik'),
    };

    // Decision: tambah atau edit?
    if (topikId) {
      // Mode EDIT: ada topikId di URL
      await editDataTopik(topikId, dataTopik, selectedMateri);
    } else {
      // Mode TAMBAH: tidak ada topikId
      await addDataTopik(dataTopik, selectedMateri);
    }
  };

  const fetchDetail = async (id: string) => {
    try {
      const resp = await fetch(`${API_URL}/topik-pembelajaran/${id}/materi`, {
        method: 'GET',
        headers: { 
          Accept: 'application/json', 
          Authorization: `Bearer ${apiKey}` 
        },
      });
      
      const d = await resp.json().catch(() => null);

      const rows =
        d && Array.isArray(d) ? d : d && Array.isArray(d.data) ? d.data : [];

      const mapped: Materi[] = (rows || []).map((m: any, idx: number) => ({
        id: m.id_materi ?? m.ms_id_materi ?? m.id ?? '',
        
        name: m.judul_materi ?? m.ms_nama_modul ?? m.judul ?? m.name ?? '',
        
        description:
          m.deskripsi_materi ??
          m.ms_deskripsi_modul ??
          m.deskripsi ??
          m.description ??
          '',
        
        type: m.jenis_materi ?? m.type ?? 'default',
        nomor_urutan:
          m.nomor_urutan !== undefined && m.nomor_urutan !== null
            ? Number(m.nomor_urutan)
            : idx + 1,
      }));

      mapped.sort(
        (a, b) => (a.nomor_urutan ?? 0) - (b.nomor_urutan ?? 0)
      );
      
      setSelectedMateri(renumber(mapped));

      const respTopik = await fetch(`${API_URL}/topik-pembelajaran`, {
        method: 'GET',
        headers: { 
          Accept: 'application/json', 
          Authorization: `Bearer ${apiKey}` 
        },
      });
      
      const arr = await respTopik.json().catch(() => []);
      const found = (arr || []).find(
        (t: any) => (t.id_topik ?? t.ms_id_topik) === id
      );

      if (found) {
        form.setValue(
          'namaTopik',
          found.nama_topik ?? found.ms_nama_topik ?? ''
        );
        form.setValue(
          'deskripsiTopik',
          found.deskripsi_topik ?? found.ms_deskripsi_topik ?? ''
        );
        
        setTopicName(found.nama_topik ?? found.ms_nama_topik ?? '');
      }
    } catch (err) {
      console.error('fetchDetail error', err);
    }
  };

  const handleDeleteMateri = (m: Materi) => {
    setShowConfirmation(true); 
    setMateriToDelete(m); 
  };

  const confirmDelete = () => {
    if (materiToDelete) {
      setSelectedMateri(prev =>
        renumber(prev.filter(x => x.id !== materiToDelete.id))
      );
      setInfoMateriMessage('Materi berhasil dihapus dari topik');
      setShowConfirmation(false);
      setMateriToDelete(null);
      setTimeout(() => setInfoMateriMessage(null), 2000);
    }
  };

  const cancelDelete = () => {
    setShowConfirmation(false);
    setMateriToDelete(null);
  };

  useEffect(() => {
    if (!session) {
      navigate('/login');
    } 
    else if (session.login_type !== 'teacher') {
      // Jika bukan teacher, redirect ke dashboard student
      navigate('/dashboard-student');
    } 
    else {
      // Jika ada topikId (mode edit), load data
      if (topikId) {
        fetchDetail(topikId);
      }
    }
  }, [topikId]); 

  const moveUp = (index: number) => {
    if (index <= 0) return;
    
    setSelectedMateri(prev => {
      const arr = [...prev];
      
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      
      return renumber(arr);
    });
  };

  const moveDown = (index: number) => {
    setSelectedMateri(prev => {
    if (index >= prev.length - 1) return prev;
      const arr = [...prev]; 
      
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      
      return renumber(arr);
    });
  };

  return (
<LayoutForm screenName={screenName}>
  {/* ============================================ */}
  {/* SECTION 1: Global Messages (Alert Boxes)    */}
  {/* ============================================ */}
  
  {/* Pesan sukses global - tampil saat infoMessage tidak null */}
  {infoMessage && (
    <div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">
      {infoMessage}
    </div>
  )}

  {/* Pesan error global - tampil saat errorMessage tidak null */}
  {errorMessage && (
    <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">
      {errorMessage}
    </div>
  )}

  {/* Pesan error validasi materi - tampil saat materiError tidak null */}
  {materiError && (
    <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">
      {materiError}
    </div>
  )}

  {/* Container utama dengan full screen */}
  <div className="flex flex-col w-screen min-h-screen p-6">
    
    {/* ============================================ */}
    {/* SECTION 2: Form Topik (Nama & Deskripsi)    */}
    {/* ============================================ */}
    
    {/* Form wrapper dari react-hook-form */}
    {/* Spread operator {...form} untuk pass semua method form ke Form component */}
    <Form {...form}>
      <form className="space-y-6">
        {/* Card putih dengan shadow untuk form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          
          {/* =================== FIELD 1: Nama Topik =================== */}
          <div className="flex items-start mb-4">
            <FormField
              control={form.control} // Controller dari react-hook-form
              name="namaTopik" // Nama field (untuk getValue/setValue)
              
              // Rules validasi
              rules={{
                required: 'Nama Topik harus diisi!', // Validasi wajib diisi
                maxLength: {
                  value: 255, // Maksimal 255 karakter
                  message: 'Nama Topik terlalu panjang',
                },
              }}
              
              // Render prop pattern: function yang return JSX
              render={({ field, fieldState: { error } }) => (
                <FormItem className="flex items-center w-full">
                  
                  {/* Label dengan tanda bintang merah (required) */}
                  <FormLabel className="text-gray-700 font-bold text-sm lg:text-base w-1/4">
                    Nama Topik <span className="text-red-500">*</span>
                  </FormLabel>
                  
                  {/* Separator titik dua */}
                  <div className="w-1/12 text-center">:</div>
                  
                  {/* Input field */}
                  <FormControl className="flex-1">
                    <div>
                      <Input
                        {...field} // Spread field props (value, onChange, onBlur, dll)
                        id="nama-topik"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50"
                        
                        // Custom onChange: update field value & topicName state
                        onChange={e => {
                          field.onChange(e); // Update form value
                          setTopicName(e.target.value); // Update state lokal
                        }}
                      />
                      
                      {/* Error message - tampil jika ada error validasi */}
                      {error && (
                        <p className="text-red-600 text-xs mt-1">
                          {error.message}
                        </p>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* =================== FIELD 2: Deskripsi Topik =================== */}
          <div className="flex items-start">
            <FormField
              control={form.control}
              name="deskripsiTopik"
              // No rules = field ini opsional (tidak wajib diisi)
              
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  
                  {/* Label tanpa tanda bintang (opsional) */}
                  <FormLabel className="text-gray-700 font-bold text-sm lg:text-base w-1/4">
                    Deskripsi Topik
                  </FormLabel>
                  
                  {/* Separator */}
                  <div className="w-1/12 text-center">:</div>
                  
                  {/* Textarea untuk deskripsi panjang */}
                  <FormControl className="flex-1">
                    <textarea
                      {...field} // Spread field props
                      id="deskripsi-topik"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50"
                      rows={4} // Tinggi textarea: 4 baris
                    ></textarea>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>

    {/* ============================================ */}
    {/* SECTION 3: Daftar Materi Pembelajaran       */}
    {/* ============================================ */}
    
    <div className="bg-white rounded-lg shadow-md p-6">
      
      {/* Header: Judul + Tombol Tambah */}
      <div className="flex justify-between items-center mb-3">
        {/* Judul dengan tanda bintang (minimal 1 materi required) */}
        <h2 className="text-gray-700 text-base lg:text-lg font-bold">
          Daftar Materi Pembelajaran <span className="text-red-500">*</span>
        </h2>
        
        {/* Tombol tambah materi (buka dialog) */}
        <Button
          className="text-white bg-blue-800 px-3 py-2 shadow hover:bg-blue-700 rounded-full"
          onClick={() => setIsSelectMateriDialogOpen(true)} // Buka dialog
        >
          <FaPlus /> {/* Icon plus */}
        </Button>
      </div>

      {/* Pesan info untuk operasi materi (tambah/hapus/urut) */}
      {infoMateriMessage && (
        <div className="p-2 mb-3 text-green-500 bg-green-100 rounded-md">
          {infoMateriMessage}
        </div>
      )}

      {/* =================== TABEL MATERI =================== */}
      {/* Wrapper untuk responsive table (scroll horizontal di mobile) */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg shadow-md text-xs lg:text-sm">
          
          {/* Table Header */}
          <thead>
            <tr className="bg-blue-800 text-white">
              {/* 
                PROPORSI KOLOM:
                - No: 5%
                - Nama Materi: 25%
                - Deskripsi: 45% (kolom terbesar untuk konten panjang)
                - Jenis Materi: 15%
                - Action: 10%
                Total: 100%
              */}
              <th className="py-3 px-2 md:px-6 border w-[5%]">No</th>
              <th className="py-3 px-2 md:px-6 border w-[25%]">Nama Materi</th>
              <th className="py-3 px-2 md:px-6 border w-[45%]">Deskripsi</th>
              <th className="py-3 px-2 md:px-6 border w-[15%]">Jenis Materi</th>
              <th className="py-3 px-2 md:px-6 border w-[10%]">Action</th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody>
            {/* Conditional rendering: jika tidak ada materi, tampilkan pesan */}
            {selectedMateri.length === 0 ? (
              <tr>
                <td
                  colSpan={5} // Merge 5 kolom
                  className="py-6 text-center text-gray-500"
                >
                  Belum ada materi
                </td>
              </tr>
            ) : (
              /* Jika ada materi, map ke table rows */
              selectedMateri.map((m: Materi, index: number) => (
                <tr
                  key={m.id || index} // Key untuk React reconciliation (prefer ID, fallback index)
                  
                  // Alternating row colors (zebra striping)
                  className={`${
                    index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  {/* Kolom 1: Nomor Urut */}
                  <td className="py-3 px-2 md:px-6 border text-center">
                    {index + 1} {/* Display: 1, 2, 3, ... */}
                  </td>
                  
                  {/* Kolom 2: Nama Materi */}
                  <td className="py-3 px-2 md:px-6 border">
                    {m.name ?? '-'} {/* Nullish coalescing: jika null/undefined, tampilkan '-' */}
                  </td>
                  
                  {/* Kolom 3: Deskripsi (kolom terlebar) */}
                  <td className="py-3 px-2 md:px-6 border">
                    {m.description ?? '-'}
                  </td>

                  {/* Kolom 4: Jenis Materi dengan Badge */}
                  <td className="py-3 px-2 md:px-6 border text-center">
                    <span
                      // Dynamic class berdasarkan jenis materi
                      className={`px-3 py-1 rounded-md text-xs font-semibold ${typeColor(
                        m.type
                      )}`}
                    >
                      {formatType(m.type)}
                    </span>
                  </td>

                  {/* Kolom 5: Action Buttons (Urut & Hapus) */}
                  <td className="py-3 px-2 md:px-6 border">
                    <div className="flex justify-center items-center space-x-2">
                      
                      {/* Group button untuk urut naik/turun */}
                      <div className="flex flex-col items-center bg-transparent">
                        
                        {/* Button Naik - hanya tampil jika bukan item pertama */}
                        {index > 0 && (
                          <Button
                            onClick={() => moveUp(index)}
                            className="text-blue-600 bg-transparent p-0 h-auto"
                          >
                            <AiFillCaretUp /> {/* Icon panah atas */}
                          </Button>
                        )}
                        
                        {/* Button Turun - hanya tampil jika bukan item terakhir */}
                        {index < selectedMateri.length - 1 && (
                          <Button
                            onClick={() => moveDown(index)}
                            className="text-blue-600 bg-transparent p-0 h-auto"
                          >
                            <AiFillCaretDown /> {/* Icon panah bawah */}
                          </Button>
                        )}
                      </div>
                      
                      {/* Button Hapus */}
                      <Button
                        onClick={() => handleDeleteMateri(m)}
                        className="text-red-600 self-center bg-transparent p-0 h-auto"
                      >
                        <FaTrash /> {/* Icon trash/sampah */}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note: minimal 1 materi required */}
      <p className="text-gray-500 text-xs lg:text-sm mt-1 pt-6 lg:pt-8">
        * Harus terdapat setidaknya 1 materi
      </p>
    </div>

    {/* ============================================ */}
    {/* SECTION 4: Action Buttons (Batal & Simpan)  */}
    {/* ============================================ */}
    
    <div className="flex justify-end mt-6">
      {/* Button Batal - outline style */}
      <Button
        onClick={handleCancel}
        className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100"
      >
        Batal
      </Button>
      
      {/* Button Simpan - outline style */}
      <Button
        onClick={handleSave}
        className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100"
      >
        Simpan
      </Button>
    </div>
  </div>

  {/* ============================================ */}
  {/* SECTION 5: Modals & Dialogs                 */}
  {/* ============================================ */}
  
  {/* Dialog Pemilihan Materi */}
  {/* Komunikasi parent-child via props */}
  <SelectMateriDialog
    isDialogOpen={isSelectMateriDialogOpen} // State: dialog open/close
    setIsDialogOpen={setIsSelectMateriDialogOpen} // Function untuk toggle dialog
    onAddMateri={handleAddMateri} // Callback saat user pilih materi
    selectedMateri={selectedMateri} // Materi yang sudah dipilih (untuk disable di dialog)
    topicName={topicName} // Nama topik (ditampilkan di header dialog)
  />

  {/* Modal Konfirmasi Hapus Materi */}
  {/* Conditional rendering: hanya tampil jika showConfirmation = true */}
  {showConfirmation && (
    <ConfirmationModal
      message="Apakah Anda yakin ingin menghapus materi ini?" // Pesan konfirmasi
      onConfirm={confirmDelete} // Callback saat user klik "Ya"
      onCancel={cancelDelete} // Callback saat user klik "Tidak"
    />
  )}
</LayoutForm>
);
};
// Export component agar bisa diimport di file lain
export default TopicDetailPage;

