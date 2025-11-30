// frontend-dev/src/components/custom/AddMateriForm.tsx

import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaCloudUploadAlt, FaFileAlt, FaYoutube, FaAlignLeft, FaInfoCircle } from "react-icons/fa";

interface AddMateriFormProps {
  onAddMateri: (data: any, file: File | null) => void;
  onCancel: () => void;
}

const AddMateriForm: React.FC<AddMateriFormProps> = ({ onAddMateri, onCancel }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMateri, setFileMateri] = useState<File | null>(null);

  const form = useForm({
    defaultValues: {
      judul: "",
      deskripsi: "",
      jenisMateri: "", // UBAH KE KOSONG (supaya user harus pilih)
      topik: "",
      youtubeUrl: "",
      isiArtikel: "",
      file: "", 
    },
    mode: "onBlur"
  });

  // Watcher untuk memantau perubahan dropdown secara realtime
  const jenisMateri = form.watch("jenisMateri");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileMateri(file);
      field.onChange(file.name);
    }
  };

  const onSubmit = (data: any) => {
    const cleanData = { ...data };
    
    // Hapus field yang tidak relevan sesuai jenis materi
    if (jenisMateri === 'Dokumen') {
        delete cleanData.youtubeUrl;
        delete cleanData.isiArtikel;
    } else if (jenisMateri === 'Video') {
        delete cleanData.file;
        delete cleanData.isiArtikel;
    } else if (jenisMateri === 'Teks') {
        delete cleanData.file;
        delete cleanData.youtubeUrl;
    }

    onAddMateri(cleanData, fileMateri);
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-4 p-4 sm:p-6 md:p-10 w-full mx-auto bg-white shadow-md rounded-md"
      >
        
        {/* LAYOUT GRID: Kiri (Input), Kanan (Dynamic Content) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- KOLOM KIRI (Metadata) --- */}
            <div className="lg:col-span-2 space-y-4">
                <Card className="shadow-none border-0 p-0">
                    <CardHeader className="px-0 pt-0 pb-4">
                        <CardTitle className="text-lg text-gray-700">Informasi Umum</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 space-y-4">
                        
                        {/* Judul Materi */}
                        <FormField
                            control={form.control}
                            name="judul"
                            rules={{ required: "Judul materi harus diisi!" }}
                            render={({ field, fieldState: { error } }) => (
                                <FormItem>
                                    <FormLabel>Judul Materi <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input {...field} className="bg-gray-50" placeholder=" " />
                                    </FormControl>
                                    {error && <p className="text-red-600 text-sm">{error.message}</p>}
                                </FormItem>
                            )}
                        />

                        {/* Deskripsi Singkat */}
                        <FormField
                            control={form.control}
                            name="deskripsi"
                            rules={{ required: "Deskripsi harus diisi!" }}
                            render={({ field, fieldState: { error } }) => (
                                <FormItem>
                                    <FormLabel>Deskripsi Singkat</FormLabel>
                                    <FormControl>
                                        <textarea 
                                            {...field} 
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                                            placeholder="Deskripsi singkat materi yang akan di-upload..."
                                        />
                                    </FormControl>
                                    {error && <p className="text-red-600 text-sm">{error.message}</p>}
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Jenis Materi */}
                            <FormField
                                control={form.control}
                                name="jenisMateri"
                                rules={{ required: "Jenis materi harus dipilih!" }}
                                render={({ field, fieldState: { error } }) => (
                                    <FormItem>
                                        <FormLabel>Jenis Materi <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Pilih Jenis" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="Dokumen">Dokumen PDF</SelectItem>
                                                    <SelectItem value="Video">Video Youtube</SelectItem>
                                                    <SelectItem value="Teks">Teks / Artikel</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        {error && <p className="text-red-600 text-sm">{error.message}</p>}
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- KOLOM KANAN (Dynamic Content) --- */}
            <div className="lg:col-span-1 space-y-4">
                 <Card className="shadow-none border-0 p-0 h-full">
                    <CardHeader className="px-0 pt-0 pb-4">
                        <CardTitle className="text-lg text-gray-700">Upload Materi</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 h-full">
                        
                        {/* KONDISI 0: BELUM MEMILIH JENIS (DEFAULT VIEW) */}
                        {!jenisMateri && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-400 p-6 text-center">
                                <FaInfoCircle className="h-8 w-8 mb-3 opacity-50" />
                                <p className="text-sm font-medium">Pilih <strong>Jenis Materi</strong> terlebih dahulu!.</p>
                            </div>
                        )}

                        {/* KONDISI 1: DOKUMEN PDF */}
                        {jenisMateri === 'Dokumen' && (
                            <FormField
                                control={form.control}
                                name="file"
                                rules={{ required: "File PDF harus diunggah!" }}
                                render={({ field, fieldState: {error} }) => (
                                    <FormItem>
                                        <FormLabel>Upload File (PDF Only)</FormLabel>
                                        <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-blue-50 transition-colors cursor-pointer relative group min-h-[300px]">
                                            <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                                <FaCloudUploadAlt className="h-10 w-10 text-blue-600" />
                                            </div>
                                            
                                            <span className="text-sm font-semibold text-gray-700">
                                                {fileName ? fileName : "Klik atau Drop file PDF di sini"}
                                            </span>
                                            <span className="text-xs text-gray-500 mt-2">
                                                Max size: 6 MB
                                            </span>

                                            <Input 
                                                type="file" 
                                                accept="application/pdf"
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                onChange={(e) => handleFileChange(e, field)}
                                            />
                                        </div>
                                        {fileName && (
                                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2 text-sm text-green-700">
                                                <FaFileAlt /> {fileName}
                                            </div>
                                        )}
                                        {error && <p className="text-red-600 text-sm">{error.message}</p>}
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* KONDISI 2: VIDEO YOUTUBE */}
                        {jenisMateri === 'Video' && (
                            <FormField
                                control={form.control}
                                name="youtubeUrl"
                                rules={{ 
                                    required: "Link Youtube harus diisi!",
                                    pattern: {
                                        value: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/,
                                        message: "Link harus berupa URL Youtube valid"
                                    }
                                }}
                                render={({ field, fieldState: { error } }) => (
                                    <FormItem>
                                        <FormLabel>Link Video Youtube</FormLabel>
                                        <div className="flex flex-col gap-4 h-full">
                                            <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex flex-col items-center justify-center text-center min-h-[200px]">
                                                <FaYoutube className="h-16 w-16 text-red-600 mb-2" />
                                                <p className="text-sm text-red-800 font-medium">Masukkan Link Video</p>
                                                <p className="text-xs text-red-600">Video akan disematkan otomatis</p>
                                            </div>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    className="bg-white" 
                                                    placeholder="https://www.youtube.com/watch?v=..." 
                                                />
                                            </FormControl>
                                            {error && <p className="text-red-600 text-sm">{error.message}</p>}
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* KONDISI 3: TEKS ARTIKEL */}
                        {jenisMateri === 'Teks' && (
                            <FormField
                                control={form.control}
                                name="isiArtikel"
                                rules={{ required: "Isi artikel harus diisi!" }}
                                render={({ field, fieldState: { error } }) => (
                                    <FormItem className="h-full flex flex-col">
                                        <FormLabel>Isi Artikel / Materi Pembelajaran</FormLabel>
                                        <FormControl>
                                            <div className="flex-grow">
                                                <textarea 
                                                    {...field} 
                                                    className="w-full min-h-[400px] p-4 bg-gray-50 font-serif leading-relaxed text-gray-700 resize-none focus:bg-white transition-all border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                                    placeholder="Mulailah menulis materi pelajaran di sini..."
                                                />
                                            </div>
                                        </FormControl>
                                        <p className="text-xs text-gray-400 text-right mt-1">
                                            <FaAlignLeft className="inline mr-1"/> Mendukung teks panjang (scrollable)
                                        </p>
                                        {error && <p className="text-red-600 text-sm">{error.message}</p>}
                                    </FormItem>
                                )}
                            />
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t mt-4">
            <Button 
                onClick={onCancel} 
                type="button" 
                className="bg-blue-50 text-blue-700 border-2 border-blue-700 py-2 px-6 rounded-full hover:bg-blue-700 hover:text-white transition-colors"
            >
                Batal
            </Button>
            <Button 
                type="submit" 
                className="bg-blue-50 text-blue-700 border-2 border-blue-700 py-2 px-6 rounded-full hover:bg-blue-700 hover:text-white transition-colors"
            >
                Simpan Materi
            </Button>
        </div>

      </form>
    </Form>
  );
};

export default AddMateriForm;