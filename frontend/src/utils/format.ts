import { formatDistanceToNow, format } from 'date-fns';

export const formatDate = (dateStr: string) =>
  format(new Date(dateStr), 'MMM d, yyyy');

export const formatDateTime = (dateStr: string) =>
  format(new Date(dateStr), 'MMM d, yyyy h:mm a');

export const formatRelative = (dateStr: string) =>
  formatDistanceToNow(new Date(dateStr), { addSuffix: true });

export const formatAction = (action: string): string =>
  action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
