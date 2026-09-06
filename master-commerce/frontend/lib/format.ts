export function formatPrice(value: number, currency: string): string {
  const formatted = value.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
  return `${formatted} ${currency}`;
}
