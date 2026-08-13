# ducheck

A lightweight Node.js script to monitor disk space on Linux servers and send email alerts via Mailgun when usage exceeds a specified threshold.

## Features

- **Continuous Monitoring:** Polls the server's disk space using the native `df` command.
- **Server Identification:** Differentiates alerts per machine (e.g. `server-nonprod`, `server-prod`) via `SERVER_NAME` or auto-detected system hostname.
- **Dry-Run Mode:** Simulate alert triggering and verify email contents without invoking Mailgun API calls.
- **Mailgun Integration:** Instantly sends email alerts when disk usage goes above the set threshold.
- **Zero Spam:** Only sends one alert per high-usage event; resets once disk space drops below the threshold.
- **Production Ready:** Configured to run seamlessly with [PM2](https://pm2.keymetrics.io/) using the provided `ecosystem.config.js`.

## Prerequisites

- Node.js (v14+ recommended)
- [pnpm](https://pnpm.io/) (used as the package manager)
- PM2 installed globally (`npm install -g pm2`)
- A Mailgun account (for email alerts)
- Linux/POSIX environment (relies on the `df -P` command)

## Installation

1. Clone the repository and navigate into the project directory.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```

## Configuration

Edit the `.env` file and set the required variables:

```env
# Monitoring settings
THRESHOLD_PERCENTAGE=90
POLLING_INTERVAL_MINUTES=5
TARGET_MOUNT_POINT=/

# Server Identifier (differentiates environments like server-nonprod vs server-prod; defaults to system hostname)
SERVER_NAME=server-prod

# Dry Run Mode (set to true to log alerts without sending actual emails)
DRY_RUN=false

# Mailgun API settings
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain

# Email Settings
TO_EMAIL=alert_recipient@example.com
FROM_EMAIL=ducheck@your_mailgun_domain # Optional, defaults to ducheck@<MAILGUN_DOMAIN>
```

## Usage

### Dry-Run Mode
Test disk space checking and see what email alert *would* be sent without calling Mailgun:

```bash
pnpm dry-run
```
Or via CLI flag / environment variable:
```bash
node index.js --dry-run
# or
DRY_RUN=true node index.js
```

### Production Monitoring (PM2)
You can use the provided npm scripts to manage the PM2 process:

- **Start the monitor (Production mode):**
  ```bash
  pnpm start
  ```
- **Stop the monitor:**
  ```bash
  pnpm stop
  ```
- **Restart the monitor:**
  ```bash
  pnpm restart
  ```
- **View logs:**
  ```bash
  pnpm logs
  ```

Alternatively, to run it directly in standard mode:
```bash
node index.js
```

## License

MIT