import { formatDistanceToNow, format } from 'date-fns';

export const formatDate = (dateStr: string) =>
  format(new Date(dateStr), 'MMM d, yyyy');

export const formatDateTime = (dateStr: string) =>
  format(new Date(dateStr), 'MMM d, yyyy h:mm a');

export const formatRelative = (dateStr: string) =>
  formatDistanceToNow(new Date(dateStr), { addSuffix: true });

export const formatAction = (action: string): string =>
  action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// A "custom" branch stores the real branch the requester typed in extra_meta.base_branch.
export const formatBranch = (dep: { branch_name: string; extra_meta?: unknown }): string => {
  if (dep.branch_name !== 'custom') return dep.branch_name;
  let meta: { base_branch?: string } = {};
  try {
    meta = typeof dep.extra_meta === 'string' ? JSON.parse(dep.extra_meta) : (dep.extra_meta as typeof meta) || {};
  } catch { /* malformed extra_meta: fall back to the bare label */ }
  return meta.base_branch?.trim() ? `custom → ${meta.base_branch.trim()}` : 'custom';
};
