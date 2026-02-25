/**
 * Google Weather MCP Server
 *
 * Model Context Protocol server providing global weather data
 * via Google Weather API with agricultural insights.
 *
 * Features:
 * - Current conditions
 * - Daily forecast (up to 10 days)
 * - Hourly forecast (up to 240 hours)
 * - Hourly history (past 24 hours) - unique to Google
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { GoogleWeatherClient } from './google-weather-client.js';
import { getWeatherConditionInfo, evaluateSprayConditions } from './weather-codes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================
// Structured Logger
// ===========================================
const logger = {
  _log(level: string, message: string, context?: Record<string, unknown>) {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: 'google-weather-mcp-server',
      message,
    };
    if (context && Object.keys(context).length > 0) entry.context = context;
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  info(message: string, context?: Record<string, unknown>) { this._log('info', message, context); },
  warn(message: string, context?: Record<string, unknown>) { this._log('warn', message, context); },
  error(message: string, context?: Record<string, unknown>) { this._log('error', message, context); },
};

// ===========================================
// In-memory Rate Limiter (100 req/min per IP)
// ===========================================
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // Evict oldest entry if at capacity (prevents unbounded memory growth)
    if (!entry && rateLimitMap.size >= RATE_LIMIT_MAX_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey) rateLimitMap.delete(oldestKey);
    }
    entry = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  } else {
    entry.count++;
  }

  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    logger.warn('Rate limit exceeded', { ip, count: entry.count });
    res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfterSeconds: retryAfter });
    return;
  }
  next();
}

// Periodic cleanup of expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

// ===========================================
// Per-request context via AsyncLocalStorage
// ===========================================
interface RequestContext {
  defaultLatitude?: number;
  defaultLongitude?: number;
}
const requestContext = new AsyncLocalStorage<RequestContext>();

const app = express();
app.set('trust proxy', 1); // Read real client IP from X-Forwarded-For (behind Railway proxy)

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-session-id', 'x-api-key', 'X-Farm-Latitude', 'X-Farm-Longitude'],
  exposedHeaders: ['Content-Type', 'Mcp-Session-Id']
}));

// Apply rate limiting to all non-health endpoints
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  rateLimiter(req, res, next);
});

// Serve API documentation
app.use('/docs', express.static(path.join(__dirname, '../docs')));
app.use('/docs', express.static(path.join(__dirname, '../../docs')));

// Environment variables
const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY || '';
const GOOGLE_WEATHER_API_BASE_URL = process.env.GOOGLE_WEATHER_API_BASE_URL || 'https://weather.googleapis.com/v1';
const PORT = process.env.PORT || 3003;

// Warn if key is missing
if (!GOOGLE_WEATHER_API_KEY) {
  logger.warn('GOOGLE_WEATHER_API_KEY environment variable is not set. Server will start but MCP tools will not work until key is configured.');
}

// Initialize client
const googleWeatherClient = GOOGLE_WEATHER_API_KEY ? new GoogleWeatherClient(GOOGLE_WEATHER_API_KEY, GOOGLE_WEATHER_API_BASE_URL) : null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'google-weather-mcp-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    googleWeatherApiConfigured: !!GOOGLE_WEATHER_API_KEY
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Google Weather MCP Server',
    version: '1.0.0',
    description: 'Global weather data from Google Weather API with agricultural insights and historical data',
    endpoints: {
      health: '/health',
      mcp: '/mcp (POST)'
    },
    tools: [
      { name: 'weather.google.current', alias: 'get_google_current_conditions', description: 'Real-time weather conditions' },
      { name: 'weather.google.forecast_daily', alias: 'get_google_daily_forecast', description: 'Daily forecast for 1-10 days' },
      { name: 'weather.google.forecast_hourly', alias: 'get_google_hourly_forecast', description: 'Hourly forecast for 1-240 hours' },
      { name: 'weather.google.history_hourly', alias: 'get_google_hourly_history', description: 'Past 24-hour weather data' }
    ]
  });
});

// MCP authentication middleware
function authenticateMcp(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const validKey = process.env.MCP_API_KEY || process.env.API_KEY;
  if (!validKey) {
    logger.warn('MCP_API_KEY not configured — rejecting request (fail-closed)');
    res.status(503).json({ error: 'Service misconfigured: MCP_API_KEY required' });
    return;
  }
  if (!apiKey || apiKey !== validKey) {
    logger.warn('Authentication failed', { ip: req.ip, hasKey: !!apiKey });
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

// ===========================================
// TOOL NAMING STANDARD: domain.provider.action
// ===========================================

// ===========================================
// TOOL 1: Current Conditions
// ===========================================

const CurrentInputSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
  longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.')
}).strict();

type CurrentInput = z.infer<typeof CurrentInputSchema>;

const currentHandler = async ({ latitude, longitude }: CurrentInput) => {
  try {
    const lat = latitude ?? requestContext.getStore()?.defaultLatitude;
    const lon = longitude ?? requestContext.getStore()?.defaultLongitude;

    if (lat === undefined || lon === undefined) {
      return {
        content: [{ type: 'text' as const, text: 'Please provide latitude and longitude coordinates.' }],
        isError: true
      };
    }

    logger.info('weather.google.current called', { lat, lon });

    if (!googleWeatherClient) {
      return {
        content: [{ type: 'text' as const, text: 'Weather service not configured. Try again later.' }],
        isError: true
      };
    }

    const data = await googleWeatherClient.getCurrentConditions(lat, lon);
    const conditionInfo = getWeatherConditionInfo(data.weatherCondition?.type || '');

    const windSpeedKmh = data.wind?.speed?.value || 0;
    const humidityPercent = data.relativeHumidity || 0;
    const precipProbability = data.precipitation?.probability?.percent || 0;

    const sprayEval = evaluateSprayConditions(
      data.weatherCondition?.type || '',
      windSpeedKmh,
      humidityPercent,
      precipProbability
    );

    const response = {
      product: 'Google Weather Current Conditions',
      provider: 'Google Weather',
      location: { latitude: lat, longitude: lon, coverage: 'Global' },
      observed_at: data.currentTime,
      current: {
        temperature_c: data.temperature?.degrees,
        feels_like_c: data.feelsLikeTemperature?.degrees,
        humidity_percent: humidityPercent,
        dew_point_c: data.dewPoint?.degrees,
        wind_speed_kmh: windSpeedKmh,
        wind_direction_deg: data.wind?.direction?.degrees,
        wind_direction_cardinal: data.wind?.direction?.cardinal,
        wind_gust_kmh: data.wind?.gust?.value,
        precipitation_probability_percent: precipProbability,
        cloud_cover_percent: data.cloudCover,
        visibility_km: data.visibility?.distance,
        pressure_hpa: data.airPressure?.meanSeaLevelMillibars,
        uv_index: data.uvIndex,
        conditions: data.weatherCondition?.description?.text || conditionInfo.description,
        weather_icon: data.weatherCondition?.iconBaseUri,
        is_daytime: data.isDaytime
      },
      agricultural_context: {
        conditions_summary: conditionInfo.agriculturalImpact,
        spray_assessment: {
          recommendation: sprayEval.recommendation,
          factors: sprayEval.reasons
        }
      },
      data_source: 'Google Weather API'
    };

    return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
  } catch (error: unknown) {
    logger.error('Error in weather.google.current', { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: `Unable to get current weather: ${message}` }],
      isError: true
    };
  }
};

const currentDescription = `Get real-time current weather conditions from Google Weather.
TRIGGERS: "what is the weather", "is it raining", "temperature today", "current weather", "weather now"
RETURNS: temperature, humidity, wind, precipitation, UV index, spray conditions assessment.
COVERAGE: Global - Data from Google Weather API.`;

const currentAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

// ===========================================
// TOOL 2: Daily Forecast
// ===========================================

const DailyForecastInputSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
  longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
  days: z.number().min(1).max(10).default(7).optional().describe('Number of forecast days (1-10, default: 7).')
}).strict();

type DailyForecastInput = z.infer<typeof DailyForecastInputSchema>;

const dailyForecastHandler = async ({ latitude, longitude, days = 7 }: DailyForecastInput) => {
  try {
    const lat = latitude ?? requestContext.getStore()?.defaultLatitude;
    const lon = longitude ?? requestContext.getStore()?.defaultLongitude;

    if (lat === undefined || lon === undefined) {
      return {
        content: [{ type: 'text' as const, text: 'Please provide latitude and longitude coordinates.' }],
        isError: true
      };
    }

    logger.info('weather.google.forecast_daily called', { lat, lon, days });

    if (!googleWeatherClient) {
      return {
        content: [{ type: 'text' as const, text: 'Weather service not configured. Try again later.' }],
        isError: true
      };
    }

    const data = await googleWeatherClient.getDailyForecast(lat, lon, days);

    const forecast = data.map(day => {
      const dayForecast = day.daytimeForecast;
      const conditionInfo = getWeatherConditionInfo(dayForecast?.weatherCondition?.type || '');
      const dateStr = day.displayDate
        ? `${day.displayDate.year}-${String(day.displayDate.month).padStart(2, '0')}-${String(day.displayDate.day).padStart(2, '0')}`
        : day.interval?.startTime?.split('T')[0];

      return {
        date: dateStr,
        max_temp_c: day.maxTemperature?.degrees,
        min_temp_c: day.minTemperature?.degrees,
        humidity_percent: dayForecast?.relativeHumidity,
        wind_speed_kmh: dayForecast?.wind?.speed?.value,
        wind_direction_cardinal: dayForecast?.wind?.direction?.cardinal,
        wind_gust_kmh: dayForecast?.wind?.gust?.value,
        precipitation_probability_percent: dayForecast?.precipitation?.probability?.percent,
        precipitation_amount_mm: dayForecast?.precipitation?.qpf?.quantity,
        uv_index: dayForecast?.uvIndex,
        conditions: dayForecast?.weatherCondition?.description?.text || conditionInfo.description,
        weather_icon: dayForecast?.weatherCondition?.iconBaseUri,
        night_conditions: day.nighttimeForecast?.weatherCondition?.description?.text,
        night_weather_icon: day.nighttimeForecast?.weatherCondition?.iconBaseUri,
        sunrise: day.sunEvents?.sunriseTime,
        sunset: day.sunEvents?.sunsetTime,
        moon_phase: day.moonEvents?.moonPhase,
        agricultural_impact: conditionInfo.agriculturalImpact
      };
    });

    const avgMaxTemp = forecast.reduce((sum, d) => sum + (d.max_temp_c || 0), 0) / forecast.length;
    const avgMinTemp = forecast.reduce((sum, d) => sum + (d.min_temp_c || 0), 0) / forecast.length;
    const rainDays = forecast.filter(d => (d.precipitation_probability_percent || 0) > 50).length;

    const response = {
      product: 'Google Weather Daily Forecast',
      provider: 'Google Weather',
      location: { latitude: lat, longitude: lon, coverage: 'Global' },
      period: {
        days,
        start_date: forecast[0]?.date,
        end_date: forecast[forecast.length - 1]?.date
      },
      summary: {
        avg_max_temp_c: Number(avgMaxTemp.toFixed(1)),
        avg_min_temp_c: Number(avgMinTemp.toFixed(1)),
        rain_days: rainDays,
        outlook: rainDays > days / 2 ? 'Wet period expected' : 'Generally dry conditions'
      },
      forecast,
      data_source: 'Google Weather API'
    };

    return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
  } catch (error: unknown) {
    logger.error('Error in weather.google.forecast_daily', { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: `Unable to get daily forecast: ${message}` }],
      isError: true
    };
  }
};

const dailyForecastDescription = `Get daily weather forecast (1-10 days) from Google Weather.
TRIGGERS: "weekly forecast", "weather this week", "next week weather", "when to plant", "planting weather", "harvest weather"
RETURNS: daily min/max temperature, precipitation probability, wind, UV index, sunrise/sunset.
COVERAGE: Global - Data from Google Weather API.`;

const dailyForecastAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

// ===========================================
// TOOL 3: Hourly Forecast
// ===========================================

const HourlyForecastInputSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
  longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
  hours: z.number().min(1).max(240).default(24).optional().describe('Number of forecast hours (1-240, default: 24).')
}).strict();

type HourlyForecastInput = z.infer<typeof HourlyForecastInputSchema>;

const hourlyForecastHandler = async ({ latitude, longitude, hours = 24 }: HourlyForecastInput) => {
  try {
    const lat = latitude ?? requestContext.getStore()?.defaultLatitude;
    const lon = longitude ?? requestContext.getStore()?.defaultLongitude;

    if (lat === undefined || lon === undefined) {
      return {
        content: [{ type: 'text' as const, text: 'Please provide latitude and longitude coordinates.' }],
        isError: true
      };
    }

    logger.info('weather.google.forecast_hourly called', { lat, lon, hours });

    if (!googleWeatherClient) {
      return {
        content: [{ type: 'text' as const, text: 'Weather service not configured. Try again later.' }],
        isError: true
      };
    }

    const data = await googleWeatherClient.getHourlyForecast(lat, lon, hours);

    const sprayWindows: Array<{ start: string; end: string; quality: string }> = [];
    let windowStart: string | null = null;
    let currentQuality: string | null = null;

    const forecast = data.map((hour, index) => {
      const conditionInfo = getWeatherConditionInfo(hour.weatherCondition?.type || '');
      const windSpeedKmh = hour.wind?.speed?.value || 0;
      const humidityPercent = hour.relativeHumidity || 0;
      const precipProbability = hour.precipitation?.probability?.percent || 0;
      const hourTime = hour.interval?.startTime;

      const sprayEval = evaluateSprayConditions(
        hour.weatherCondition?.type || '',
        windSpeedKmh,
        humidityPercent,
        precipProbability
      );

      if (sprayEval.recommendation === 'good' || sprayEval.recommendation === 'fair') {
        if (!windowStart) {
          windowStart = hourTime;
          currentQuality = sprayEval.recommendation;
        }
      } else {
        if (windowStart) {
          sprayWindows.push({
            start: windowStart,
            end: data[index - 1]?.interval?.startTime || hourTime,
            quality: currentQuality || 'fair'
          });
          windowStart = null;
          currentQuality = null;
        }
      }

      return {
        datetime: hourTime,
        temperature_c: hour.temperature?.degrees,
        feels_like_c: hour.feelsLikeTemperature?.degrees,
        humidity_percent: humidityPercent,
        wind_speed_kmh: windSpeedKmh,
        wind_direction_cardinal: hour.wind?.direction?.cardinal,
        wind_gust_kmh: hour.wind?.gust?.value,
        precipitation_probability_percent: precipProbability,
        precipitation_amount_mm: hour.precipitation?.qpf?.quantity,
        cloud_cover_percent: hour.cloudCover,
        uv_index: hour.uvIndex,
        conditions: hour.weatherCondition?.description?.text || conditionInfo.shortDescription,
        weather_icon: hour.weatherCondition?.iconBaseUri,
        is_daytime: hour.isDaytime,
        spray_conditions: sprayEval.recommendation
      };
    });

    if (windowStart && data.length > 0) {
      sprayWindows.push({
        start: windowStart,
        end: data[data.length - 1].interval?.startTime,
        quality: currentQuality || 'fair'
      });
    }

    const response = {
      product: 'Google Weather Hourly Forecast',
      provider: 'Google Weather',
      location: { latitude: lat, longitude: lon, coverage: 'Global' },
      period: {
        hours,
        start: forecast[0]?.datetime,
        end: forecast[forecast.length - 1]?.datetime
      },
      spray_windows: sprayWindows.length > 0 ? sprayWindows : 'No favorable spray windows found',
      forecast,
      data_source: 'Google Weather API'
    };

    return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
  } catch (error: unknown) {
    logger.error('Error in weather.google.forecast_hourly', { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: `Unable to get hourly forecast: ${message}` }],
      isError: true
    };
  }
};

const hourlyForecastDescription = `Get hourly weather forecast (1-240 hours) from Google Weather.
TRIGGERS: "when should I spray", "spray timing", "hourly forecast", "weather tomorrow", "rain tomorrow", "will it rain"
RETURNS: hourly temperature, wind, precipitation, spray condition windows.
COVERAGE: Global - Data from Google Weather API.`;

const hourlyForecastAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

// ===========================================
// TOOL 4: Hourly History (unique to Google Weather)
// ===========================================

const HistoryInputSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
  longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
  hours: z.number().min(1).max(24).default(24).optional().describe('Number of past hours (1-24, default: 24).')
}).strict();

type HistoryInput = z.infer<typeof HistoryInputSchema>;

const historyHandler = async ({ latitude, longitude, hours = 24 }: HistoryInput) => {
  try {
    const lat = latitude ?? requestContext.getStore()?.defaultLatitude;
    const lon = longitude ?? requestContext.getStore()?.defaultLongitude;

    if (lat === undefined || lon === undefined) {
      return {
        content: [{ type: 'text' as const, text: 'Please provide latitude and longitude coordinates.' }],
        isError: true
      };
    }

    logger.info('weather.google.history_hourly called', { lat, lon, hours });

    if (!googleWeatherClient) {
      return {
        content: [{ type: 'text' as const, text: 'Weather service not configured. Try again later.' }],
        isError: true
      };
    }

    const data = await googleWeatherClient.getHourlyHistory(lat, lon, hours);

    const history = data.map(hour => {
      const conditionInfo = getWeatherConditionInfo(hour.weatherCondition?.type || '');

      return {
        datetime: hour.interval?.startTime,
        temperature_c: hour.temperature?.degrees,
        humidity_percent: hour.relativeHumidity,
        wind_speed_kmh: hour.wind?.speed?.value,
        wind_direction_cardinal: hour.wind?.direction?.cardinal,
        precipitation_amount_mm: hour.precipitation?.qpf?.quantity,
        conditions: hour.weatherCondition?.description?.text || conditionInfo.shortDescription,
        weather_icon: hour.weatherCondition?.iconBaseUri,
        uv_index: hour.uvIndex,
        cloud_cover_percent: hour.cloudCover,
        is_daytime: hour.isDaytime
      };
    });

    const temps = history.map(h => h.temperature_c).filter(t => t !== undefined) as number[];
    const precipTotal = history.reduce((sum, h) => sum + (h.precipitation_amount_mm || 0), 0);
    const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
    const minTemp = temps.length > 0 ? Math.min(...temps) : null;
    const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;

    const response = {
      product: 'Google Weather Hourly History',
      provider: 'Google Weather',
      location: { latitude: lat, longitude: lon, coverage: 'Global' },
      period: {
        hours,
        start: history[0]?.datetime,
        end: history[history.length - 1]?.datetime
      },
      summary: {
        max_temp_c: maxTemp !== null ? Number(maxTemp.toFixed(1)) : null,
        min_temp_c: minTemp !== null ? Number(minTemp.toFixed(1)) : null,
        avg_temp_c: avgTemp !== null ? Number(avgTemp.toFixed(1)) : null,
        total_precipitation_mm: Number(precipTotal.toFixed(1))
      },
      history,
      data_source: 'Google Weather API'
    };

    return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
  } catch (error: unknown) {
    logger.error('Error in weather.google.history_hourly', { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text' as const, text: `Unable to get hourly history: ${message}` }],
      isError: true
    };
  }
};

const historyDescription = `Get historical weather data (past 1-24 hours) from Google Weather.
TRIGGERS: "past weather", "weather history", "what was the weather", "yesterday weather", "last night weather"
RETURNS: hourly temperature, humidity, wind, precipitation totals.
COVERAGE: Global - Data from Google Weather API.`;

const historyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

// Singleton McpServer — created once at module level
const mcpServer = new McpServer({
  name: 'google-weather',
  version: '1.0.0',
  description: 'Global weather data from Google Weather API with agricultural insights. Tools: Current conditions, Daily forecast (10 days), Hourly forecast (240 hours), Hourly history (24 hours).'
});

mcpServer.registerTool(
  'weather.google.current',
  {
    title: 'Google Current Weather',
    description: currentDescription,
    inputSchema: CurrentInputSchema,
    annotations: currentAnnotations
  },
  currentHandler
);

mcpServer.registerTool(
  'weather.google.forecast_daily',
  {
    title: 'Google Daily Forecast',
    description: dailyForecastDescription,
    inputSchema: DailyForecastInputSchema,
    annotations: dailyForecastAnnotations
  },
  dailyForecastHandler
);

mcpServer.registerTool(
  'weather.google.forecast_hourly',
  {
    title: 'Google Hourly Forecast',
    description: hourlyForecastDescription,
    inputSchema: HourlyForecastInputSchema,
    annotations: hourlyForecastAnnotations
  },
  hourlyForecastHandler
);

mcpServer.registerTool(
  'weather.google.history_hourly',
  {
    title: 'Google Hourly History',
    description: historyDescription,
    inputSchema: HistoryInputSchema,
    annotations: historyAnnotations
  },
  historyHandler
);

// Main MCP endpoint
app.post('/mcp', authenticateMcp, async (req, res) => {
  const accept = req.headers.accept || '';
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    req.headers.accept = 'application/json, text/event-stream';
  }
  try {
    // Extract default coordinates from headers with validation
    const headerLat = req.headers['x-farm-latitude'] as string;
    const headerLon = req.headers['x-farm-longitude'] as string;
    const parsedLat = headerLat ? parseFloat(headerLat) : NaN;
    const parsedLon = headerLon ? parseFloat(headerLon) : NaN;
    // Validate coordinates are valid numbers within bounds
    const defaultLatitude = !isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90 ? parsedLat : undefined;
    const defaultLongitude = !isNaN(parsedLon) && parsedLon >= -180 && parsedLon <= 180 ? parsedLon : undefined;

    if (defaultLatitude && defaultLongitude) {
      logger.info('Using coordinates from headers', { lat: defaultLatitude, lon: defaultLongitude });
    }

    const context: RequestContext = { defaultLatitude, defaultLongitude };
    await requestContext.run(context, async () => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined // Stateless
      });
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

  } catch (error) {
    logger.error('MCP endpoint error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      },
      id: null
    });
  }
});

// Start server
const HOST = '0.0.0.0';
const serverInstance = app.listen(Number(PORT), HOST, () => {
  logger.info('Server started', {
    host: HOST,
    port: PORT,
    version: '1.0.0',
    googleWeatherApiConfigured: !!GOOGLE_WEATHER_API_KEY,
    tools: ['weather.google.current', 'weather.google.forecast_daily', 'weather.google.forecast_hourly', 'weather.google.history_hourly']
  });
});

// Graceful shutdown handling
function gracefulShutdown(signal: string) {
  logger.info('Shutdown signal received', { signal });
  const forceTimeout = setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout', { signal });
    process.exit(1);
  }, 10_000);
  forceTimeout.unref();
  serverInstance.close(() => {
    logger.info('HTTP server closed gracefully');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global error handlers
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
