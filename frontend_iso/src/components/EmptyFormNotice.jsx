import { Construction } from 'lucide-react';

export default function EmptyFormNotice({ title }) {
  return (
    <div className="max-w-6xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-160px)]">
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-12 w-full max-w-3xl flex flex-col items-center text-center">
        
        <div className="w-20 h-20 bg-[#f0f7f7] text-[#126863] rounded-2xl flex items-center justify-center mb-6 border border-teal-100 shadow-inner">
          <Construction size={40} strokeWidth={1.5} />
        </div>

        <h2 className="text-2xl font-black text-[#126863] mb-3">
          E-Form {title} belum tersedia
        </h2>
        
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">
          Untuk saat ini gunakan tab <strong>Others</strong> untuk mengunggah dokumen secara manual.
        </p>

      </div>
    </div>
  );
}