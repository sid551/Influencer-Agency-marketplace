import { formatMoney, formatMoneyRange } from "@/lib/money";
import type { ConversationCollaboration } from "@/types/collaboration.types";

/**
 * Compact price label for conversation rows: the negotiated fixed price wins
 * over the campaign's budget range. Returns null when no price data exists
 * yet, so callers can skip rendering a price line entirely.
 */
export function dealLabel(
  collaboration: ConversationCollaboration,
): string | null {
  if (collaboration.agreed_price !== null) {
    return `${formatMoney(collaboration.agreed_price, collaboration.currency)} fixed`;
  }

  const campaign = collaboration.campaign;
  if (!campaign) return null;

  const { budget_min, budget_max, currency } = campaign;
  if (budget_min !== null && budget_max !== null) {
    return `${formatMoneyRange(budget_min, budget_max, currency)} budget`;
  }
  if (budget_min !== null) {
    return `${formatMoney(budget_min, currency)}+ budget`;
  }
  if (budget_max !== null) {
    return `Up to ${formatMoney(budget_max, currency)} budget`;
  }
  return null;
}
