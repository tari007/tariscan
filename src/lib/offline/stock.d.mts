export type SaleQuantityLine = { product_id: string; quantity: number };
export function aggregateSaleQuantities(items: SaleQuantityLine[]): Map<string, number>;
export function calculateRemainingStock(currentQuantity: number, soldQuantity: number): number;
