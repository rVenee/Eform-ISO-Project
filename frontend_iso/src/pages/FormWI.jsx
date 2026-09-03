import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Info, X, Save, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/axios';

export default function FormWI() {
  const navigate = useNavigate();
  const { id } = useParams(); // Tangkap ID dari URL

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  // State Utama Form Dinamis
  const [formData, setFormData] = useState({
    judul: '',
    tujuan: '',
    ruang_lingkup: '',
    langkah_kerja: [
      { deskripsi: '', sub_langkah: [{ deskripsi: '' }] }
    ],
    kesehatan_kerja: [{ deskripsi: '' }],
    keselamatan_kerja: [{ deskripsi: '' }],
    dokumen_terkait: [{ nomor: '', deskripsi: '' }],
    lampiran: [{ judul: '', file: null, fileName: '' }]
  });

  // 1. Logika Load Data (Edit Mode) ATAU Restore Backup (New Mode)
  useEffect(() => {
    if (id) {
      const fetchDocument = async () => {
        try {
          const response = await apiClient.get(`/documents/${id}/detail`);
          const { metadata, isi_form } = response.data;
          
          if (isi_form) {
            setFormData({
              judul: metadata.title || '',
              tujuan: isi_form.tujuan || '',
              ruang_lingkup: isi_form.ruang_lingkup || '',
              langkah_kerja: isi_form.langkah_kerja?.length ? isi_form.langkah_kerja : [{ deskripsi: '', sub_langkah: [{ deskripsi: '' }] }],
              kesehatan_kerja: isi_form.kesehatan_kerja?.length ? isi_form.kesehatan_kerja : [{ deskripsi: '' }],
              keselamatan_kerja: isi_form.keselamatan_kerja?.length ? isi_form.keselamatan_kerja : [{ deskripsi: '' }],
              dokumen_terkait: isi_form.dokumen_terkait?.length ? isi_form.dokumen_terkait : [{ nomor: '', deskripsi: '' }],
              // File fisik tidak ditarik, hanya judul lampirannya saja
              lampiran: isi_form.lampiran?.length 
                ? isi_form.lampiran.map(l => ({ judul: l.judul, file: null, fileName: '' })) 
                : [{ judul: '', file: null, fileName: '' }]
            });
          } else {
            setFormData(prev => ({ ...prev, judul: metadata.title || '' }));
          }
        } catch (error) {
          setStatus({ type: 'error', message: 'Gagal memuat data dokumen untuk diedit.' });
        }
      };
      fetchDocument();
    } else {
      // Jika mode buat baru, cek apakah ada backup form
      const savedBackup = localStorage.getItem('wi_form_backup');
      if (savedBackup) {
        if (window.confirm("Ditemukan draf isian sebelumnya yang belum terkirim. Ingin melanjutkannya?")) {
          setFormData(JSON.parse(savedBackup));
        } else {
          localStorage.removeItem('wi_form_backup');
        }
      }
    }
  }, [id]);

  // 2. Logika Auto-Save Realtime
  useEffect(() => {
    if (!id && formData.judul !== '') {
      localStorage.setItem('wi_form_backup', JSON.stringify(formData));
    }
  }, [formData, id]);

  // --- HANDLER DASAR ---
  const handleBasicChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- HANDLER ARRAY 1 TINGKAT ---
  const handleArrayChange = (arrayName, index, field, value) => {
    const newArray = [...formData[arrayName]];
    newArray[index][field] = value;
    setFormData(prev => ({ ...prev, [arrayName]: newArray }));
  };

  const addArrayItem = (arrayName, defaultItem) => {
    setFormData(prev => ({ ...prev, [arrayName]: [...prev[arrayName], defaultItem] }));
  };

  const removeArrayItem = (arrayName, index) => {
    const newArray = formData[arrayName].filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [arrayName]: newArray }));
  };

  // --- HANDLER ARRAY BERSARANG (Langkah Kerja) ---
  const handleLangkahChange = (index, value) => {
    const newLangkah = [...formData.langkah_kerja];
    newLangkah[index].deskripsi = value;
    setFormData(prev => ({ ...prev, langkah_kerja: newLangkah }));
  };

  const handleSubLangkahChange = (langkahIndex, subIndex, value) => {
    const newLangkah = [...formData.langkah_kerja];
    newLangkah[langkahIndex].sub_langkah[subIndex].deskripsi = value;
    setFormData(prev => ({ ...prev, langkah_kerja: newLangkah }));
  };

  const addLangkah = () => {
    setFormData(prev => ({
      ...prev,
      langkah_kerja: [...prev.langkah_kerja, { deskripsi: '', sub_langkah: [{ deskripsi: '' }] }]
    }));
  };

  const addSubLangkah = (langkahIndex) => {
    const newLangkah = [...formData.langkah_kerja];
    newLangkah[langkahIndex].sub_langkah.push({ deskripsi: '' });
    setFormData(prev => ({ ...prev, langkah_kerja: newLangkah }));
  };

  const removeSubLangkah = (langkahIndex, subIndex) => {
    const newLangkah = [...formData.langkah_kerja];
    newLangkah[langkahIndex].sub_langkah = newLangkah[langkahIndex].sub_langkah.filter((_, i) => i !== subIndex);
    setFormData(prev => ({ ...prev, langkah_kerja: newLangkah }));
  };

  const removeLangkah = (langkahIndex) => {
    const newLangkah = formData.langkah_kerja.filter((_, i) => i !== langkahIndex);
    setFormData(prev => ({ ...prev, langkah_kerja: newLangkah }));
  };

  // --- HANDLER FILE UPLOAD ---
  const handleFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const newLampiran = [...formData.lampiran];
      newLampiran[index].file = file;
      newLampiran[index].fileName = file.name;
      setFormData(prev => ({ ...prev, lampiran: newLampiran }));
    }
  };

  // --- VALIDASI PRE-SUBMIT ---
  const handlePreSubmit = () => {
    // Validasi Field Teks Dasar
    if (!formData.judul.trim() || !formData.tujuan.trim() || !formData.ruang_lingkup.trim()) {
      alert("⚠️ Harap lengkapi field wajib: Judul, Tujuan, dan Ruang Lingkup.");
      return;
    }

    // Validasi Langkah Kerja (Minimal 1 terisi)
    const hasLangkahKerja = formData.langkah_kerja.some(l => l.deskripsi.trim() !== '');
    if (!hasLangkahKerja) {
      alert("⚠️ Harap isi setidaknya satu Langkah Kerja Utama.");
      return;
    }

    // Validasi Kesehatan & Keselamatan Kerja (Minimal 1 terisi)
    const hasKesehatan = formData.kesehatan_kerja.some(k => k.deskripsi.trim() !== '');
    const hasKeselamatan = formData.keselamatan_kerja.some(k => k.deskripsi.trim() !== '');
    
    if (!hasKesehatan) {
      alert("⚠️ Harap isi setidaknya satu poin Kesehatan Kerja.");
      return;
    }
    if (!hasKeselamatan) {
      alert("⚠️ Harap isi setidaknya satu poin Keselamatan Kerja.");
      return;
    }

    const hasDokumenTerkait = formData.dokumen_terkait.some(d => d.nomor.trim() !== '' && d.deskripsi.trim() !== '');
    if (!hasDokumenTerkait) {
      alert("⚠️ Harap isi setidaknya satu Dokumen Terkait (Nomor dan Deskripsi).");
      return;
    }

    // Jika semua validasi lolos, munculkan modal konfirmasi
    setShowConfirm(true);
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    let currentDocId = id;

    try {
      // TAHAP 1: Metadata Dokumen
      if (id) {
        await apiClient.put(`/documents/${id}`, {
          category: 'WI',
          title: formData.judul,
          status: isDraft ? 'Draft' : 'Menunggu'
        });
      } else {
        const docRes = await apiClient.post('/documents/', {
          category: 'WI',
          title: formData.judul,
          status: isDraft ? 'Draft' : 'Menunggu'
        });
        currentDocId = docRes.data.document_id;
      }

      // TAHAP 2: Simpan Isi JSON
      const cleanArray = (arr) => arr.filter(item => item.deskripsi && item.deskripsi.trim() !== '');
      
      const cleanDataWithoutFiles = { 
        ...formData, 
        status: isDraft ? 'Draft' : 'Menunggu',
        kesehatan_kerja: cleanArray(formData.kesehatan_kerja),
        keselamatan_kerja: cleanArray(formData.keselamatan_kerja),
        dokumen_terkait: formData.dokumen_terkait.filter(doc => doc.nomor.trim() !== '' || doc.deskripsi.trim() !== ''),
        lampiran: formData.lampiran.map(l => ({ judul: l.judul })).filter(l => l.judul.trim() !== ''),
        langkah_kerja: formData.langkah_kerja.map(langkah => ({
          ...langkah,
          sub_langkah: cleanArray(langkah.sub_langkah)
        })).filter(langkah => langkah.deskripsi.trim() !== '' || langkah.sub_langkah.length > 0)
      };

      await apiClient.post(`/documents/${currentDocId}/contents`, {
        form_data: cleanDataWithoutFiles
      });

      // TAHAP 3: Upload Lampiran
      for (let i = 0; i < formData.lampiran.length; i++) {
        const lamp = formData.lampiran[i];
        if (lamp.file) {
          const fileData = new FormData();
          fileData.append('subchapter_reference', `6.${i + 1} ${lamp.judul}`);
          fileData.append('file', lamp.file);
          
          await apiClient.post(`/documents/${currentDocId}/attachments`, fileData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      setStatus({ type: 'success', message: `Dokumen WI berhasil ${isDraft ? 'disimpan sebagai draft' : 'diajukan'}!` });
      localStorage.removeItem('wi_form_backup'); 

      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Gagal mengirim dokumen ke server.' 
      });
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } 
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-8 md:p-12">
        
        {status.message && (
          <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 font-medium text-sm border ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </div>
        )}

        <form>
          {/* =========================================
              Informasi Umum
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center shrink-0 mt-1">
              <Info size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Informasi Umum</h2>
              <p className="text-sm text-gray-400 mb-6">Judul instruksi kerja</p>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-2">Judul Instruksi Kerja <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.judul}
                  onChange={(e) => handleBasicChange('judul', e.target.value)}
                  placeholder="Contoh: Bongkar Pasang Atap" 
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700"
                  required
                />
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* =========================================
              1. Tujuan
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center font-bold text-lg shrink-0 mt-1">1</div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Tujuan</h2>
              <p className="text-sm text-gray-400 mb-6">Jelaskan tujuan dari instruksi kerja ini.</p>
              <textarea 
                rows="3"
                value={formData.tujuan}
                onChange={(e) => handleBasicChange('tujuan', e.target.value)}
                placeholder="Tuliskan tujuan disini..." 
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700 resize-none"
              ></textarea>
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* =========================================
              2. Ruang Lingkup
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center font-bold text-lg shrink-0 mt-1">2</div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Ruang Lingkup</h2>
              <p className="text-sm text-gray-400 mb-6">Area atau cakupan berlakunya instruksi kerja ini</p>
              <input 
                type="text" 
                value={formData.ruang_lingkup}
                onChange={(e) => handleBasicChange('ruang_lingkup', e.target.value)}
                placeholder="Contoh: Seluruh atap under paper area" 
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700"
              />
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* =========================================
              3. Langkah Kerja
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center font-bold text-lg shrink-0 mt-1">3</div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Langkah Kerja</h2>
              <p className="text-sm text-gray-400 mb-8">Uraikan setiap langkah kerja</p>

              <div className="space-y-8">
                {formData.langkah_kerja.map((langkah, lIndex) => (
                  <div key={lIndex} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="text-sm font-bold text-[#126863] pt-3.5 w-8">3.{lIndex + 1}</span>
                      <input 
                        type="text" 
                        value={langkah.deskripsi}
                        onChange={(e) => handleLangkahChange(lIndex, e.target.value)}
                        placeholder={`Uraikan langkah kerja utama ${lIndex + 1}`} 
                        className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                      />
                      {formData.langkah_kerja.length > 1 && (
                        <button type="button" onClick={() => removeLangkah(lIndex)} className="h-[50px] w-[50px] flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shrink-0">
                          <X size={20} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    
                    <div className="pl-12 space-y-4">
                      {langkah.sub_langkah.map((sub, sIndex) => (
                        <div key={sIndex} className="flex items-start gap-4">
                          <span className="text-sm font-bold text-[#126863] pt-3.5 w-10">3.{lIndex + 1}.{sIndex + 1}</span>
                          <input 
                            type="text" 
                            value={sub.deskripsi}
                            onChange={(e) => handleSubLangkahChange(lIndex, sIndex, e.target.value)}
                            placeholder={`Uraikan sub-langkah ${sIndex + 1}`} 
                            className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                          />
                          <button type="button" onClick={() => removeSubLangkah(lIndex, sIndex)} className="h-[50px] w-[50px] flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shrink-0">
                            <X size={20} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addSubLangkah(lIndex)} className="px-5 py-2.5 border border-dashed border-[#126863] text-[#126863] text-sm font-bold rounded-xl hover:bg-[#f0f7f7] transition-colors">
                        + Tambah Subbab
                      </button>
                    </div>
                  </div>
                ))}
                
                <button type="button" onClick={addLangkah} className="px-5 py-2.5 border border-dashed border-[#126863] text-[#126863] text-sm font-bold rounded-xl hover:bg-[#f0f7f7] transition-colors mt-4">
                  + Tambah Langkah Kerja Utama
                </button>
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* =========================================
              4. Kesehatan & Keselamatan Kerja
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center font-bold text-lg shrink-0 mt-1">4</div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Kesehatan & Keselamatan Kerja</h2>
              <p className="text-sm text-gray-400 mb-8">Uraikan poin-poin kesehatan dan keselamatan kerja</p>
              
              <div className="space-y-8">
                {/* 4.1 Kesehatan */}
                <div>
                  <h3 className="font-bold text-gray-600 mb-4">4.1 Kesehatan Kerja</h3>
                  {formData.kesehatan_kerja.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 mb-4">
                      <span className="text-sm font-bold text-[#126863] pt-3.5 w-10">4.1.{index + 1}</span>
                      <input 
                        type="text" 
                        value={item.deskripsi}
                        onChange={(e) => handleArrayChange('kesehatan_kerja', index, 'deskripsi', e.target.value)}
                        placeholder="Poin kesehatan kerja" 
                        className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                      />
                      <button type="button" onClick={() => removeArrayItem('kesehatan_kerja', index)} className="h-[50px] w-[50px] flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shrink-0">
                        <X size={20} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem('kesehatan_kerja', { deskripsi: '' })} className="px-5 py-2.5 border border-dashed border-[#126863] text-[#126863] text-sm font-bold rounded-xl hover:bg-[#f0f7f7] ml-14">
                    + Tambah Poin Kesehatan Kerja
                  </button>
                </div>

                {/* 4.2 Keselamatan */}
                <div>
                  <h3 className="font-bold text-gray-600 mb-4">4.2 Keselamatan Kerja</h3>
                  {formData.keselamatan_kerja.map((item, index) => (
                    <div key={index} className="flex items-start gap-4 mb-4">
                      <span className="text-sm font-bold text-[#126863] pt-3.5 w-10">4.2.{index + 1}</span>
                      <input 
                        type="text" 
                        value={item.deskripsi}
                        onChange={(e) => handleArrayChange('keselamatan_kerja', index, 'deskripsi', e.target.value)}
                        placeholder="Poin keselamatan kerja" 
                        className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                      />
                      <button type="button" onClick={() => removeArrayItem('keselamatan_kerja', index)} className="h-[50px] w-[50px] flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shrink-0">
                        <X size={20} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArrayItem('keselamatan_kerja', { deskripsi: '' })} className="px-5 py-2.5 border border-dashed border-[#126863] text-[#126863] text-sm font-bold rounded-xl hover:bg-[#f0f7f7] ml-14">
                    + Tambah Poin Keselamatan Kerja
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* =========================================
              5. Dokumen Terkait
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center font-bold text-lg shrink-0 mt-1">5</div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Dokumen Terkait</h2>
              <p className="text-sm text-gray-400 mb-8">Cantumkan dokumen terkait</p>
              
              <div className="space-y-4">
                {formData.dokumen_terkait.map((doc, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <span className="text-sm font-bold text-[#126863] pt-3.5 w-8">5.{index + 1}</span>
                    <input 
                      type="text" 
                      value={doc.nomor}
                      onChange={(e) => handleArrayChange('dokumen_terkait', index, 'nomor', e.target.value)}
                      placeholder="NOMOR DOKUMEN" 
                      className="w-56 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                    />
                    <input 
                      type="text" 
                      value={doc.deskripsi}
                      onChange={(e) => handleArrayChange('dokumen_terkait', index, 'deskripsi', e.target.value)}
                      placeholder="Deskripsi Dokumen" 
                      className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                    />
                    <button type="button" onClick={() => removeArrayItem('dokumen_terkait', index)} className="h-[50px] w-[50px] flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shrink-0">
                      <X size={20} strokeWidth={2} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('dokumen_terkait', { nomor: '', deskripsi: '' })} className="px-5 py-2.5 border border-dashed border-[#126863] text-[#126863] text-sm font-bold rounded-xl hover:bg-[#f0f7f7] ml-12">
                  + Tambah Dokumen Terkait
                </button>
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          {/* =========================================
              6. Lampiran (File Upload)
          ========================================= */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#f0f7f7] text-[#126863] flex items-center justify-center font-bold text-lg shrink-0 mt-1">6</div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-[#126863] leading-none mb-1">Lampiran</h2>
              <p className="text-sm text-gray-400 mb-8">Lampiran dalam bentuk tabel atau gambar (PDF/Word/Image)</p>
              
              <div className="space-y-8">
                {formData.lampiran.map((lamp, index) => (
                  <div key={index}>
                    <div className="flex items-start gap-4 mb-3">
                      <span className="text-sm font-bold text-[#126863] pt-3.5 w-8">6.{index + 1}</span>
                      <input 
                        type="text" 
                        value={lamp.judul}
                        onChange={(e) => handleArrayChange('lampiran', index, 'judul', e.target.value)}
                        placeholder="Judul Lampiran" 
                        className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863]" 
                      />
                      <button type="button" onClick={() => removeArrayItem('lampiran', index)} className="h-[50px] w-[50px] flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 shrink-0">
                        <X size={20} strokeWidth={2} />
                      </button>
                    </div>
                    <div className="ml-12 flex items-center gap-4">
                      <label className="cursor-pointer px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                        Unggah File
                        <input type="file" className="hidden" onChange={(e) => handleFileChange(index, e)} />
                      </label>
                      {lamp.fileName && <span className="text-sm text-[#126863] font-medium">{lamp.fileName}</span>}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addArrayItem('lampiran', { judul: '', file: null, fileName: '' })} className="px-5 py-2.5 border border-dashed border-[#126863] text-[#126863] text-sm font-bold rounded-xl hover:bg-[#f0f7f7] ml-12">
                  + Tambah Lampiran
                </button>
              </div>
            </div>
          </div>

          {/* =========================================
              Footer Actions
          ========================================= */}
          <div className="flex justify-end gap-4 mt-16 pt-8 border-t border-gray-200">
            <button 
              type="button" 
              onClick={(e) => handleSubmit(e, true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3.5 border border-gray-200 text-[#126863] bg-white rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-70"
            >
              <Save size={18} strokeWidth={2.5} />
              Simpan Draft
            </button>
            <button 
              type="button"
              onClick={handlePreSubmit} 
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3.5 bg-[#126863] text-white rounded-xl font-bold text-sm hover:bg-[#0d4f4c] shadow-sm transition-colors disabled:opacity-70"
            >
              <Send size={18} strokeWidth={2.5} />
              Submit ke Unit ISO
            </button>
          </div>
        </form>

      </div>

      {/* =========================================
          Modal Konfirmasi Double Check
      ========================================= */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[20px] w-full max-w-md p-7 shadow-2xl">
            <h3 className="text-xl font-black text-[#126863] mb-3">Konfirmasi Pengiriman</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Dokumen akan masuk ke antrean <strong>Unit ISO</strong> dan tidak dapat diedit kembali kecuali statusnya dikembalikan menjadi Direvisi.
              <br /><br />
              <span className="p-3 bg-[#f0f7f7] border border-[#126863]/20 rounded-lg block text-[#126863]">
                <strong>💡 Tips:</strong> Ingin memastikan PDF sudah rapi? Pilih <strong>Batal</strong>, klik <strong>Simpan Draft</strong>, lalu gunakan ikon mata di Riwayat Saya untuk melihat pratinjau.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Batal
              </button>
              <button type="button" onClick={(e) => { setShowConfirm(false); handleSubmit(e, false); }} className="px-5 py-2.5 text-sm font-bold text-white bg-[#126863] rounded-xl hover:bg-[#0d4f4c] shadow-sm transition-colors flex items-center gap-2">
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )} 
      
      {/* =========================================
          Overlay Loading Global
      ========================================= */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-14 h-14 border-4 border-[#126863]/20 border-t-[#126863] rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-bold text-[#126863]">Menyimpan Dokumen...</h3>
          <p className="text-sm text-gray-500 mt-2">Mohon tunggu, jangan tutup halaman ini.</p>
        </div>
      )}
    </div>
  );
}