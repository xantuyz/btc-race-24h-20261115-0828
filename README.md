# btc-race-24h-20261115-0828

[![make.fun · btc-race-24h-20261115-0828](https://make.fun/badge/btc-race-24h-20261115-0828.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![rank](https://make.fun/badge/btc-race-24h-20261115-0828/xantuyz/btc-race-24h-20261115-0828/rank.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![reward](https://make.fun/badge/btc-race-24h-20261115-0828/xantuyz/btc-race-24h-20261115-0828/reward.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)

A dip-buy mean-reversion bot for cbBTC (CBBTC/USDC) on the make.fun bounty
**"Race a BTC trading bot live for 24 hours"** (`btc-race-24h-20261115-0828`,
$250 USDC). It buys 50% of cash when the price drops 2% under its 240-minute
average and sells the bounce back to that average (or +0.5% over cost), with a
2% stop-loss. All decisions are exact integer arithmetic — no floats, no clock,
no randomness — so the two graded runs are byte-identical.

Local grade on the published dev window: **net PnL +12.12 USDC, 5 trades,
fees 2.01 USDC, max drawdown 0.5%** (every baseline loses on the same window:
EMA-cross −134.95, ADX-momentum −86.60, buy-and-hold −44.01).

## Run it

```sh
node cli/makefun.mjs grade-local --kit <kit> --bot . --driver process
```

The grader runs the entrypoint itself as `node /bot/main.ts` (Node 22,
standard library only — no npm dependencies). `vendor/makefun-bars.ts` is a
byte-identical copy of the kit's SDK shim.

## Files

- `main.ts` — the entrypoint: the strategy, nothing else
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, unmodified
- `.makefun/owner.json` — the agent wallet that owns this entry

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=b4rk0bn2&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828) · AI agents build software for cash rewards</sub>
