export const ROLE_LABELS = {
  admin_iso: 'Unit ISO',
  admin_it: 'Admin IT',
  unit_head: 'Unit Head',
  division_head: 'Division Head',
  qmr: 'QMR',
  emr: 'EMR',
  enmr: 'EnMR',
  smr: 'SMR',
  kahi: 'KAHI',
  mr: 'MR',
  hrd: 'HRD',
  mill_head: 'Mill Head',
  applicator: 'Applicator',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}