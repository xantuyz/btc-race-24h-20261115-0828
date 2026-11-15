// Dip-Buy Mean Reversion for cbBTC (CBBTC/USDC) — make.fun btc-race-24h-20261115-0828.
//
// Idea, in one line: BTC mean-reverts to its 4-hour average on the 1-minute
// scale, so buy a deep dip under that average and sell the bounce back to it.
//
// Why this shape, and why not the obvious trend bots:
//   - The dev window falls ~4% over 24h with several multi-hour bounces. Every
//     trend-following baseline loses on it (EMA-cross -135 USDC on 63 whipsaw
//     trades, ADX-momentum -87, momentum -41, buy-and-hold -44). A 1-minute
//     trend signal is mostly noise here (1-min log-return sd ~12 bps against a
//     ~20-43 bps round-trip cost), so crossing EMAs churns the account to death.
//   - Buying 2% under the 240-minute SMA and selling at the SMA (or +0.5% over
//     cost) made +12.12 USDC on the dev window in 5 trades with 0.5% max
//     drawdown, and stayed positive on every rolling 12h sub-window (+4.22 to
//     +13.55) and near breakeven on a mirrored (+4%) uptrend (+0.29) and on
//     30 block-bootstrapped reshuffles (median +0.30). The optimum is flat
//     across neighbouring parameters (span 200-300, target 0.4-0.8%), so this is
//     a region, not a fitted point.
//   - Half-size entries (50% of cash): a full-size $1,000 buy pays ~15 bps of
//     price impact per side at the dev window's median depth (~$642k); half size
//     halves that, and the bounce edge per dollar is what matters. Smaller still
//     ($250) earns less in absolute terms; $500 is the balance.
//   - The 2% stop-loss never fired on the dev window. It exists for the race
//     window: in a waterfall the bot loses at most ~2% + costs per trade
//     instead of riding a position down.
//
// Rules (all integer arithmetic on the harness's raw units, no floats, no
// clock, no randomness — the two graded runs are byte-identical):
//   - Keep the last 240 closes (a bar missing CBBTC adds nothing, trades
//     nothing). While fewer than 240 closes are known, send no order.
//   - Flat: buy 50% of cash when close < SMA(240) * 0.98.
//   - Holding: sell the whole position when close >= SMA(240), or when
//     close >= entry * 1.005, or when close <= entry * 0.98 (stop-loss).
//     Entry is the position's cost basis (cost_quote_units / qty), fees in.
//   - Every order caps slippage at 100 bps against the latest close; a fill
//     refused on slippage is simply retried next bar while the signal holds.
//   - At most one open position, long only, never more than one order a reply.
//
// Backtest (exact integer replica of the harness fill math, verified to the
// cent against `grade-local` on buy-and-hold: -44.01 USDC, fees 0.78):
//   dev net PnL +12.12 USDC, 5 trades, fees 2.01 USDC, max drawdown 0.5%.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** The mean the bot reverts to: 240 one-minute closes (4 hours). */
const SMA_SPAN = 240;
/** Buy when close * 100 < SMA * 98 (2% under the mean). */
const DIP_NUM = 98n;
/** Sell when close * 1000 >= entry * 1005 (+0.5% over the cost basis). */
const TARGET_NUM = 1005n;
/** Stop-loss: sell when close * 100 <= entry * 98 (2% under the cost basis). */
const STOP_NUM = 98n;
/** 1% past the close the order was decided on; a refused fill is retried. */
const MAX_SLIPPAGE_BPS = 100;

/** The last SMA_SPAN closes, oldest first, and their running sum. */
const closes: bigint[] = [];
let closesSum = 0n;

/** The 240-bar mean, or null until 240 closes are known. */
function sma(): bigint | null {
  if (closes.length < SMA_SPAN) return null;
  return closesSum / BigInt(SMA_SPAN);
}

await runBars({
  onBatch(state: BarsState, batch): OrderInput[] {
    if (state.warmingUp) return [];
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = BigInt(bar.c);
    closes.push(close);
    closesSum += close;
    if (closes.length > SMA_SPAN) closesSum -= closes.shift()!;
    const mean = sma();
    if (mean === null) return [];
    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      // Cost basis in price units. value(qty, price) = qty * price *
      // 10^quote_scale / 10^(qty_scale + price_scale), so
      // price = cost * 10^(qty_scale + price_scale - quote_scale) / qty.
      // For CBBTC that exponent is 8 + 5 - 6 = 7 — NOT 10: the raw closes
      // are at price_scale 5, and a hardcoded 10^10 makes the entry 1,000x
      // too high, which trips the stop-loss on the bar after every buy.
      const sym = state.hello.symbols.find((s) => s.symbol === SYMBOL)!;
      const scale = BigInt(sym.qty_scale + sym.price_scale - state.hello.capital.quote_scale);
      const entry = (held.cost * 10n ** scale) / held.qty;
      if (close * 100n <= entry * STOP_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      if (close >= mean || close * 1000n >= entry * TARGET_NUM) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    if (close * 100n < mean * DIP_NUM) {
      const amount = state.cash / 2n;
      if (amount < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
