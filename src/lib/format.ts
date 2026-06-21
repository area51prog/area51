export function formatINR(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatINRCompact(value: number) {
  if (Math.abs(value) >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (Math.abs(value) >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(2)} L`;
  }
  return `₹${formatINR(value, 0)}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
