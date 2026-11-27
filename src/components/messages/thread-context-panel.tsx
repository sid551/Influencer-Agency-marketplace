import {
  CalendarIcon,
  IndianRupeeIcon,
  TargetIcon,
} from "lucide-react";

import { formatMoney, formatMoneyRange } from "@/lib/money";
import type { ConversationCollaboration } from "@/types/collaboration.types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Big price line: the negotiated fixed price, else the campaign budget. */
function priceSummary(collaboration: ConversationCollaboration): {
  headline: string;
  subline: string;
} {
  if (collaboration.agreed_price !== null) {
    return {
      headline: formatMoney(collaboration.agreed_price, collaboration.currency),
      subline: "Fixed price agreed for this collaboration",
    };
  }

  const campaign = collaboration.campaign;
  const budget = {
    min: campaign?.budget_min ?? null,
    max: campaign?.budget_max ?? null,
    currency: campaign?.currency ?? collaboration.currency,
  };

  if (budget.min !== null && budget.max !== null) {
    return {
      headline: formatMoneyRange(budget.min, budget.max, budget.currency),
      subline: "Campaign budget · fixed price not agreed yet",
    };
  }
  if (budget.min !== null) {
    return {
      headline: `${formatMoney(budget.min, budget.currency)}+`,
      subline: "Campaign budget · fixed price not agreed yet",
    };
  }
  if (budget.max !== null) {
    return {
      headline: `Up to ${formatMoney(budget.max, budget.currency)}`,
      subline: "Campaign budget · fixed price not agreed yet",
    };
  }
  return {
    headline: "On request",
    subline: "No budget shared · fixed price not agreed yet",
  };
}

function formatDueDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Deal + goals panel shown above a message thread: the negotiated fixed
 * price (or the campaign budget until one is agreed) on the left, and the
 * business's campaign goals on the right, so both sides see the same
 * context while they chat.
 */
export function ThreadContextPanel({
  collaboration,
}: {
  collaboration: ConversationCollaboration;
}) {
  const agreed = collaboration.agreed_price !== null;
  const { headline, subline } = priceSummary(collaboration);
  const campaign = collaboration.campaign;
  const hasGoals = Boolean(
    campaign &&
      (campaign.description ||
        campaign.deliverables.length > 0 ||
        campaign.platforms.length > 0),
  );

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <IndianRupeeIcon className="size-4 text-primary" aria-hidden="true" />
              Deal
            </span>
            <Badge variant={agreed ? "default" : "outline"} className="text-[11px]">
              {agreed ? "Price agreed" : "Price not agreed"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div>
            <p className="text-xl font-semibold tracking-tight">{headline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{subline}</p>
          </div>
          {collaboration.deadline ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              Delivery due {formatDueDate(collaboration.deadline)}
            </p>
          ) : null}
          {collaboration.terms ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Terms: </span>
              <span className="line-clamp-2">{collaboration.terms}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TargetIcon className="size-4 text-primary" aria-hidden="true" />
            Campaign goals
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {campaign && hasGoals ? (
            <>
              {campaign.description ? (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {campaign.description}
                </p>
              ) : null}
              {campaign.deliverables.length > 0 || campaign.platforms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {campaign.deliverables.map((item, index) => (
                    <Badge
                      key={`deliverable-${index}`}
                      variant="secondary"
                      className="text-[11px] font-normal"
                    >
                      {item}
                    </Badge>
                  ))}
                  {campaign.platforms.map((item, index) => (
                    <Badge
                      key={`platform-${index}`}
                      variant="outline"
                      className="text-[11px] font-normal capitalize"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {campaign
                ? "The business hasn't shared goals for this campaign yet."
                : "No campaign brief linked to this collaboration."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
