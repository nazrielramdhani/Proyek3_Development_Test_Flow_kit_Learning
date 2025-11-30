// frontend-dev/src/pages/MateriDetailPage.tsx

import AddMateriForm from "@/components/custom/AddMateriForm";
import LayoutForm from "./LayoutForm"; // Pastikan path import ini sesuai
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";

const MateriDetailPage = () => {
    const navigate = useNavigate();
    // const apiUrl = import.meta.env.VITE_API_URL;
    // let apiKey = import.meta.env.VITE_API_KEY;

    const [isLoading, setIsLoading] = useState(false);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [screenName, setScreenName] = useState("Tambah Materi Pembelajaran");

    // Cek Session (Sama seperti ModuleTestPage)
    useEffect(() => {
        const sessionData = localStorage.getItem('session');
        if (!sessionData) {
             navigate("/login");
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
        navigate('/learning-materi'); 
    };

    const handleAddMateri = async (data: any, file: File | null) => {
        setIsLoading(true);
        console.log("Data Form:", data);
        console.log("File Upload:", file);

        try {
            // --- SIMULASI API CALL ---
            // Nanti diganti dengan fetch ke endpoint /materi/add
            
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulasi delay
            
            // Jika sukses:
            setInfoMessage("Materi Berhasil Disimpan");
            setTimeout(() => {
                setInfoMessage(null);
                navigate('/materi');
            }, 2000);

        } catch (error) {
            console.error(error);
            setErrorMessage("Gagal Menyimpan Materi");
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
                />
            </div>

            {isLoading && <LoadingOverlay />}
        </LayoutForm>
    );
};

export default MateriDetailPage;