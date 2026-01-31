# Google Weather MCP Server

MCP server for Google Weather API.

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://google-weather-mcp.up.railway.app` |
| Development | `https://google-weather-mcp-development.up.railway.app` |

## Git Workflow

| Branch | Environment | Notes |
|--------|-------------|-------|
| `main` | Production | Deployed to Railway Production |
| `development` | Development | Deployed to Railway Development |

**Always work on `development` branch.** Merge to `main` only for production releases.

---

## Coverage

**Global** - Works worldwide

## Tools

- `get_google_weather_current` - Current conditions
- `get_google_weather_forecast` - Weather forecast

## Development

```bash
npm install
npm run dev    # Development
npm run build  # Build
npm start      # Production
```

## Environment Variables

- `GOOGLE_WEATHER_API_KEY` - Google Weather API key

## MCP Endpoint

- `POST /mcp` - MCP protocol endpoint
- `GET /health` - Health check
