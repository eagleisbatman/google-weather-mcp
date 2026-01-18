# Google Weather MCP Server

MCP (Model Context Protocol) server providing global weather data from Google Weather API with agricultural insights.

## Features

- **Current Conditions**: Real-time weather with temperature, humidity, wind, UV index, and spray recommendations
- **Daily Forecast**: Up to 10-day forecast with min/max temperatures, precipitation probability
- **Hourly Forecast**: Up to 240 hours (10 days) of hourly weather data with spray window detection
- **Hourly History**: Past 24 hours of weather data (unique to Google Weather)

## Quick Start

### 1. Install Dependencies

```bash
cd mcp-servers/google-weather-mcp
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your Google Weather API key
```

### 3. Run Server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Weather API
4. Create an API key
5. Add the key to your `.env` file as `GOOGLE_WEATHER_API_KEY`

## MCP Tools

### 1. `get_google_current_conditions`

Get real-time weather conditions for a location.

**Parameters:**
- `latitude` (optional): Latitude coordinate (-90 to 90)
- `longitude` (optional): Longitude coordinate (-180 to 180)

**Response includes:**
- Temperature (current and feels-like)
- Humidity, dew point
- Wind speed, direction, gusts
- UV index
- Precipitation probability
- Cloud cover, visibility, pressure
- Spray condition assessment

### 2. `get_google_daily_forecast`

Get daily weather forecast for planning.

**Parameters:**
- `latitude` (optional): Latitude coordinate
- `longitude` (optional): Longitude coordinate
- `days` (optional): Number of days 1-10 (default: 7)

**Response includes:**
- Daily min/max temperatures
- Precipitation probability and amount
- Wind conditions
- UV index
- Sunrise/sunset times
- Agricultural impact assessment

### 3. `get_google_hourly_forecast`

Get hourly weather forecast for precise planning.

**Parameters:**
- `latitude` (optional): Latitude coordinate
- `longitude` (optional): Longitude coordinate
- `hours` (optional): Number of hours 1-240 (default: 24)

**Response includes:**
- Hourly temperature and conditions
- Wind speed and direction
- Precipitation probability
- Cloud cover
- Spray window detection

### 4. `get_google_hourly_history`

Get historical weather data for the past 24 hours.

**Parameters:**
- `latitude` (optional): Latitude coordinate
- `longitude` (optional): Longitude coordinate
- `hours` (optional): Number of past hours 1-24 (default: 24)

**Response includes:**
- Historical temperature
- Humidity levels
- Precipitation amounts
- Wind conditions
- Summary statistics

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info and available tools |
| `/health` | GET | Health check |
| `/mcp` | POST | MCP protocol endpoint |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_WEATHER_API_KEY` | Yes | - | Google Weather API key |
| `GOOGLE_WEATHER_API_BASE_URL` | No | `https://weather.googleapis.com/v1` | API base URL |
| `PORT` | No | `3003` | Server port |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |

## Response Format

All tools return normalized JSON with:

```json
{
  "product": "Google Weather <Product>",
  "provider": "Google Weather",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "coverage": "Global"
  },
  "current": { ... },
  "forecast": [ ... ],
  "agricultural_context": {
    "conditions_summary": "...",
    "spray_assessment": { ... }
  },
  "data_source": "Google Weather API"
}
```

## Agricultural Context

The server provides agricultural insights including:

- **Spray Conditions**: Evaluates wind, humidity, and precipitation to recommend spray timing
- **Spray Windows**: Identifies optimal time windows for spraying in hourly forecasts
- **Agricultural Impact**: Describes how weather conditions affect farming activities

## Deployment

### Railway

```bash
# Deploy to Railway
railway up
```

The `railway.json` file is pre-configured for deployment.

### Environment Variables (Railway)

Set these in your Railway project:
- `GOOGLE_WEATHER_API_KEY`: Your API key
- `PORT`: Will be set automatically by Railway

## Comparison with Other Weather Providers

| Feature | AccuWeather | Tomorrow.io | Google Weather |
|---------|-------------|-------------|----------------|
| Forecast Days | 5 | 14 | **10** |
| Hourly Forecast | Limited | 48h | **240h** |
| Historical Data | No | No | **Yes (24h)** |
| Spray Windows | No | Yes | **Yes** |
| Agricultural Context | No | Yes | **Yes** |
| Icon Format | Numeric codes | Numeric codes | **URL strings** |

## License

MIT
