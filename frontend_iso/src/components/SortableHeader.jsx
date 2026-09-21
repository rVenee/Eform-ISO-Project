import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function SortableHeader({ label, sortKey, sortConfig, onSort, className = '', thClassName = '' }) {
  const isActive = sortConfig.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
  const iconColor = !isActive ? 'text-gray-300' : 'text-[#126863]';

  return (
    <th className={`px-5 py-4 ${thClassName}`}>
      <button onClick={() => onSort(sortKey)} className={`flex items-center gap-1.5 hover:text-gray-800 uppercase ${className}`}>
        {label} <Icon size={12} className={iconColor} />
      </button>
    </th>
  );
}