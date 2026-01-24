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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { GoogleWeatherClient } from './google-weather-client.js';
import { getWeatherConditionInfo, evaluateSprayConditions } from './weather-codes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-session-id', 'X-Farm-Latitude', 'X-Farm-Longitude'],
  exposedHeaders: ['Content-Type', 'Mcp-Session-Id']
}));

// Serve API documentation
app.use('/docs', express.static(path.join(__dirname, '../docs')));
app.use('/docs', express.static(path.join(__dirname, '../../docs')));

// Environment variables
const GOOGLE_WEATHER_API_KEY = process.env.GOOGLE_WEATHER_API_KEY || '';
const GOOGLE_WEATHER_API_BASE_URL = process.env.GOOGLE_WEATHER_API_BASE_URL || 'https://weather.googleapis.com/v1';
const PORT = process.env.PORT || 3003;

// Warn if key is missing
if (!GOOGLE_WEATHER_API_KEY) {
  console.warn('WARNING: GOOGLE_WEATHER_API_KEY environment variable is not set!');
  console.warn('Server will start but MCP tools will not work until key is configured.');
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
      {
        name: 'get_google_current_conditions',
        description: 'Real-time weather conditions'
      },
      {
        name: 'get_google_daily_forecast',
        description: 'Daily forecast for 1-10 days'
      },
      {
        name: 'get_google_hourly_forecast',
        description: 'Hourly forecast for 1-240 hours'
      },
      {
        name: 'get_google_hourly_history',
        description: 'Past 24-hour weather data'
      }
    ]
  });
});

