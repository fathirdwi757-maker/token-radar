# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/fathirdwi757-maker/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/fathirdwi757-maker/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Launch Radar: a token launch radar for the make.fun bounty. The program reads the sealed DefiLlama snapshot, finds every protocol that records no token and is not a wrapped, staked, bridged or versioned product of one that trades — all 40 watchlist protocols plus the early finds below its $50M floor, 198 protocols on this snapshot — and ranks them by what their launch would be worth. The value model reads its category multiples from the snapshot's own tokenized protocols (each peer's market cap per TVL dollar, outlier-clamped and shrunk toward the global median by peer count), then adjusts for 7-day TVL growth, for how long the protocol has run with no token, and for chain breadth; no protocol's name is ever special-cased. It writes the ranked board to board.json and a static, no-network dashboard — a sortable, filterable board, a detail view per protocol showing the model's arithmetic and a seven-step farm plan with costs and times, the already-trading protocols shown apart at market value, and the full model with its category-multiple table.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=7k4mkbbj&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
