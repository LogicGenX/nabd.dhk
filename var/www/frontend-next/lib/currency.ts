export const formatAmount = (amount: number) => {
  if (!Number.isFinite(amount)) return 'BDT 0.00'
  return 'BDT ' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
