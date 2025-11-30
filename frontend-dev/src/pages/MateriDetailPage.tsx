// frontend-dev/src/pages/MateriDetailPage.tsx
import AddMateriForm from "@/components/custom/AddMateriForm";
import LayoutForm from "./LayoutForm"; 
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";

const MateriDetailPage = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL as string;
  let apiKey: string = import.meta.env.VITE_API_KEY as string;

  // Ambil token dari session 
  const sessionData = localStorage.getItem("session");
  let session: any = null;
  if (sessionData) {
    try {
      session = JSON.parse(sessionData);
      apiKey = session.token ?? apiKey;
    } catch {
      // ignore parse error
    }
  }

  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenName, setScreenName] = useState("Tambah Materi Pembelajaran");

  // Cek Session
  useEffect(() => {
    if (!session) {
      navigate("/login");
    } else if (session.login_type !== "teacher") {
      navigate("/dashboard-student");
    }
    // Logic tambahan cek role teacher bisa ditaruh disini
  }, [navigate]);

  const LoadingOverlay: React.FC = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-4 rounded shadow-lg flex items-center">
        <ClipLoader size={35} color={"#123abc"} loading={true} />
        <span className="ml-2">Saving Data...</span>
      </div>
    </div>
  );

  const handleCancel = () => {
    // Redirect kembali ke halaman list materi
    navigate("/learning-materi");
  };

  const handleAddMateri = async (data: any, file: File | null) => {
    setIsLoading(true);
    console.log("Data Form:", data);
    console.log("File Upload:", file);

    try {
      // Siapkan FormData sesuai field backend
      const formData = new FormData();
      formData.append("judul_materi", data.judul || "");
      formData.append("deskripsi_materi", data.deskripsi || "");

      // mapping jenis materi → field backend
      const jenisLower = (data.jenisMateri || "").toLowerCase();

      // nilai yang akan disimpan di DB
      let jenisDb = data.jenisMateri || "";
      if (jenisLower === "dokumen" || jenisLower.includes("pdf")) {
        jenisDb = "Dokumen PDF";
      }
      formData.append("jenis_materi", jenisDb);

      // kirim field spesifik sesuai jenis
      if ((jenisLower === "dokumen" || jenisLower.includes("pdf")) && file) {
        // Jika jenis dokumen, kirim file PDF
        formData.append("file_materi", file);
      } else if (jenisLower === "video") {
        // Jika jenis video, kirim link youtube
        formData.append("video_materi", data.youtubeUrl || "");
      } else if (jenisLower === "teks" || jenisLower === "text") {
        // Jika jenis teks, kirim isi artikel
        formData.append("text_materi", data.isiArtikel || "");
      }

      const res = await fetch(`${apiUrl}/materi`, {
        method: "POST",
        headers: {
          // Jangan set Content-Type manual kalau pakai FormData
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let msg = "Gagal Menyimpan Materi";
        try {
          const err = await res.json();
          if (err?.detail) msg = err.detail;
        } catch {
          // ignore parse error
        }
        throw new Error(msg);
      }

      // Jika sukses:
      setInfoMessage("Materi Berhasil Disimpan");
      setTimeout(() => {
        setInfoMessage(null);
        navigate("/learning-materi");
      }, 2000);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Gagal Menyimpan Materi");
      setTimeout(() => setErrorMessage(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LayoutForm screenName={screenName}>
      {/* Area Pesan Error/Sukses */}
      <div className="grid grid-cols-1">
        {infoMessage && (
          <div className="p-4 mb-4 text-green-500 bg-green-100 rounded-md">
            {infoMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-md">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Container Form Utama (Style sama persis dengan ModuleTestPage) */}
      <div className="min-h-screen w-screen flex items-center justify-center bg-gray-100 p-10">
        <AddMateriForm onAddMateri={handleAddMateri} onCancel={handleCancel} />
      </div>

      {isLoading && <LoadingOverlay />}
    </LayoutForm>
  );
};

export default MateriDetailPage;
