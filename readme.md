# DeFi Automator

DeFi Automator is a tool to create DeFi portfolios on descentralized concentrated liquidity pools. It consists in strategies to create positions based on determined algorithms, auto rebalancing positions and auto collecting available fees and rewards.

For now it can only automate Orca Whirlpools on Solana. The idea is to add more protocols on Solana and maybe other chains.

**_This is currently in development, nothing works and probably everything is going to change._**

### Dependencies

- Node 16
- Yarn
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Just](https://github.com/casey/just)
- MongoDB

### Setup Instructions

#### Generate a Private Key (Solana)

```bash
solana-keygen new --outfile ~/.config/solana/defi-automator.json
```

This will create a new Wallet specific for the automator. To get the public key, run:

```bash
solana-keygen pubkey ~/.config/solana/defi-automator.json
```

Remember to transfer funds to this wallet.

#### Setup your DeFi Portfolio(s)

1. Clone the repository
2. Run `yarn` to install the dependencies
3. Edit `app/config.yml` with the desired pools, distributions and position strategy.
4. Make sure you have a MongoDB on `mongodb://127.0.0.1:27017/automator` or add a env `MONGODB_URI` to point to your instance.

### Available Strategiess

<!-- #### Range Box

Defined by two percentages rates in relation to the current price on the initialization of the position, the lower and the upper bound. Position is closed when the current price is out of the range and initialized again on next run. -->

#### One Tick Lower

Position is initialized out of range, 1 tick lower the current pool tick, thus not earning any yield on start. This is a good method to deposit only a single token to the pool and start receiving fees when the price moves down.

#### One Tick Upper

Same as one tick lower, but the position is initialized 1 tick upper the current pool tick. Start receiving fees when price moves up.

<!--
#### EMA Box

Uses Exponential Moving Average to calculate the ranges of the position. Closed when out of range and initialized again on next run. -->

#### Run

```bash
just automator run # Run once
just automator work # Start worker, run every 15 minutes for now
```

#### TODO

- [ ] Get/sync positions from wallet
- [ ] Handle more than one position/strategy for the same pool
- [ ] Swap within strategy when needed
- [ ] Pass token balances to strategies
- [ ] More strategies: Range Box, EMA/SMA
- [ ] Add count for closings, maybe open positions with larger range when closing are too high
- [ ] Calculate portfolio performance and risk
- [ ] Tests

#### Environment Variables

| Variable              | Description                    | Default                                |
| --------------------- | ------------------------------ | -------------------------------------- |
| `ANCHOR_WALLET`       | Wallet private key             | `~/.config/solana/defi-automator.json` |
| `ANCHOR_PROVIDER_URL` | Solana RPC                     | https://api.mainnet-beta.solana.com    |
| `CONFIG_PATH`         | Path to portfolios config file | `./app/config.yml`                     |
| `MONGODB_URI`         | MongoDB instance               | `mongodb://127.0.0.1:27017/automator`  |

You can use a `.env` file to change any default variable.

## License

#### The MIT License (MIT)

Copyright (c) Gabriel Koerich

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
