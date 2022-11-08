import util from 'util';
import * as dotenv from 'dotenv';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { AnchorProvider } from '@project-serum/anchor';
import { Tasks, Database, PositionManager } from './src';

const originalConsoleLog = console.log;

// var fs = require('fs');
// var util = require('util');
// var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
// var log_stdout = process.stdout;

// console.log = function(d) { //
//   log_file.write(util.format(d) + '\n');
//   log_stdout.write(util.format(d) + '\n');
// };
// eslint-disable-next-line
console.log = function (...logs) {
  const args = [];
  args.push(`[${new Date().toLocaleString()}]`);

  for (let i = 0; i < logs.length; i++) {
    args.push(logs[i]);
  }
  originalConsoleLog.apply(console, args);
};

dotenv.config();

const run = async (provider: AnchorProvider, config, args) => {
  console.log(`Running automator`, new Date());

  const positions = config.portfolios
    .map((portfolio) =>
      portfolio.positions.map((positionConfig) => ({
        portfolio,
        positionConfig,
      }))
    )
    .flat();

  for (const { portfolio, positionConfig } of positions) {
    const manager = new PositionManager(
      provider,
      portfolio.protocol,
      positionConfig
    );

    const tasks = [
      Tasks.addLiquidity,
      Tasks.collectFeesAndRewards,
      Tasks.swapCollectedTokens,
      Tasks.closePosition,
      Tasks.addLiquidity,
    ];

    // Run each task in order with await and log the task name
    for (const task of tasks) {
      console.log(task, {
        tokens: await manager.getTokenSymbols(),
      });

      await task(manager);
    }

    const state = await manager.getState();

    if (state) {
      console.table(state);
    }
  }
};

const actions = {
  run,
  work: async (provider: AnchorProvider, config, args) => {
    await run(provider, config, args);

    const delay = 10 * 60 * 1000;

    return setInterval(async () => run(provider, config, args), delay);
  },
};

const runner = async (provider: AnchorProvider, config, args: string[]) => {
  const db = await Database.connect();

  const action = actions[args.shift()];

  console.log(action, args);

  console.log('Wallet', {
    address: provider.wallet.publicKey.toString(),
  });

  const response = await action(provider, config, ...args);

  if (response && !response._idleTimeout) {
    console.log(`Closing db connection`);

    db.connection.close();

    console.log(util.inspect(response, { depth: null, colors: true }));
  }
};

const config = yaml.load(readFileSync(process.env.CONFIG_PATH, 'utf8'));

runner(AnchorProvider.env(), config, process.argv.slice(2));
