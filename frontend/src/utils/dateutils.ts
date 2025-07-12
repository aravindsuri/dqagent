import { format, parseISO, differenceInDays, isValid } from 'date-fns';

export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'Invalid Date';
  }
};

export const getDaysRemaining = (dueDateString: string): number => {
  try {
    const dueDate = parseISO(dueDateString);
    const now = new Date();
    return differenceInDays(dueDate, now);
  } catch {
    return 0;
  }
};

export const getTimeAgo = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
  } catch {
    return 'Unknown';
  }
};

export const isOverdue = (dueDateString: string): boolean => {
  return getDaysRemaining(dueDateString) < 0;
};

export const isDueSoon = (dueDateString: string, daysThreshold: number = 3): boolean => {
  const daysRemaining = getDaysRemaining(dueDateString);
  return daysRemaining >= 0 && daysRemaining <= daysThreshold;
};
