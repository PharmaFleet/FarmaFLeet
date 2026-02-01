export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '-';
  return value.toLocaleString('en-US');
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '-';
  
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '-';
  return `${value.toFixed(decimals)}%`;
}

export function formatCurrency(value: number | null | undefined, currency = 'KWD'): string {
  if (value == null) return '-';
  return `${currency} ${value.toFixed(3)}`;
}
