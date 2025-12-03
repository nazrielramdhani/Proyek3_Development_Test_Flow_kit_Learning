import React, { ReactNode } from "react";
import NavbarForm from "@/components/custom/NavbarForm";

interface LayoutFormProps {
  children: ReactNode;
  screenName: string;
  backUrl?: string; // Menambahkan prop optional backUrl
}

const LayoutForm: React.FC<LayoutFormProps> = ({ children, screenName, backUrl }) => {
  return (
    <div>
      {/* Meneruskan backUrl ke NavbarForm */}
      <NavbarForm screenName={screenName} backUrl={backUrl} />
      <main id="main">
        {children}
      </main>
    </div>
  );
};

export default LayoutForm;