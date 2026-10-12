# The Solar Prime — Solar PPA Savings Calculator (IL & MA)

A one-page calculator that estimates a homeowner's monthly electric bill and savings with a Solar PPA versus staying fully on the utility. The only required input is the **total annual kWh** from the homeowner's utility bill.

Plain HTML/CSS/JS, no build step. Deploys as a static site on Vercel.

## How the estimate works

| Item | Formula |
|---|---|
| Bill today (monthly) | annual kWh × utility rate ÷ 12 |
| Solar PPA payment (monthly) | annual kWh × solar coverage % × PPA rate ÷ 12 |
| Remaining utility bill (monthly) | fixed charge + (uncovered kWh × utility per-kWh rate ÷ 12) |
| Monthly savings | bill today − (PPA payment + remaining utility bill) |
| Long-term savings | sums each year, with utility prices and the PPA rate rising by their yearly % |

The utility rate is an all-in average; the fixed charge is backed out of it to get the per-kWh rate used for uncovered usage, so nothing is counted twice.

## Default assumptions (2026)

| | Illinois | Massachusetts |
|---|---|---|
| Utility rate (all-in) | $0.18 / kWh | $0.36 / kWh |
| PPA rate | $0.135 / kWh | $0.25 / kWh |
| Utility fixed charge | $15 / month | $10 / month |
| Solar coverage | 90% | 90% |
| Utility price increase | 3% / year | 3% / year |
| PPA escalator | 2% / year | 2% / year |
| Term | 25 years | 25 years |

Utility rates are statewide averages from EnergySage bill data (Oct 2026). PPA rates sit about 25–30% below the utility rate, in line with typical 2026 residential PPA ranges. Fixed charges are rounded estimates.

**To change defaults for everyone**, edit the `DEFAULTS` object at the top of `calculator.js`. Reps can also adjust any value per homeowner under "Adjust rates and assumptions."

## Disclaimer

Estimates only, for average calculation purposes. Not a quote or an offer.
