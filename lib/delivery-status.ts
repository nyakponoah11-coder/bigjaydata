export interface DeliveryBadgeConfig {
  label: string;
  badgeClass: string;
  iconType: "delivered" | "processing" | "pending" | "failed" | "refunded" | "cancelled";
  description: string;
}

/**
 * Standardized delivery status configurations ensuring identical
 * labels, colors, and descriptions across Admin, Agent Dashboard,
 * Main Storefront, Agent Storefront, Tracking, and Receipt pages.
 */
export function getDeliveryStatusConfig(status?: string | null): DeliveryBadgeConfig {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "completed":
    case "delivered":
      return {
        label: "Delivered",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        iconType: "delivered",
        description: "Data bundle successfully delivered and credited to phone line.",
      };
    case "processing":
    case "in_progress":
    case "in-progress":
      return {
        label: "Processing",
        badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse",
        iconType: "processing",
        description: "Data bundle is actively processing via automated telecom fast lane.",
      };
    case "waiting":
    case "pending":
    case "queued":
      return {
        label: "Queued",
        badgeClass: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
        iconType: "pending",
        description: "Order is queued in telecom dispatch line.",
      };
    case "refunded":
      return {
        label: "Refunded",
        badgeClass: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
        iconType: "refunded",
        description: "This transaction has been refunded.",
      };
    case "cancelled":
    case "canceled":
      return {
        label: "Cancelled",
        badgeClass: "bg-slate-700/50 text-slate-400 border border-slate-600/50",
        iconType: "cancelled",
        description: "This order was cancelled.",
      };
    case "failed":
    case "rejected":
    case "declined":
      return {
        label: "Delivery Delayed",
        badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
        iconType: "failed",
        description: "Telco gateway momentarily delayed. Admin team alerted to fulfill manually.",
      };
    default:
      return {
        label: s ? s.toUpperCase() : "PROCESSING",
        badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
        iconType: "processing",
        description: "Order is processing via automated telecom gateway.",
      };
  }
}
