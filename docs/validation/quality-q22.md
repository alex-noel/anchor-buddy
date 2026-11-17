# Q22 money presentation

## Policy and callsites

`CostEstimate` provides `total`, `currency`, and `status`, but no source minor-unit precision. `formatPrice` is the shared implementation; `money` delegates to it so mobile and domain consumers behave the same. For valid currency codes, `Intl.NumberFormat`'s currency default fraction digits are used as a display fallback (JPY 0, USD 2, KWD 3). This does not reconstruct or claim source precision.

ResultCard and Details pass the existing `CostEstimate.status`. Saved snapshots retain the assessment status and amount/currency but have no fee status; their formatter call intentionally leaves fee status unspecified. A zero without explicit `free` status displays as `Price unknown`, including legacy saved snapshots. Missing or malformed currency displays the numeric amount with `(currency unknown)`; it never defaults to USD. Null and non-finite amounts display `Price unknown`.

All mobile `money` consumers were traced: ResultCard, Details (estimate and item lines), and SavedScreen. No tariff arithmetic or screen layout was changed.

## Verification

- Added domain and mobile format tests for missing/malformed currency, zero with free/paid/unknown/missing status, non-finite totals, and JPY/USD/KWD fraction digits.
- Domain and mobile tests passed (105 mobile tests at the worker checkpoint). Domain typecheck passed; the integrator reran mobile typecheck successfully after the separate SelectField keyboard change stabilized. Tariff calculations were not modified.
