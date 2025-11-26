// src/pages/TopicDetailPage.tsx
import React, { useState, useEffect } from 'react';
import LayoutForm from './LayoutForm';
import { Button } from "@/components/ui/button";
import SelectMateriDialog from '@/components/custom/SelectMateriDialog';
import ConfirmationModal from '../components/custom/ConfirmationModal';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { AiFillCaretUp, AiFillCaretDown } from 'react-icons/ai';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

// ---------------------------------
//         TYPE DEFINITION
// ---------------------------------
interface Materi {
  id: string;
  name: string;
  description: string;
  type: string;
  nomor_urutan?: number; // urutan di dalam topik 
}

// -------------------------------------
//      KOMPONEN UTAMA HALAMAN
// Komponen ini menangani : 
// - pembuatan / edit topik pemelajaran
// - pemilihan dan pengurutan materi
// - menghapus materi dari topik
// -------------------------------------
const TopicDetailPage: React.FC = () => {
  // Router navigation
  const navigate = useNavigate();

  // API base URL & authorization key
  const apiUrl = import.meta.env.VITE_API_URL;
  // Ambil token dari session LocalStorage jika ada, fallback ke evn API key
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem('session')
  let session = null
  if (sessionData != null){
      session = JSON.parse(sessionData);
      apiKey = session.token
  }

  // Amil query param id_topik (jika edit)
  const queryParameters = new URLSearchParams(window.location.search)
  const topikId = queryParameters.get("id_topik");

  // ---------------------------------
  //           STATE LOKAL 
  // ---------------------------------
  const [screenName, setScreenName] = useState(topikId ? "Edit Topik Pembelajaran" : "Tambah Topik Pembelajaran");
  const [isSelectMateriDialogOpen, setIsSelectMateriDialogOpen] = useState(false);
  const [selectedMateri, setSelectedMateri] = useState<Materi[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null); // pesan sukses global 
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // pesan error global
  const [materiError, setMateriError] = useState<string | null>(null); // error khusus materi kosong
  const [showConfirmation, setShowConfirmation] = useState(false); // konfirmasi hapus
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [infoMateriMessage, setInfoMateriMessage] = useState<string | null>(null); // pesan sukses pada operasi materi
  const [topicName, setTopicName] = useState<string>(""); // nama topik untuk dialog pemilihan materi

  // react-hook-form untuk validasi & kontrol orm
  const form = useForm({ mode: "onBlur" });

  // -------------------------------------------------------
  // Helper : warna badge berdasarkan jenis materi
  // (disesuaikan dengan SelectMateriDialog yang saua buat)
  // -------------------------------------------------------
  const typeColor = (type: string) => {     // <-- EDIT
    switch (type?.toLowerCase()) {
      case "teks":
      case "text":
        return "bg-blue-100 text-blue-700";
      case "pdf":
      case "dokumen pdf":
      case "dokumen":
        return "bg-green-100 text-green-700";
      case "video":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  // ---------------------------------------------
  //    MENANGANI PENAMAHAN MATERI DARI DIALOG
  // - menghindari duplikat
  // - menambahkan nomor_urutan otomatis
  // ----------------------------------------------
  const handleAddMateri = (materis: Materi[]) => {
    const merged = [...selectedMateri];
    materis.forEach(m => {
      if (!merged.find(x => x.id === m.id)) {
        merged.push({...m, nomor_urutan: merged.length + 1});
      }
    });
    setSelectedMateri(merged);
  };

  // Batal kembali ke daftar topik
  const handleCancel = () => navigate("/learning-topics");
  

  // ------------------------------------------------------------------------------------------------
  //                                 FUNGSI : TAMBHA TOPIK BARU (POST)
  // - Simpan topik
  // - Lalu associate setiap materi ke topik via endpoint POST / topik-pembelajaran/:id_topik/materi
  // -------------------------------------------------------------------------------------------------
  const addDataTopik = async (topik: any, listMateri: Materi[]) => {
    try {
      const response = await fetch(`${apiUrl}/topik-pembelajaran`, {
        method: "POST",
        headers: {
          "Content-Type":"application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(topik)
      });

      if (!response.ok) {
        const d = await response.text().catch(()=>null);
        throw new Error(d || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const id_topik = data.id_topik;

      // pasang materi ke topik (serially agar server konsisten)
      for (const m of listMateri) {
        await fetch(`${apiUrl}/topik-pembelajaran/${id_topik}/materi?id_materi=${encodeURIComponent(m.id)}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });
      }

      setInfoMessage("Topik pembelajaran berhasil dibuat");
      setTimeout(()=> { setInfoMessage(null); navigate("/learning-topics"); }, 1500);
    } catch (err:any) {
      console.error(err);
      setErrorMessage(err.message || "Gagal menyimpan topik");
      setTimeout(()=>setErrorMessage(null),3000);
    }
  };


  // ----------------------------------------------
  //          FUNGSI : EDIT TOPIK (PUT)
  // - update data topik
  // - attach materi ke topik (mirip add)
  // ----------------------------------------------
  const editDataTopik = async (id:string, topik:any, listMateri:Materi[]) => {
    try {
      const param = { id_topik: id, nama_topik: topik.nama_topik, deskripsi_topik: topik.deskripsi_topik };
      const resp = await fetch(`${apiUrl}/topik-pembelajaran`, {
        method: "PUT",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
        body: JSON.stringify(param)
      });
      if (!resp.ok) throw new Error("Gagal update topik");

      for (const m of listMateri) {
        await fetch(`${apiUrl}/topik-pembelajaran/${id}/materi?id_materi=${encodeURIComponent(m.id)}`, {
          method: "POST",
          headers: {"Authorization":`Bearer ${apiKey}`}
        });
      }

      setInfoMessage("Topik berhasil diupdate");
      setTimeout(()=> { setInfoMessage(null); navigate("/learning-topics"); }, 1500);
    } catch (err:any) {
      console.error(err);
      setErrorMessage(err.message || "Gagal mengedit topik");
      setTimeout(()=>setErrorMessage(null),3000);
    }
  };

  // ----------------------------------------------------
  //           VALIDASI & SUBMIT HANDLER
  // - trigger validation form
  // - memastikan minimal 1 materi
  // - panggil addDataTopik / editDataTopik sesuai mode
  // ----------------------------------------------------
  const handleSave = async () => {
    const ok = await form.trigger();
    if (!ok) return;
    if (selectedMateri.length === 0) {
      setMateriError("Topik setidaknya harus memiliki satu materi!");
      setTimeout(()=>setMateriError(null),2000);
      return;
    }
    const dataTopik = {
      nama_topik: form.getValues("namaTopik"),
      deskripsi_topik: form.getValues("deskripsiTopik")
    };
    if (topikId) editDataTopik(topikId, dataTopik, selectedMateri);
    else addDataTopik(dataTopik, selectedMateri);
  };


  // -----------------------------------------------------------------------
  // Ambil detail topik & daftar materi yang sudah terpasang
  // - fungsi ini fleksibel : menangani berbagai bentuk response dari server
  // ------------------------------------------------------------------------
  const fetchDetail = async (id:string) => {
    try {
      const resp = await fetch(`${apiUrl}/topik-pembelajaran/${id}/materi`, {
        method: "GET",
        headers: { "Accept":"application/json", "Authorization":`Bearer ${apiKey}` }
      });
      const d = await resp.json().catch(()=>null);

      // normalisasi response ke array
      const rows = (d && Array.isArray(d)) ? d : (d && Array.isArray(d.data) ? d.data : []);
      const mapped = (rows || []).map((m:any, idx:number) => ({
        id: m.id_materi ?? m.ms_id_materi ?? m.id ?? '',
        name: m.judul_materi ?? m.ms_nama_modul ?? m.judul ?? m.name ?? '',
        description: m.deskripsi_materi ?? m.ms_deskripsi_modul ?? m.deskripsi ?? m.description ?? '',
        type: m.jenis_materi ?? m.type ?? 'default',
        nomor_urutan: idx + 1
      }));
      setSelectedMateri(mapped);

      // ambil data topik untuk mengisi nama/deskripsi (bila diperlukan)
      const respTopik = await fetch(`${apiUrl}/topik-pembelajaran`, {
        method: "GET",
        headers: { "Accept":"application/json", "Authorization":`Bearer ${apiKey}` }
      });
      const arr = await respTopik.json().catch(()=>[]);
      const found = (arr || []).find((t:any)=> (t.id_topik ?? t.ms_id_topik) === id);
      if (found) {
        form.setValue("namaTopik", found.nama_topik ?? found.ms_nama_topik ?? '');
        form.setValue("deskripsiTopik", found.deskripsi_topik ?? found.ms_deskripsi_topik ?? '');
        setTopicName(found.nama_topik ?? found.ms_nama_topik ?? '');
      }
    } catch (err) {
      console.error('fetchDetail error', err);
    }
  };

  // -----------------------------------------
  //   HAPUS MATERI DENGAN KONFIRMASI DIALOG 
  // -----------------------------------------
  const handleDeleteMateri = (m: Materi) => {
    setShowConfirmation(true);
    setMateriToDelete(m);
  };

  const confirmDelete = () => {
    if (materiToDelete) {
      setSelectedMateri(prev => prev.filter(x => x.id !== materiToDelete.id));
      setInfoMateriMessage("Materi berhasil dihapus dari topik");
      setShowConfirmation(false);
      setMateriToDelete(null);
      setTimeout(()=>setInfoMateriMessage(null),2000);
    }
  };
  const cancelDelete = () => { setShowConfirmation(false); setMateriToDelete(null); };


  // ----------------------------------------------------------
  //     EFFECT : VALIDASI SESSION & FETCH DETAIL BILA EDIT
  // - note : menambhakan dependensi topikID secara eksplisit
  // -----------------------------------------------------------
  useEffect(() => {
    if (!session) navigate("/login");
    else if (session.login_type !== "teacher") navigate("/dashboard-student");
    else {
      if (topikId) fetchDetail(topikId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topikId]);


  // ----------------------------------------------------
  //     PENGURUTAN MATERI : PINDAH KE ATAS / BAWAH
  // - menjaga immutability dengan membuat salinan array
  // -----------------------------------------------------
  const moveUp = (index:number) => {
    if (index <= 0) return;
    const arr = [...selectedMateri];
    [arr[index-1], arr[index]] = [arr[index], arr[index-1]];
    setSelectedMateri(arr);
  };
  const moveDown = (index:number) => {
    if (index >= selectedMateri.length-1) return;
    const arr = [...selectedMateri];
    [arr[index], arr[index+1]] = [arr[index+1], arr[index]];
    setSelectedMateri(arr);
  };


  // ------------------------------------------------------
  //                       RENDER UI 
  // - komentar pada bagian-bagian penting untuk membantu
  // ------------------------------------------------------
  return (
    <LayoutForm screenName={screenName}>
      {/* Global message */}
      {infoMessage && (<div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">{infoMessage}</div>)}
      {errorMessage && (<div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{errorMessage}</div>)}
      {materiError && (<div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{materiError}</div>)}

      <div className="flex flex-col w-screen min-h-screen p-6">
        {/* form topik : nama & deskripsi*/}
        <Form {...form}>
          <form className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start mb-4">
                {/* Field: Nama Topik (required) */}
                <FormField
                  control={form.control}
                  name="namaTopik"
                  rules={{ required: "Nama Topik harus diisi!", maxLength: { value: 255, message: "Nama Topik terlalu panjang" } }}
                  render={({ field, fieldState: { error } }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="text-gray-700 font-bold text-sm lg:text-base w-1/4">Nama Topik <span className="text-red-500">*</span></FormLabel>
                      <div className="w-1/12 text-center">:</div>
                      <FormControl className="flex-1">
                        <div>
                          <Input {...field} id="nama-topik" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50" onChange={(e)=>{field.onChange(e); setTopicName(e.target.value)}} />
                          {error && <p className="text-red-600 text-xs mt-1">{error.message}</p>}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-start">
                {/* Field: Deskripsi Topik (opsional) */}
                <FormField
                  control={form.control}
                  name="deskripsiTopik"
                  render={({ field }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="text-gray-700 font-bold text-sm lg:text-base w-1/4">Deskripsi Topik</FormLabel>
                      <div className="w-1/12 text-center">:</div>
                      <FormControl className="flex-1">
                        <textarea {...field} id="deskripsi-topik" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50" rows={4}></textarea>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        {/* Daftar Materi */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-gray-700 text-base lg:text-lg font-bold">Daftar Materi Pembelajaran <span className="text-red-500">*</span></h2>
            <Button className="text-white bg-blue-800 px-3 py-2 shadow hover:bg-blue-700 rounded-full" onClick={() => setIsSelectMateriDialogOpen(true)}>
              <FaPlus />
            </Button>
          </div>

          {infoMateriMessage && (<div className="p-2 mb-3 text-green-500 bg-green-100 rounded-md">{infoMateriMessage}</div>)}

          <div className='overflow-x-auto'>
            <table className="min-w-full bg-white border rounded-lg shadow-md text-xs lg:text-sm">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="py-3 px-2 md:px-6 border">No</th>
                  <th className="py-3 px-2 md:px-6 border">Nama Materi</th>
                  <th className="py-3 px-2 md:px-6 border">Deskripsi</th>
                  <th className="py-3 px-2 md:px-6 border">Jenis Materi</th>
                  <th className="py-3 px-2 md:px-6 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedMateri.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-500">Belum ada materi</td></tr>
                ) : (
                  selectedMateri.map((m: Materi, index: number) => (
                    <tr key={m.id || index} className={`${index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}>
                      <td className="py-3 px-2 md:px-6 border text-center">{index+1}</td>
                      <td className="py-3 px-2 md:px-6 border">{m.name ?? '-'}</td>
                      <td className="py-3 px-2 md:px-6 border">{m.description ?? '-'}</td>

                      {/* Jenis materi: tampilkan badge yang warnanya sesuai jenis */}
                      <td className="py-3 px-2 md:px-6 border text-center">
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold ${typeColor(m.type)}`}>
                          {m.type ?? 'default'}
                        </span>
                      </td>

                      <td className="py-3 px-2 md:px-6 border">
                        <div className="flex justify-center items-center space-x-2">
                          <div className="flex flex-col items-center bg-transparent">
                            {index > 0 && (<Button onClick={() => moveUp(index)} className="text-blue-600 bg-transparent p-0 h-auto"><AiFillCaretUp /></Button>)}
                            {index < selectedMateri.length - 1 && (<Button onClick={() => moveDown(index)} className="text-blue-600 bg-transparent p-0 h-auto"><AiFillCaretDown /></Button>)}
                          </div>
                          <Button onClick={() => handleDeleteMateri(m)} className="text-red-600 self-center bg-transparent p-0 h-auto"><FaTrash /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 text-xs lg:text-sm mt-1 pt-6 lg:pt-8">* Harus terdapat setidaknya 1 materi</p>
        </div>
        {/* Tombol aksi: batal & simpan */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleCancel} className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100">Batal</Button>
          <Button onClick={handleSave} className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100">Simpan</Button>
        </div>
      </div>

      {/* Dialog pilih materi: komunikasi via props */}
      <SelectMateriDialog
        isDialogOpen={isSelectMateriDialogOpen}
        setIsDialogOpen={setIsSelectMateriDialogOpen}
        onAddMateri={handleAddMateri}
        selectedMateri={selectedMateri}
        topicName={topicName}
      />
      {/* Konfirmasi hapus materi */}
      {showConfirmation && <ConfirmationModal message="Apakah Anda yakin ingin menghapus materi ini?" onConfirm={confirmDelete} onCancel={cancelDelete} />}
    </LayoutForm>
  );
};

export default TopicDetailPage;
