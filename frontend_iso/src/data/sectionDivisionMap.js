export const DIVISIONS = [
  { code: 'MHO', name: 'Mill Head Office' },
  { code: 'MHO P', name: 'Mill Head Office Paper' },
  { code: 'PPD', name: 'Pulp Production Division' },
  { code: 'PMD', name: 'Pulp Machine Division' },
  { code: 'WPD', name: 'Wood Preparation Division' },
  { code: 'EGD', name: 'Energy Division' },
  { code: 'RBP', name: 'Recovery Boiler Division' },
  { code: 'CMD', name: 'Chemical Division' },
  { code: 'LGD', name: 'Logistic Division' },
  { code: 'SCA', name: 'Supply Chain Division Paper' },
  { code: 'SCM', name: 'Supply Chain Division Material' },
  { code: 'PO', name: 'Purchasing' },
  { code: 'MTD', name: 'Pulp Maintenance Division' },
  { code: 'ECD', name: 'Engineering & Construction Mill Division' },
  { code: 'TEA', name: 'Technical Paper Division' },
  { code: 'TEU', name: 'Technical Pulp Division' },
  { code: 'ITD', name: 'Information Technology Division' },
  { code: 'PASR', name: 'Public Affair & Sustainable Resiliance Division' },
  { code: 'EWD', name: 'Environmental Protection & Water Treatment Division' },
  { code: 'HRD', name: 'Human Resource Division' },
  { code: 'EPPS', name: 'Energy & Pulp Production School' },
  { code: 'PAP-1', name: 'Paper Production 1 Division' },
  { code: 'PAP-2', name: 'Paper Production 2 Division' },
  { code: 'PAP-3', name: 'Paper Brown Production 3 Division' },
  { code: 'FCP', name: 'Finishing Division' },
  { code: 'EMA', name: 'Engineering & Maintenance Paper Division' },
  { code: 'TIP-4', name: 'TIP-4' },
];

// section -> kode divisi
export const SECTION_TO_DIVISION = {
  // MHO
  'MBOS': 'MHO', 'EFT': 'MHO',
  // MHO P
  'MHO P': 'MHO P',
  // PPD
  'FL-1': 'PPD', 'FL-2': 'PPD', 'FL-8': 'PPD', 'FL-9': 'PPD',
  // PMD
  'PD-1': 'PMD', 'PD-2': 'PMD', 'PD-3': 'PMD', 'PD-4': 'PMD',
  'PD-8': 'PMD', 'PD-9': 'PMD', 'PD-10': 'PMD', 'PD-11': 'PMD',
  // WPD
  'RW': 'WPD', 'WP-2': 'WPD', 'WP-8': 'WPD', 'WP-9': 'WPD',
  // EGD
  'PG#1': 'EGD', 'PG#2': 'EGD', 'PG#3': 'EGD',
  'PB#1': 'EGD', 'PB#2': 'EGD', 'PB#3': 'EGD', 'SU': 'EGD',
  // RBP
  'RB-1': 'RBP', 'RB-2': 'RBP', 'RB13': 'RBP', 'RC': 'RBP',
  // CMD (format gabungan dipertahankan sesuai keputusan)
  'CM-1(2,8,12,13)': 'CMD', 'CM-2(9,10,11,SO)': 'CMD',
  'CA(#8,9,10)': 'CMD', 'CP(02 & PAC)': 'CMD',
  // LGD
  'OP': 'LGD', 'CY': 'LGD', 'IE': 'LGD',
  // SCA
  'AW': 'SCA', 'CS-P': 'SCA', 'PPIC': 'SCA', 'PL': 'SCA',
  // SCM
  'RM': 'SCM', 'SW': 'SCM', 'UW': 'SCM',
  // PO
  'PO': 'PO',
  // MTD
  'MRD': 'MTD', 'MMW': 'MTD', 'MMF': 'MTD', 'MWS': 'MTD', 'MEU': 'MTD',
  'MMP': 'MTD', 'MMR': 'MTD', 'MMC': 'MTD', 'MHE': 'MTD', 'MIA': 'MTD',
  'MEF': 'MTD', 'MEC': 'MTD', 'MER': 'MTD', 'MEP': 'MTD', 'MIF': 'MTD',
  'MIP': 'MTD', 'MIR': 'MTD', 'MIC': 'MTD',
  // ECD
  'ENG': 'ECD', 'PJ': 'ECD', 'CW': 'ECD', 'DS': 'ECD',
  // TEA
  'QC-1': 'TEA', 'QC-2': 'TEA', 'QC-3': 'TEA', 'QC-4': 'TEA',
  'QC-5': 'TEA', 'QC-6': 'TEA', 'QC-7': 'TEA',
  // TEU
  'LB': 'TEU', 'R&D': 'TEU', 'RMC': 'TEU', 'LCQ': 'TEU', 'WQC': 'TEU',
  // ITD
  'ITH': 'ITD', 'ITM': 'ITD', 'ITL': 'ITD', 'ITN': 'ITD', 'ITW': 'ITD',
  // PASR
  'LC': 'PASR', 'PA': 'PASR', 'CSR': 'PASR', 'SF': 'PASR',
  'GA': 'PASR', 'SC': 'PASR', 'MS': 'PASR',
  // EWD
  'FU': 'EWD', 'EN': 'EWD', 'WT': 'EWD',
  // HRD
  'HO': 'HRD', 'OD': 'HRD', 'IR': 'HRD', 'RE': 'HRD',
  // EPPS
  'EPPS': 'EPPS',
  // PAP-1
  'PPM-1': 'PAP-1', 'PPM-5': 'PAP-1', 'PPM-7': 'PAP-1', 'PPM-8': 'PAP-1',
  // PAP-2
  'PPM-2': 'PAP-2', 'PPM-3': 'PAP-2', 'PPM-6': 'PAP-2',
  // PAP-3
  'PPM-4': 'PAP-3', 'PPM-9': 'PAP-3', 'GCC': 'PAP-3',
  // FCP
  'FCP': 'FCP', 'FS-1': 'FCP', 'FS-3': 'FCP', 'FS-6': 'FCP',
  'CS-1': 'FCP', 'CS-3': 'FCP', 'CS-6': 'FCP', 'CB': 'FCP',
  'PC': 'FCP', 'PW': 'FCP', 'ROLL': 'FCP', 'STT': 'FCP', 'OF': 'FCP',
  // EMA
  'EMA': 'EMA', 'EWA': 'EMA', 'AM1': 'EMA', 'AM2': 'EMA', 'AM3': 'EMA',
  'AM4': 'EMA', 'AM5': 'EMA', 'FMD': 'EMA', 'PPA': 'EMA', 'RL': 'EMA',
  'RSG': 'EMA', 'CWP': 'EMA', 'AES': 'EMA',
  // TIP-4
  'TD-9': 'TIP-4',
};

export const ALL_SECTIONS = Object.keys(SECTION_TO_DIVISION);