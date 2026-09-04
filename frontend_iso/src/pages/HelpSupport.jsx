import { LifeBuoy } from 'lucide-react';

export default function HelpSupport() {
  return (
    <div className="max-w-6xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-160px)]">
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-12 w-full max-w-3xl flex flex-col items-center text-center">
        
        {/* Ikon dengan Container rounded-2xl seperti di EmptyFormNotice */}
        <div className="w-20 h-20 bg-[#f0f7f7] text-[#126863] rounded-2xl flex items-center justify-center mb-6 border border-teal-100 shadow-inner">
          <LifeBuoy size={40} strokeWidth={1.5} />
        </div>

        {/* Judul dengan styling font-black dan warna #126863 */}
        <h2 className="text-2xl font-black text-[#126863] mb-3">
          Butuh bantuan dengan E-Form ISO?
        </h2>
        
        {/* Paragraf deskripsi yang rapi */}
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">
          Hubungi Unit ISO di ext. <span className="font-bold text-gray-700">2200</span> atau kirim email ke{' '}
          <a href="mailto:iso.support@indahkiat.co.id" className="text-[#126863] font-bold hover:underline">
            iso.support@indahkiat.co.id
          </a>
        </p>

      </div>
    </div>
  );
}