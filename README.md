# frigate

This is the Frigate frontend which connects to and provides a user interface to the Python backend.

# Web Development

## Installing Web Dependencies Via NPM

Within `/web`, run:

```bash
npm install
```

## Running development frontend

### Quick start (with integrated mock API)

Within `/web`, run:

```bash
npm start
```

This starts both:
- **Mock API server** on `http://localhost:4000` with sample cameras, events, and config
- **Dev server** on `http://localhost:5173`

You can now explore all UI features and test the full interface with mock data. Perfect for frontend development, testing, and showcasing the application.

### With API endpoint

To connect to a Frigate backend, set the `PROXY_HOST` variable:

```bash
PROXY_HOST=<ip_address:port> npm run dev
```

The Proxy Host should point to your running Frigate instance. If running Frigate on the same machine, use `localhost:5000` (or `192.168.1.195:8971` for the default).

## Extensions
Install these IDE extensions for an improved development experience:
- eslint
