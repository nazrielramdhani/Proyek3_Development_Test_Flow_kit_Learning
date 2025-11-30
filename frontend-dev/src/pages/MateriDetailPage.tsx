// frontend-dev/src/pages/MateriDetailPage.tsx

import AddMateriForm from "@/components/custom/AddMateriForm";
import LayoutForm from "./LayoutForm"; // Pastikan path import ini sesuai
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";

const MateriDetailPage = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL as string;

  // Ambil API key + token session (sama pola dengan halaman lain)
  let apiKey: string = import.meta.env.VITE_API_KEY as string;
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

  // Ambil query param id (kalau ada berarti mode EDIT)
  const queryParams = new URLSearchParams(window.location.search);
  const materiId = queryParams.get("id");

  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [screenName, setScreenName] = useState(
    materiId ? "Edit Materi Pembelajaran" : "Tambah Materi Pembelajaran"
  );

  // state untuk mengirim nilai awal ke AddMateriForm (saat edit)
  const [initialData, setInitialData] = useState<any | null>(null);

  // Cek Session (Sama seperti ModuleTestPage) + fetch detail bila edit
  useEffect(() => {
    if (!session) {
      navigate("/login");
      return;
    }
    if (session.login_type !== "teacher") {
      navigate("/dashboard-student");
      return;
    }

    // Jika ada materiId → fetch detail untuk prefill form
    if (materiId) {
      const fetchDetail = async () => {
        try {
          const res = await fetch(`${apiUrl}/materi/${materiId}`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(txt || "Gagal mengambil detail materi");
          }

          const d = await res.json();

          const jenisDb = (d.jenis_materi || "") as string;
          const jl = jenisDb.toLowerCase();
          let jenisMateriForm = "";
          if (jl.includes("dokumen")) jenisMateriForm = "Dokumen";
          else if (jl === "video") jenisMateriForm = "Video";
          else if (jl === "teks" || jl === "text") jenisMateriForm = "Teks";

          const fileName =
            d.file_materi && typeof d.file_materi === "string"
              ? d.file_materi.split("/").pop()
              : "";

          setInitialData({
            judul: d.judul_materi ?? "",
            deskripsi: d.deskripsi_materi ?? "",
            jenisMateri: jenisMateriForm,
            youtubeUrl: d.video_materi ?? "",
            isiArtikel: d.text_materi ?? "",
            fileName,
          });

          setScreenName("Edit Materi Pembelajaran");
        } catch (err: any) {
          console.error("fetch detail materi error", err);
          setErrorMessage(err?.message || "Gagal mengambil data materi");
          setTimeout(() => setErrorMessage(null), 2500);
        }
      };

      fetchDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiId]);

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
      let jenisDb = data.jenisMateri || "";
      if (jenisLower === "dokumen" || jenisLower.includes("pdf")) {
        jenisDb = "Dokumen PDF";
      }
      formData.append("jenis_materi", jenisDb);

      // field khusus per jenis
      if ((jenisLower === "dokumen" || jenisLower.includes("pdf")) && file) {
        formData.append("file_materi", file);
      } else if (jenisLower === "video") {
        formData.append("video_materi", data.youtubeUrl || "");
      } else if (jenisLower === "teks" || jenisLower === "text") {
        formData.append("text_materi", data.isiArtikel || "");
      }

      // Tentukan URL & method: tambah vs edit
      const isEdit = !!materiId;
      let url = `${apiUrl}/materi`;
      let method: "POST" | "PUT" = "POST";

      if (isEdit) {
        method = "PUT";
        formData.append("id_materi", materiId as string);
      }

      const res = await fetch(url, {
        method,
        headers: {
          // Jangan set Content-Type manual kalau pakai FormData
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let msg = isEdit ? "Gagal Mengupdate Materi" : "Gagal Menyimpan Materi";
        try {
          const err = await res.json();
          if (err?.detail) msg = err.detail;
        } catch {
          // ignore parse error
        }
        throw new Error(msg);
      }

      // Jika sukses:
      setInfoMessage(
        isEdit ? "Materi Berhasil Diperbarui" : "Materi Berhasil Disimpan"
      );
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
        <AddMateriForm
          onAddMateri={handleAddMateri}
          onCancel={handleCancel}
          initialData={initialData || undefined}
        />
      </div>

      {isLoading && <LoadingOverlay />}
    </LayoutForm>
  );
};

export default MateriDetailPage;