// Main MCP endpoint
app.post('/mcp', async (req, res) => {
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
      console.log(`[MCP] Using coordinates from headers: lat=${defaultLatitude}, lon=${defaultLongitude}`);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Stateless
    });

    const server = new McpServer({
      name: 'google-weather',
      version: '1.0.0',
      description: 'Global weather data from Google Weather API with agricultural insights. Tools: Current conditions, Daily forecast (10 days), Hourly forecast (240 hours), Hourly history (24 hours).'
    });

    // Tool 1: Get Current Conditions
    server.tool(
      'get_google_current_conditions',
      'Get real-time weather conditions for farming. TRIGGERS: "what is the weather", "is it raining", "temperature today", "current weather", "weather now". Returns temperature, humidity, wind speed, precipitation, UV index, and spray conditions. COVERAGE: Global.',
      {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.')
      },
      async ({ latitude, longitude }) => {
        try {
          const lat = latitude ?? defaultLatitude;
          const lon = longitude ?? defaultLongitude;

          if (lat === undefined || lon === undefined) {
            return {
              content: [{ type: 'text', text: 'Please provide latitude and longitude coordinates.' }],
              isError: true
            };
          }

          console.log(`[MCP Tool] get_google_current_conditions called: lat=${lat}, lon=${lon}`);

          if (!googleWeatherClient) {
            return {
              content: [{ type: 'text', text: 'Weather service not configured. Try again later.' }],
              isError: true
            };
          }

          const data = await googleWeatherClient.getCurrentConditions(lat, lon);
          const conditionInfo = getWeatherConditionInfo(data.weatherCondition?.type || '');

          // Extract weather values
          const windSpeedKmh = data.wind?.speed?.value || 0;
          const humidityPercent = data.relativeHumidity || 0;
          const precipProbability = data.precipitation?.probability?.percent || 0;

          // Evaluate spray conditions
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

          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
        } catch (error: any) {
          console.error('[MCP Tool] Error in get_google_current_conditions:', error);
          return {
            content: [{ type: 'text', text: `Unable to get current weather: ${error.message}` }],
            isError: true
          };
        }
      }
    );

    // Tool 2: Get Daily Forecast
    server.tool(
      'get_google_daily_forecast',
      'Get daily weather forecast for next 1-10 days. TRIGGERS: "weekly forecast", "weather this week", "next week weather", "when to plant", "planting weather", "harvest weather". Ideal for farm planning, planting decisions, harvest timing. Returns daily min/max temperature, precipitation probability. COVERAGE: Global.',
      {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
        days: z.number().min(1).max(10).default(7).optional().describe('Number of forecast days (1-10, default: 7).')
      },
      async ({ latitude, longitude, days = 7 }) => {
        try {
          const lat = latitude ?? defaultLatitude;
          const lon = longitude ?? defaultLongitude;

          if (lat === undefined || lon === undefined) {
            return {
              content: [{ type: 'text', text: 'Please provide latitude and longitude coordinates.' }],
              isError: true
            };
          }

          console.log(`[MCP Tool] get_google_daily_forecast called: lat=${lat}, lon=${lon}, days=${days}`);

          if (!googleWeatherClient) {
            return {
              content: [{ type: 'text', text: 'Weather service not configured. Try again later.' }],
              isError: true
            };
          }

          const data = await googleWeatherClient.getDailyForecast(lat, lon, days);

          const forecast = data.map(day => {
            const dayForecast = day.daytimeForecast;
            const conditionInfo = getWeatherConditionInfo(dayForecast?.weatherCondition?.type || '');
            // Format date from displayDate object
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

          // Calculate summary stats
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

          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
        } catch (error: any) {
          console.error('[MCP Tool] Error in get_google_daily_forecast:', error);
          return {
            content: [{ type: 'text', text: `Unable to get daily forecast: ${error.message}` }],
            isError: true
          };
        }
      }
    );

    // Tool 3: Get Hourly Forecast
    server.tool(
      'get_google_hourly_forecast',
      'Get hourly weather forecast for next 1-240 hours. TRIGGERS: "when should I spray", "spray timing", "hourly forecast", "weather tomorrow", "rain tomorrow", "will it rain". Ideal for spray timing, irrigation planning. Returns hourly temperature, wind, precipitation probability, spray windows. COVERAGE: Global.',
      {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
        hours: z.number().min(1).max(240).default(24).optional().describe('Number of forecast hours (1-240, default: 24).')
      },
      async ({ latitude, longitude, hours = 24 }) => {
        try {
          const lat = latitude ?? defaultLatitude;
          const lon = longitude ?? defaultLongitude;

          if (lat === undefined || lon === undefined) {
            return {
              content: [{ type: 'text', text: 'Please provide latitude and longitude coordinates.' }],
              isError: true
            };
          }

          console.log(`[MCP Tool] get_google_hourly_forecast called: lat=${lat}, lon=${lon}, hours=${hours}`);

          if (!googleWeatherClient) {
            return {
              content: [{ type: 'text', text: 'Weather service not configured. Try again later.' }],
              isError: true
            };
          }

          const data = await googleWeatherClient.getHourlyForecast(lat, lon, hours);

          // Find optimal spray windows
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

            // Track spray windows
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

          // Close any open window
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

          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
        } catch (error: any) {
          console.error('[MCP Tool] Error in get_google_hourly_forecast:', error);
          return {
            content: [{ type: 'text', text: `Unable to get hourly forecast: ${error.message}` }],
            isError: true
          };
        }
      }
    );

    // Tool 4: Get Hourly History (unique to Google Weather)
    server.tool(
      'get_google_hourly_history',
      'Get historical weather data for past 1-24 hours. TRIGGERS: "past weather", "weather history", "what was the weather", "yesterday weather", "last night weather". Useful for analyzing recent conditions that affected crops. COVERAGE: Global.',
      {
        latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate. Optional if provided in headers.'),
        longitude: z.number().min(-180).max(180).optional().describe('Longitude coordinate. Optional if provided in headers.'),
        hours: z.number().min(1).max(24).default(24).optional().describe('Number of past hours (1-24, default: 24).')
      },
      async ({ latitude, longitude, hours = 24 }) => {
        try {
          const lat = latitude ?? defaultLatitude;
          const lon = longitude ?? defaultLongitude;

          if (lat === undefined || lon === undefined) {
            return {
              content: [{ type: 'text', text: 'Please provide latitude and longitude coordinates.' }],
              isError: true
            };
          }

          console.log(`[MCP Tool] get_google_hourly_history called: lat=${lat}, lon=${lon}, hours=${hours}`);

          if (!googleWeatherClient) {
            return {
              content: [{ type: 'text', text: 'Weather service not configured. Try again later.' }],
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

          // Calculate summary stats
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

          return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
        } catch (error: any) {
          console.error('[MCP Tool] Error in get_google_hourly_history:', error);
          return {
            content: [{ type: 'text', text: `Unable to get hourly history: ${error.message}` }],
            isError: true
          };
        }
      }
    );

    // Connect and handle request
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

  } catch (error) {
    console.error('[MCP] Error:', error);
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
  console.log('');
  console.log('=========================================');
  console.log('   Google Weather MCP Server');
  console.log('   Version 1.0.0');
  console.log('=========================================');
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Google Weather API: ${GOOGLE_WEATHER_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log('Tools: 4');
  console.log('   - get_google_current_conditions (real-time conditions)');
  console.log('   - get_google_daily_forecast (1-10 days, planning)');
  console.log('   - get_google_hourly_forecast (1-240 hours, spray timing)');
  console.log('   - get_google_hourly_history (past 24 hours, analysis)');
  console.log('=========================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  serverInstance.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received: closing server');
  serverInstance.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
