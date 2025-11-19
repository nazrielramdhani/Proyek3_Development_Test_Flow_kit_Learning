// src/pages/TopicDetailPages.tsx
import React, { useState, useEffect } from 'react';
import LayoutForm from './LayoutForm';
import { Button } from "@/components/ui/button";
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

// Import komponen dialog baru
import AddMateriDialog from "../pages/AddMateriDialog";


// Import service functions dari topicService.ts
import {
  addTopik,
  mappingMateri,
  editTopik,
  editMappingMateri,
  getDetailData,
  // searchMateri tidak lagi diimport di sini
} from '@/services/topicService';

// --- INTERFACE MATERI ---
interface Materi {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  type: string;
}

const TopicDetailPages: React.FC = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem('session');
  let session = null;
  if (sessionData != null) {
    session = JSON.parse(sessionData);
    apiKey = session.token;
  }

  const queryParameters = new URLSearchParams(window.location.search);
  const topikId = queryParameters.get("id_topik");

  // --- STATE UTAMA ---
  const [screenName, setScreenName] = useState("Tambah Topik Pembelajaran");
  const [selectedMateri, setSelectedMateri] = useState<Materi[]>([]);
  
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [materiError, setMateriError] = useState<string | null>(null);
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [infoMateriMessage, setInfoMateriMessage] = useState<string | null>(null);
  
  const [topicName, setTopicName] = useState<string>("");
  const [isSortedInitially, setIsSortedInitially] = useState(true);

  // --- STATE DIALOG / POPUP (Hanya status buka/tutup) ---
  const [isSelectMateriDialogOpen, setIsSelectMateriDialogOpen] = useState(false);
  
  const form = useForm({
    mode: "onBlur",
  });

  const difficultyOrder:any = {
    'Sangat Mudah': 1,
    'Mudah': 2,
    'Sedang': 3,
    'Sulit': 4
  };

  const getTypeStyle = (type: string) => {
    const safeType = type ? type.toLowerCase() : '';
    if (safeType.includes('video')) return 'bg-purple-100 text-purple-700';
    if (safeType.includes('pdf')) return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  };

  // ------------------------
  // FUNGSI-HANDLER UTAMA
  // ------------------------

  // Callback dari AddMateriDialog
  const handleMateriSelectionConfirmed = (newMateriList: Materi[]) => {
      setSelectedMateri(newMateriList);
      setIsSortedInitially(true);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    if (selectedMateri.length === 0) {
      setMateriError("Topik Setidaknya harus memiliki satu materi!");
      setTimeout(() => setMateriError(null), 2000);
      return;
    }

    const dataTopik = {
      nama_topik : form.getValues("namaTopik"),
      deskripsi_topik : form.getValues("deskripsiTopik")
    };

    try {
      if (topikId != null) {
        const param = {
          id_topik: topikId,
          nama_topik: dataTopik.nama_topik,
          deskripsi_topik: dataTopik.deskripsi_topik
        };

        const resEdit = await editTopik(param, apiKey);
        if (!resEdit.ok) {
          if (resEdit.status === 403) throw new Error("Forbidden: Access is denied");
          else throw new Error(resEdit.message || "Edit topik gagal");
        }

        const listIdMateri = selectedMateri.map(m => ({ id_materi: m.id }));
        const paramMapping = { id_topik: topikId, list_materi: listIdMateri };
        
        const resMap = await editMappingMateri(paramMapping, apiKey);
        if (!resMap.ok) {
          setErrorMessage(resMap.message || "Gagal edit mapping materi");
          setTimeout(() => setErrorMessage(null), 2000);
          return;
        }

        setInfoMessage("Data Topik Saved Success");
        setTimeout(() => setInfoMessage(null), 2000);
        setTimeout(() => navigate('/list-topics'), 2100);

      } else {
        const res = await addTopik(dataTopik, apiKey);
        if (!res.ok) {
          if (res.status === 403) throw new Error("Forbidden: Access is denied");
          else throw new Error(res.message || "Create topik gagal");
        }

        const idTopikCreated = res.data?.id_topik;
        const listIdMateri = selectedMateri.map(m => ({ id_materi: m.id }));
        const paramMapping = { id_topik: idTopikCreated, list_materi: listIdMateri };
        
        const resMap = await mappingMateri(paramMapping, apiKey);
        if (!resMap.ok) {
          setErrorMessage(resMap.message || "Gagal mapping materi setelah buat topik");
          setTimeout(() => setErrorMessage(null), 2000);
          return;
        }

        setInfoMessage("Data Topik Saved Success");
        setTimeout(() => setInfoMessage(null), 2000);
        setTimeout(() => navigate('/list-topics'), 2100);
      }
    } catch (err: any) {
      console.error("Error saving topic:", err);
      setErrorMessage(err.message || "Terjadi kesalahan pada server");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const loadDetailTopik = async (idTopik: string) => {
    try {
      const res = await getDetailData(idTopik, apiKey);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Forbidden: Access is denied");
        } else {
          throw new Error(res.message || "Gagal fetch detail topik");
        }
      }
      const data = res.data;
      form.setValue("namaTopik", data.data.ms_nama_topik);
      form.setValue("deskripsiTopik", data.data.ms_deskripsi_topik);
      setTopicName(data.data.ms_nama_topik);

      const rawDataMateri = data.dataMateri || data.dataModul || [];
      
      const tempMateri: Materi[] = rawDataMateri.map((m: any) => ({
        id: m.ms_id_materi || m.ms_id_modul,
        name: m.ms_nama_materi || m.ms_nama_modul,
        description: m.ms_deskripsi_materi || m.ms_deskripsi_modul,
        difficulty: m.tingkat_kesulitan,
        type: m.ms_jenis_materi || "Teks",
      }));
      
      setSelectedMateri(tempMateri);
      setIsSortedInitially(true);
    } catch (err) {
      console.error("Error fetching detail topic:", err);
    }
  };

  // ------------------------
  // GENERAL LOGIC
  // ------------------------

  useEffect(() => {
    if (session != null) {
      if (session.login_type !== "teacher") {
        navigate("/dashboard-student");
      } else {
        if (topikId != null) {
          setScreenName("Edit Topik Pengujian");
          loadDetailTopik(topikId);
        }
      }
    } else {
      navigate("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    useEffect(() => {
    if (isSortedInitially) {
        const sortedMateri = [...selectedMateri].sort((a, b) => {
        const aRank = difficultyOrder[a.difficulty] ?? 999;
        const bRank = difficultyOrder[b.difficulty] ?? 999;
        return aRank - bRank;
        });
      setSelectedMateri(sortedMateri);
      setIsSortedInitially(false);
    }
  }, [selectedMateri, isSortedInitially]);

  const handleDeleteMateri = (materi: Materi) => {
    setShowConfirmation(true);
    setMateriToDelete(materi);
  };

  const confirmDelete = () => {
    if (materiToDelete) {
      setSelectedMateri(prev => prev.filter(m => m.id !== materiToDelete.id));
      setInfoMateriMessage("Materi berhasil dihapus");
      setShowConfirmation(false);
      setMateriToDelete(null);
      setTimeout(() => setInfoMateriMessage(null), 2000);
    }
  };

    const moveMateriUp = (index: number) => {
    if (index > 0) {
        const newMateri = [...selectedMateri];
        const temp = newMateri[index];
        newMateri[index] = newMateri[index - 1];
        newMateri[index - 1] = temp;
        setSelectedMateri(newMateri);
    }
    };

    const moveMateriDown = (index: number) => {
    if (index < selectedMateri.length - 1) {
        const newMateri = [...selectedMateri];
        const temp = newMateri[index];
        newMateri[index] = newMateri[index + 1];
        newMateri[index + 1] = temp;
        setSelectedMateri(newMateri);
    }
    };


  const handleCancel = () => {
    navigate("/list-topics");
  };

  return (
    <LayoutForm screenName={screenName}>
      {infoMessage && (
          <div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">{infoMessage}</div>
      )}
      {errorMessage && (
          <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{errorMessage}</div>
      )}
      {materiError && (
          <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{materiError}</div>
      )}
      
      <div className="flex flex-col w-screen min-h-screen p-6">
        {/* --- FORM INPUT TOPIK --- */}
        <Form {...form}>
          <form className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start mb-4">
                <FormField
                  control={form.control}
                  name="namaTopik"
                  rules={{ required: "Nama Topik harus diisi!", maxLength: { value: 50, message: "Nama Topik tidak sesuai!" } }}
                  render={({ field, fieldState: { error } }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="text-gray-700 font-bold text-sm lg:text-base w-1/4">
                        Nama Topik <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="w-1/12 text-center">:</div>
                      <FormControl className="flex-1">
                        <div>
                        <Input
                            {...field}
                            id="nama-topik"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            onChange={(e) => {
                              field.onChange(e);
                              setTopicName(e.target.value);
                            }}
                          />
                          <p className="text-gray-500 text-xs lg:text-sm mt-1">
                            * Nama topik harus unik, belum pernah dibuat sebelumnya.
                          </p>
                          {error && <p className="text-red-600 text-xs lg:text-sm mt-1">{error.message}</p>}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-start">
                <FormField
                  control={form.control}
                  name="deskripsiTopik"
                  render={({ field }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="text-gray-700 font-bold text-sm lg:text-base w-1/4">
                        Deskripsi Topik 
                      </FormLabel>
                      <div className="w-1/12 text-center">:</div>
                      <FormControl className="flex-1">
                        <textarea {...field} id="deskripsi-topik" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600" rows={4}></textarea>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        {/* --- TABEL MATERI YANG SUDAH DIPILIH --- */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-gray-700 text-base lg:text-lg font-bold">Daftar Materi Pembelajaran <span className="text-red-500">*</span></h2>
            <Button className="text-white bg-blue-800 px-3 py-2 shadow hover:bg-blue-700 rounded-full" onClick={() => setIsSelectMateriDialogOpen(true)}>
              <FaPlus />
            </Button>
          </div>
          {infoMateriMessage && (
            <div className="p-2 mb-3 text-green-500 bg-green-100 rounded-md">{infoMateriMessage}</div>
          )}
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
                {selectedMateri.map((materi: Materi, index: number) => (
                  <tr key={materi.id} className={`${index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}`}>
                    <td className="py-3 px-2 md:px-6 border text-center">{index + 1}</td>
                    <td className="py-3 px-2 md:px-6 border">{materi.name}</td>
                    <td className="py-3 px-2 md:px-6 border">{materi.description}</td>
                    <td className="py-3 px-2 md:px-6 border text-center">
                      <span className={`inline-block w-24 px-2 py-1 text-center rounded-md text-xs font-semibold ${getTypeStyle(materi.type)}`}>
                        {materi.type || "Teks"}
                      </span>
                    </td>
                    <td className="py-3 px-2 md:px-6 border">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="flex flex-col items-center bg-transparent">
                          {index > 0 && (
                            <Button onClick={() => moveMateriUp(index)} className="text-blue-600 bg-transparent p-0 h-auto"><AiFillCaretUp /></Button>
                          )}
                          {index < selectedMateri.length - 1 && (
                            <Button onClick={() => moveMateriDown(index)} className="text-blue-600 bg-transparent p-0 h-auto"><AiFillCaretDown /></Button>
                          )}
                        </div>
                        <Button onClick={() => handleDeleteMateri(materi)} className="text-red-600 self-center bg-transparent p-0 h-auto"><FaTrash /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs lg:text-sm mt-1 pt-6 lg:pt-8">* Harus terdapat setidaknya 1 materi pembelajaran</p>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleCancel} className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100">Batal</Button>
          <Button onClick={handleSave} className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100">Simpan</Button>
        </div>
      </div>

      {/* --- PENGGUNAAN DIALOG BARU --- */}
      <AddMateriDialog
          isDialogOpen={isSelectMateriDialogOpen}
          setIsDialogOpen={setIsSelectMateriDialogOpen}
          topicName={topicName}
          selectedMateri={selectedMateri}
          onConfirmSelection={handleMateriSelectionConfirmed}
      />

      {showConfirmation && (
        <ConfirmationModal 
          message="Apakah Anda yakin ingin menghapus materi ini?" 
          onConfirm={confirmDelete} 
          onCancel={() => setShowConfirmation(false)} 
        />
      )}
    </LayoutForm>
  );
};

export default TopicDetailPages;