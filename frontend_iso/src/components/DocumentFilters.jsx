import { Search, ChevronDown } from 'lucide-react';

export const CATEGORY_OPTIONS = [
  { value: 'WI', label: 'WI' },
  { value: 'SOP', label: 'SOP' },
  { value: 'DOP', label: 'DOP' },
  { value: 'EII', label: 'EII' },
];

export const OTHER_CATEGORY_OPTIONS = [
  { value: 'JB', label: 'JB' },
  { value: 'QMS', label: 'QMS' },
  { value: 'QMS_SP', label: 'QMS_SP' },
  { value: 'TM', label: 'TM' },
  { value: 'EMS', label: 'EMS' },
  { value: 'CM', label: 'CM' },
];

export const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Menunggu Unit Head', label: 'Menunggu Unit Head' },
  { value: 'Menunggu Division Head', label: 'Menunggu Division Head' },
  { value: 'Menunggu ISO', label: 'Menunggu ISO' },
  { value: 'Menunggu QMR', label: 'Menunggu QMR' },
  { value: 'Menunggu EMR', label: 'Menunggu EMR' },
  { value: 'Menunggu EnMR', label: 'Menunggu EnMR' },
  { value: 'Menunggu SMR', label: 'Menunggu SMR' },
  { value: 'Menunggu KAHI', label: 'Menunggu KAHI' },
  { value: 'Menunggu MR', label: 'Menunggu MR' },
  { value: 'Menunggu HRD', label: 'Menunggu HRD' },
  { value: 'Menunggu Mill Head', label: 'Menunggu Mill Head' },
  { value: 'Direview', label: 'Direview' },
  { value: 'Direvisi', label: 'Direvisi' },
  { value: 'Disetujui', label: 'Disetujui' },
];

export default function DocumentFilters({
  searchQuery, onSearchChange, searchPlaceholder = 'Cari berdasarkan Judul atau No. Dokumen...',
  category, onCategoryChange,
  statusFilter, onStatusChange, statusDisabled = false, lockedStatusLabel = '',
  startDate, onStartDateChange,
  endDate, onEndDateChange,
  onReset,
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 mb-4">
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center text-gray-400"><Search size={18} strokeWidth={2} /></span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#126863] text-gray-700 placeholder-gray-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none bg-white cursor-pointer"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <optgroup label="Others">
                {OTHER_CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={statusDisabled}
              className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#126863] appearance-none ${statusDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
            >
              {statusDisabled ? (
                <option value="">{lockedStatusLabel}</option>
              ) : (
                <>
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">From date</label>
          <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white cursor-pointer" />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">To date</label>
          <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#126863] bg-white cursor-pointer" />
        </div>
        <button onClick={onReset} className="w-full md:w-40 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors h-[42px] shrink-0">Reset filters</button>
      </div>
    </div>
  );
}