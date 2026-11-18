export function aggregateSaleQuantities(items) {
  const totals = new Map();
  for (const item of items) {
    if (!item || typeof item.product_id !== "string" || !item.product_id.trim()) throw new Error("Every sale item must have a product ID.");
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Sale quantities must be greater than zero.");
    totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
  }
  return totals;
}
export function calculateRemainingStock(currentQuantity, soldQuantity) {
  if (!Number.isFinite(currentQuantity) || currentQuantity < 0) throw new Error("Current stock is invalid.");
  if (!Number.isFinite(soldQuantity) || soldQuantity <= 0) throw new Error("Sale quantity is invalid.");
  if (currentQuantity < soldQuantity) throw new Error(`Insufficient stock. Available: ${currentQuantity}`);
  return Number((currentQuantity - soldQuantity).toFixed(3));
}
