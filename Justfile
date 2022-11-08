export RUST_BACKTRACE := 'full'

set dotenv-load

pk := env_var_or_default('ANCHOR_WALLET', '~/.config/solana/defi-automator.json')
rpc := env_var_or_default('ANCHOR_PROVIDER_URL', 'https://api.mainnet-beta.solana.com')
mongo_uri := env_var_or_default('MONGODB_URI', 'mongodb://127.0.0.1:27017/automator')
config_path := env_var_or_default('CONFIG_PATH', './app/config.yml')
swap_fee := env_var_or_default('SWAP_FEE', '1')
fee_account := env_var_or_default('FEE_ACCOUNT', '4kpQiCzJwZYJevLT5TThRRuqbdefmLF2y8vXp8b5SF7m')

_default:
  just --list

# Typescript compiler check
tsc:
  yarn concurrently --group --kill-others-on-fail \
    "tsc --noEmit" \

_prettier:
  yarn prettier --ignore-path=.prettierignore \
    --write . \
    --loglevel=warn

_lint:
  yarn eslint --ignore-path .prettierignore --fix \
    .eslintrc.js tests app

# Run lint + prettier + cargo formatter
format:
  just _prettier && just _lint

# Run tests
test:
  anchor test --provider.cluster localnet

balance:
  solana address --keypair {{ pk }}
  solana balance --keypair {{ pk }} --url {{ rpc }}

# Run cli command
automator +args:
  ANCHOR_WALLET={{ pk }} \
  ANCHOR_PROVIDER_URL={{ rpc }} \
  CONFIG_PATH={{ config_path }} \
  MONGODB_URI={{ mongo_uri }} \
  npx ts-node ./app/cli.ts {{ args }}
