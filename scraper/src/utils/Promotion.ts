import moment from "moment";

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The end of the weekly folder: the most common end date (the earliest on a
 * tie). Some promotions run for months; the latest date would postpone the
 * next scheduled run until then. Falls back to the end of this week.
 */
export function folderExpireDate(items: { expireDate: string }[]): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.expireDate, (counts.get(item.expireDate) ?? 0) + 1);
  let best = "";
  let bestCount = 0;
  for (const [date, count] of counts) {
    if (count > bestCount || (count === bestCount && date < best)) {
      best = date;
      bestCount = count;
    }
  }
  return best || moment().endOf("isoWeek").toISOString(true);
}

/**
 * Price per item during a promotion, from the promotion label and the regular
 * price. A known promotion price below the regular price wins. Multi-buy
 * labels are worked out per item:
 *
 *   "3 voor 6,00" -> 2.00          "1 + 1 Gratis" -> regular / 2
 *   "25% korting" -> regular * .75 "2e halve prijs" -> regular * .75
 *   "voor 1,99" / "per zak 0,99" -> 1.99 / 0.99 (when below regular)
 *
 * Returns null when the label is not a price promotion (e.g. "Gratis
 * bezorging", "Op = op").
 */
export function promotionPrice(
  label: string | null | undefined,
  regular: number,
  promoPrice?: number | null
): number | null {
  if (typeof promoPrice === "number" && promoPrice > 0 && promoPrice < regular - 0.001) {
    return round2(promoPrice);
  }
  const text = (label ?? "").toLowerCase().replace(/,/g, ".").replace(/​/g, "");

  const forAmount = text.match(/(\d+)\s*voor\s*€?\s*(\d+(?:\.\d+)?)/);
  if (forAmount) return round2(parseFloat(forAmount[2]) / parseInt(forAmount[1], 10));

  const free = text.match(/(\d+)\s*\+\s*(\d+)\s*gratis/);
  if (free) {
    const paid = parseInt(free[1], 10);
    return round2((regular * paid) / (paid + parseInt(free[2], 10)));
  }

  const percent = text.match(/(\d+(?:\.\d+)?)\s*%\s*korting/);
  if (percent) return round2(regular * (1 - parseFloat(percent[1]) / 100));

  // "2e halve prijs": of every N items the last costs half.
  const half = text.match(/(\d+)e\s*halve\s*prijs/);
  if (half) {
    const n = parseInt(half[1], 10);
    return round2((regular * (n - 0.5)) / n);
  }

  const fixed = text.match(/(?:^|\s)(?:voor|per\s+[a-z]+)\s*€?\s*(\d+(?:\.\d+)?)/);
  if (fixed && parseFloat(fixed[1]) < regular) return round2(parseFloat(fixed[1]));

  return null;
}
