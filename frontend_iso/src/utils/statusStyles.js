export const STATUS_STYLES = {
  'Draft': 'bg-gray-100 text-gray-600',

  'Menunggu Unit Head': 'bg-amber-100 text-amber-800',
  'Verifikasi Akhir Unit Head': 'bg-orange-100 text-orange-800',

  'Menunggu Division Head': 'bg-yellow-100 text-yellow-800',
  'Verifikasi Akhir Division Head': 'bg-amber-200 text-amber-900',

  'Menunggu ISO': 'bg-cyan-100 text-cyan-800',

  'Menunggu QMR': 'bg-purple-100 text-purple-800',
  'Menunggu EMR': 'bg-violet-100 text-violet-800',
  'Menunggu EnMR': 'bg-indigo-100 text-indigo-800',
  'Menunggu SMR': 'bg-rose-100 text-rose-800',
  'Menunggu KAHI': 'bg-fuchsia-100 text-fuchsia-800',
  'Menunggu MR': 'bg-blue-100 text-blue-800',
  'Menunggu HRD': 'bg-pink-100 text-pink-800',
  'Menunggu Mill Head': 'bg-sky-100 text-sky-800',

  'Direview': 'bg-blue-200 text-blue-900',
  'Direvisi': 'bg-red-100 text-red-800',
  'Disetujui': 'bg-green-100 text-green-800',
};

export function getStatusStyle(status) {
  return STATUS_STYLES[status] || 'bg-gray-100 text-gray-500';
}