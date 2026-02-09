# NovaPay - Crypto-to-Fiat Payment Gateway for Mexico

Payment gateway that allows businesses in Mexico to accept cryptocurrency payments and automatically receive Mexican Pesos (MXN).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NovaPay System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Customer   │────▶│   Merchant   │────▶│   NovaPay    │    │
│  │  (Crypto)    │     │   Wallet     │     │  Hot Wallet  │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                     │            │
│                              ▼                     ▼            │
│                       ┌──────────────┐     ┌──────────────┐    │
│                       │   Worker     │────▶│   Convert    │    │
│                       │  (Railway)   │     │   to MXN     │    │
│                       └──────────────┘     └──────────────┘    │
│                              │                     │            │
│                              ▼                     ▼            │
│                       ┌──────────────┐     ┌──────────────┐    │
│                       │   Vercel     │────▶│    SPEI      │    │
│                       │   (API)      │     │   Payout     │    │
│                       └──────────────┘     └──────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Flow

1. **Merchant Registration** → System generates unique wallets (USDT-TRC20, USDT-ERC20, etc.)
2. **Customer Payment** → Sends crypto to merchant's wallet
3. **Detection** → Worker monitors wallets 24/7, detects deposits
4. **Auto-sweep** → Moves crypto to NovaPay hot wallet
5. **Conversion** → Calculates MXN with spread (e.g., 3%)
6. **Credit/Payout** → Credits merchant balance or sends automatic SPEI

## Tech Stack

- **Frontend + API**: Next.js 14 (Vercel)
- **Worker**: Node.js (Railway)
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Blockchain**: TronWeb (Tron), ethers.js (Ethereum)
- **Prices**: Binance API
- **Monorepo**: Turborepo + pnpm

## Project Structure

```
novapay/
├── apps/
│   ├── web/                 # Next.js dashboard + API (Vercel)
│   │   ├── src/
│   │   │   ├── app/        # App Router pages
│   │   │   │   ├── api/    # API routes
│   │   │   │   └── dashboard/
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── worker/              # Blockchain monitor (Railway)
│       ├── src/
│       │   ├── monitors/   # Wallet monitoring
│       │   ├── processors/ # Sweep processing
│       │   └── services/   # API client, prices
│       └── package.json
│
├── packages/
│   ├── db/                  # Drizzle schema + client
│   │   ├── src/
│   │   │   ├── schema.ts   # Database schema
│   │   │   └── index.ts    # DB client
│   │   └── drizzle.config.ts
│   │
│   ├── crypto/              # Blockchain utilities
│   │   └── src/
│   │       ├── tron/       # TronWeb wrapper
│   │       ├── ethereum/   # ethers.js wrapper
│   │       ├── encryption/ # Private key encryption
│   │       └── prices/     # Binance price fetcher
│   │
│   └── shared/              # Shared types + utils
│       └── src/
│           ├── types/      # TypeScript types + Zod schemas
│           ├── constants/  # Business rules, configs
│           └── utils/      # Helper functions
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- Neon PostgreSQL database
- TronGrid API key (for Tron)
- Ethereum RPC URL (Infura/Alchemy)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd novapay

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate database schema
pnpm db:generate

# Push schema to database
pnpm db:push

# Start development
pnpm dev
```

### Environment Variables

Create `.env.local` in root:

```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Encryption
ENCRYPTION_MASTER_PASSWORD=your-secure-32-char-password

# Internal API communication
INTERNAL_API_KEY=your-internal-api-key

# Tron
TRON_FULL_HOST=https://api.trongrid.io
TRONGRID_API_KEY=your-trongrid-api-key
HOT_WALLET_TRON=your-tron-hot-wallet-address

# Ethereum
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/...
HOT_WALLET_ETHEREUM=your-ethereum-hot-wallet-address

# SPEI Provider (OPM/Finco)
SPEI_API_URL=...
SPEI_API_KEY=...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Vercel API URL (for worker)
API_BASE_URL=http://localhost:3000
```

## Development

```bash
# Run all apps in development
pnpm dev

# Run only web
pnpm --filter @novapay/web dev

# Run only worker
pnpm --filter @novapay/worker dev

# Build all
pnpm build

# Type check
pnpm type-check

# Database studio
pnpm db:studio
```

## Deployment

### Vercel (Web + API)

1. Connect GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Add environment variables
4. Deploy

### Railway (Worker)

1. Create new Railway project
2. Connect GitHub repo
3. Set root directory to `apps/worker`
4. Add environment variables
5. Set start command: `pnpm start`
6. Deploy

### Neon (Database)

1. Create Neon project
2. Copy connection string to `DATABASE_URL`
3. Run `pnpm db:push` to create tables

## Security Considerations

- Private keys are encrypted with AES-256-GCM
- Master password should be at least 32 characters
- Internal API uses shared secret authentication
- All sensitive data stored encrypted at rest
- Never commit `.env` files

## Database Schema

### Tables

- `merchants` - Business accounts
- `wallets` - Generated crypto wallets per merchant
- `deposits` - Incoming crypto payments
- `withdrawals` - SPEI payouts
- `hot_wallet_transactions` - Audit log for hot wallet
- `price_history` - Exchange rate history
- `api_keys` - Merchant API keys

## API Endpoints

### Public (Dashboard)

- `POST /api/auth/*` - Authentication
- `GET /api/merchants/me` - Get current merchant
- `GET /api/wallets` - List merchant wallets
- `GET /api/deposits` - List deposits
- `POST /api/withdrawals` - Request withdrawal

### Internal (Worker → API)

- `POST /api/internal/deposits/detected` - New deposit found
- `POST /api/internal/deposits/confirmed` - Deposit confirmed
- `POST /api/internal/deposits/swept` - Deposit swept to hot wallet

## License

Private - All rights reserved
