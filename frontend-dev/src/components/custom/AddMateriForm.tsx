import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
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
import { 
    FaCloudUploadAlt, 
    FaFileAlt, 
    FaYoutube, 
    FaInfoCircle,
} from "react-icons/fa";

// --- LIBRARY REACT QUILL ---
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface AddMateriFormProps {
  onAddMateri: (data: any, file: File | null, articleImages: File[]) => void;
  onCancel: () => void;
  initialData?: {
    judul?: string;
    deskripsi?: string;
    jenisMateri?: string;
    youtubeUrl?: string;
    isiArtikel?: string;
    fileName?: string;
  };
}

const AddMateriForm: React.FC<AddMateriFormProps> = ({ onAddMateri, onCancel, initialData }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMateri, setFileMateri] = useState<File | null>(null);
  
  // State untuk menyimpan file gambar artikel yang akan dikirim ke backend
  const [articleImages, setArticleImages] = useState<File[]>([]);

  // Ref untuk React Quill Editor
  const quillRef = useRef<ReactQuill>(null);

  const form = useForm({
    defaultValues: {
      judul: "",
      deskripsi: "",
      jenisMateri: "", 
      youtubeUrl: "",
      isiArtikel: "",
      file: "", 
      topik: "", 
    },
    mode: "onBlur"
  });

  // Prefill Data (Mode Edit)
  useEffect(() => {
    if (!initialData) return;

    form.reset({
      judul: initialData.judul || "",
      deskripsi: initialData.deskripsi || "",
      jenisMateri: initialData.jenisMateri || "",
      youtubeUrl: initialData.youtubeUrl || "",
      isiArtikel: initialData.isiArtikel || "",
      file: initialData.fileName || "",
      topik: "", 
    });

    if (initialData.fileName) {
      setFileName(initialData.fileName);
    }
  }, [initialData, form]);

  const jenisMateri = form.watch("jenisMateri");

  // Handler Upload PDF (Sisi Kanan)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileMateri(file);
      field.onChange(file.name);
    }
  };

  // --- [PERBAIKAN UTAMA] IMAGE HANDLER DENGAN BASE64 ---
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files ? input.files[0] : null;
      if (file) {
        // 1. Simpan file ke state array (untuk dikirim ke backend via FormData)
        setArticleImages((prev) => [...prev, file]);

        // 2. Baca file sebagai Base64 agar PASTI TAMPIL di editor
        const reader = new FileReader();
        reader.onload = () => {
            const imageUrl = reader.result as string; // Hasil Base64
            
            const editor = quillRef.current?.getEditor();
            if (editor) {
                // Masukkan gambar ke posisi kursor
                const range = editor.getSelection();
                const index = range ? range.index : editor.getLength();
                
                // Insert gambar
                editor.insertEmbed(index, "image", imageUrl);
                
                // Geser kursor ke sebelah kanan gambar
                editor.setSelection(index + 1, 0);
            }
        };
        reader.readAsDataURL(file); // Mulai proses baca file
      }
    };
  };

  // --- KONFIGURASI TOOLBAR ---
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }], 
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'], // Tombol Image
        ['clean']
      ],
      handlers: {
        image: imageHandler 
      }
    },
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike', 
    'list', 'bullet', 'link', 'image'
  ];

  const onSubmit = (data: any) => {
    const cleanData = { ...data };
    
    // Bersihkan field yang tidak relevan
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

    onAddMateri(cleanData, fileMateri, articleImages);
  };

  return (
    <Form {...form}>
      {/* --- CSS KHUSUS EDITOR --- */}
      <style>{`
        /* Container utama editor */
        .quill {
            display: flex;
            flex-direction: column;
            background-color: white;
            border-radius: 0.5rem;
        }
        
        /* Toolbar */
        .ql-toolbar {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            background-color: #f9fafb;
            border-color: #e2e8f0 !important;
        }

        /* Area Ketik */
        .ql-container {
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            font-size: 1rem;
            border-color: #e2e8f0 !important;
            min-height: 350px; 
        }
        
        /* Agar gambar terlihat */
        .ql-editor img {
            max-width: 100%;
            height: auto;
            display: inline-block; /* Paksa tampil */
            margin: 10px auto;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        /* Spacer bawah agar tombol simpan tidak ketutup */
        .editor-wrapper {
            margin-bottom: 20px; 
        }
      `}</style>

      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-4 p-4 sm:p-6 md:p-10 w-full mx-auto bg-white shadow-md rounded-md"
      >
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* --- KOLOM KIRI (Metadata) --- */}
            <div className="space-y-4">
                <Card className="shadow-none border-0 p-0">
                    <CardHeader className="px-0 pt-0 pb-4">
                        <CardTitle className="text-lg text-gray-700">Informasi Umum</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 space-y-4">
                        
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
                                            <SelectTrigger className="w-full bg-white">
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

                    </CardContent>
                </Card>
            </div>

            {/* --- KOLOM KANAN (Dynamic Content) --- */}
            <div className="space-y-4">
                 <Card className="shadow-none border-0 p-0 h-full">
                    <CardHeader className="px-0 pt-0 pb-4">
                        <CardTitle className="text-lg text-gray-700">Konten Materi</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 h-full">
                        
                        {!jenisMateri && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-400 p-6 text-center">
                                <FaInfoCircle className="h-8 w-8 mb-3 opacity-50" />
                                <p className="text-sm font-medium">Pilih <strong>Jenis Materi</strong> terlebih dahulu!</p>
                            </div>
                        )}

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
                                            <span className="text-xs text-gray-500 mt-2">Max size: 6 MB</span>

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

                        {/* --- EDITOR TEKS DENGAN GAMBAR VISUAL --- */}
                        {jenisMateri === 'Teks' && (
                            <FormField
                                control={form.control}
                                name="isiArtikel"
                                rules={{ required: "Isi artikel harus diisi!" }}
                                render={({ field, fieldState: { error } }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="mb-2">Isi Artikel / Materi Pembelajaran</FormLabel>
                                        
                                        {/* Wrapper dengan margin bottom agar tidak menutupi tombol */}
                                        <div className="editor-wrapper">
                                            <Controller
                                                name="isiArtikel"
                                                control={form.control}
                                                render={({ field: { onChange, value } }) => (
                                                    <ReactQuill 
                                                        ref={quillRef}
                                                        theme="snow"
                                                        value={value || ''} 
                                                        onChange={onChange} 
                                                        modules={modules}
                                                        formats={formats}
                                                        placeholder="Tulis materi artikel di sini... Klik icon gambar untuk insert."
                                                    />
                                                )}
                                            />
                                        </div>

                                        {error && <p className="text-red-600 text-sm mt-1">{error.message}</p>}
                                    </FormItem>
                                )}
                            />
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Action Buttons - Diberi margin top besar agar aman */}
        <div className="flex justify-end space-x-4 pt-8 border-t mt-8">
            <Button onClick={onCancel} type="button" className="bg-blue-50 text-blue-700 border-2 border-blue-700 py-2 px-6 rounded-full hover:bg-blue-700 hover:text-white transition-colors">
                Batal
            </Button>
            <Button type="submit" className="bg-blue-50 text-blue-700 border-2 border-blue-700 py-2 px-6 rounded-full hover:bg-blue-700 hover:text-white transition-colors">
                Simpan
            </Button>
        </div>

      </form>
    </Form>
  );
};

export default AddMateriForm;