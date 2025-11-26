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

interface Materi {
  id: string;
  name: string;
  description: string;
  type: string;
  nomor_urutan?: number;
}

const TopicDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  let apiKey = import.meta.env.VITE_API_KEY;
  const sessionData = localStorage.getItem('session')
  let session = null
  if (sessionData != null){
      session = JSON.parse(sessionData);
      apiKey = session.token
  }
  const queryParameters = new URLSearchParams(window.location.search)
  const topikId = queryParameters.get("id_topik");

  const [screenName, setScreenName] = useState(topikId ? "Edit Topik Pembelajaran" : "Tambah Topik Pembelajaran");
  const [isSelectMateriDialogOpen, setIsSelectMateriDialogOpen] = useState(false);
  const [selectedMateri, setSelectedMateri] = useState<Materi[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [materiError, setMateriError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [materiToDelete, setMateriToDelete] = useState<Materi | null>(null);
  const [infoMateriMessage, setInfoMateriMessage] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const form = useForm({ mode: "onBlur" });

  // helper renumber
  const renumber = (arr: Materi[]) => arr.map((m, i) => ({ ...m, nomor_urutan: i + 1 }));

  // menerima array materi dari dialog; ensure shape {id,name,description,type, nomor_urutan}
  const handleAddMateri = (materis: Materi[]) => {
    const merged = [...selectedMateri];
    materis.forEach(m => {
      if (!merged.find(x => x.id === m.id)) {
        merged.push({...m, nomor_urutan: merged.length + 1});
      }
    });
    setSelectedMateri(renumber(merged));
  };

  const handleCancel = () => navigate("/learning-topics");

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

      // --- kirim mapping seluruh materi sekaligus (id + nomor_urutan) ---
      const mapping = renumber(listMateri).map(m => ({ id_materi: m.id, nomor_urutan: m.nomor_urutan ?? 1 }));

      const respMap = await fetch(`${apiUrl}/topik-pembelajaran/${id_topik}/materi/mapping`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ list_materi: mapping })
      });

      if (!respMap.ok) {
        const dd = await respMap.text().catch(()=>null);
        throw new Error(dd || "Gagal mapping materi");
      }

      setInfoMessage("Topik pembelajaran berhasil dibuat");
      setTimeout(()=> { setInfoMessage(null); navigate("/learning-topics"); }, 1500);
    } catch (err:any) {
      console.error(err);
      setErrorMessage(err.message || "Gagal menyimpan topik");
      setTimeout(()=>setErrorMessage(null),3000);
    }
  };

  const editDataTopik = async (id:string, topik:any, listMateri:Materi[]) => {
    try {
      // ubah topik
      const param = { id_topik: id, nama_topik: topik.nama_topik, deskripsi_topik: topik.deskripsi_topik };
      const resp = await fetch(`${apiUrl}/topik-pembelajaran`, {
        method: "PUT",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
        body: JSON.stringify(param)
      });
      if (!resp.ok) throw new Error("Gagal update topik");

      // --- replace mapping materi (satu request) ---
      const mapping = renumber(listMateri).map(m => ({ id_materi: m.id, nomor_urutan: m.nomor_urutan ?? 1 }));

      const respMap = await fetch(`${apiUrl}/topik-pembelajaran/${id}/materi/mapping`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ list_materi: mapping })
      });

      if (!respMap.ok) {
        const dd = await respMap.text().catch(()=>null);
        throw new Error(dd || "Gagal mapping materi (edit)");
      }

      setInfoMessage("Topik berhasil diupdate");
      setTimeout(()=> { setInfoMessage(null); navigate("/learning-topics"); }, 1500);
    } catch (err:any) {
      console.error(err);
      setErrorMessage(err.message || "Gagal mengedit topik");
      setTimeout(()=>setErrorMessage(null),3000);
    }
  };

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

  const fetchDetail = async (id:string) => {
    try {
      // fetch materi yang ter-mapping ke topik ini
      const resp = await fetch(`${apiUrl}/topik-pembelajaran/${id}/materi`, {
        method: "GET",
        headers: { "Accept":"application/json", "Authorization":`Bearer ${apiKey}` }
      });
      const d = await resp.json().catch(()=>null);

      // endpoint bisa mengembalikan { data: [...] } atau [...]
      const rows = (d && Array.isArray(d)) ? d : (d && Array.isArray(d.data) ? d.data : []);
      // Jika backend mengembalikan nomor_urutan di tm.nomor_urutan, pakai itu
      const mapped = (rows || []).map((m:any, idx:number) => ({
        id: m.id_materi ?? m.ms_id_materi ?? m.id ?? '',
        name: m.judul_materi ?? m.ms_nama_modul ?? m.judul ?? m.name ?? '',
        description: m.deskripsi_materi ?? m.ms_deskripsi_modul ?? m.deskripsi ?? m.description ?? '',
        type: m.jenis_materi ?? m.type ?? 'default',
        nomor_urutan: (m.nomor_urutan !== undefined && m.nomor_urutan !== null) ? Number(m.nomor_urutan) : (idx + 1)
      }));

      // pastikan terurut menurut nomor_urutan
      mapped.sort((a,b) => (a.nomor_urutan ?? 0) - (b.nomor_urutan ?? 0));
      setSelectedMateri(renumber(mapped));

      // ambil detail topik (ambil semua lalu cari) — backend belum ada detail endpoint
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

  const handleDeleteMateri = (m: Materi) => {
    setShowConfirmation(true);
    setMateriToDelete(m);
  };

  const confirmDelete = () => {
    if (materiToDelete) {
      setSelectedMateri(prev => renumber(prev.filter(x => x.id !== materiToDelete.id)));
      setInfoMateriMessage("Materi berhasil dihapus dari topik");
      setShowConfirmation(false);
      setMateriToDelete(null);
      setTimeout(()=>setInfoMateriMessage(null),2000);
    }
  };
  const cancelDelete = () => { setShowConfirmation(false); setMateriToDelete(null); };

  useEffect(() => {
    if (!session) navigate("/login");
    else if (session.login_type !== "teacher") navigate("/dashboard-student");
    else {
      if (topikId) fetchDetail(topikId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fungsi pindah urutan (up/down) -> lalu renumber
  const moveUp = (index:number) => {
    if (index <= 0) return;
    const arr = [...selectedMateri];
    [arr[index-1], arr[index]] = [arr[index], arr[index-1]];
    setSelectedMateri(renumber(arr));
  };
  const moveDown = (index:number) => {
    if (index >= selectedMateri.length-1) return;
    const arr = [...selectedMateri];
    [arr[index], arr[index+1]] = [arr[index+1], arr[index]];
    setSelectedMateri(renumber(arr));
  };

  return (
    <LayoutForm screenName={screenName}>
      {infoMessage && (<div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">{infoMessage}</div>)}
      {errorMessage && (<div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{errorMessage}</div>)}
      {materiError && (<div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">{materiError}</div>)}

      <div className="flex flex-col w-screen min-h-screen p-6">
        <Form {...form}>
          <form className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start mb-4">
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
                      <td className="py-3 px-2 md:px-6 border">{m.type ?? 'default'}</td>
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

        <div className="flex justify-end mt-6">
          <Button onClick={handleCancel} className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100">Batal</Button>
          <Button onClick={handleSave} className="mr-4 text-blue-800 border border-blue-600 px-4 py-2 rounded-full shadow hover:bg-blue-100">Simpan</Button>
        </div>
      </div>

      <SelectMateriDialog
        isDialogOpen={isSelectMateriDialogOpen}
        setIsDialogOpen={setIsSelectMateriDialogOpen}
        onAddMateri={handleAddMateri}
        selectedMateri={selectedMateri}
        topicName={topicName}
      />

      {showConfirmation && <ConfirmationModal message="Apakah Anda yakin ingin menghapus materi ini?" onConfirm={confirmDelete} onCancel={cancelDelete} />}
    </LayoutForm>
  );
};

export default TopicDetailPage;
