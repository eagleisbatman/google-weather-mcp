/**
 * Google Weather API Client
 *
 * Wrapper for Google Weather API.
 * Provides current conditions, hourly forecasts, daily forecasts, and hourly history.
 *
 * API Documentation: https://developers.google.com/maps/documentation/weather
 */

import fetch, { Response } from 'node-fetch';

/**
 * Google Weather API response interfaces
 * Based on actual API responses (not wrapped in sub-objects)
 */
export interface GoogleWeatherCurrentConditions {
  currentTime: string;
  timeZone?: {
    id: string;
  };
  isDaytime: boolean;
  weatherCondition: {
    iconBaseUri: string;
    description: {
      text: string;
      languageCode: string;
    };
    type: string;
  };
  temperature: {
    degrees: number;
    unit: string;
  };
  feelsLikeTemperature: {
    degrees: number;
    unit: string;
  };
  dewPoint: {
    degrees: number;
    unit: string;
  };
  heatIndex?: {
    degrees: number;
    unit: string;
  };
  windChill?: {
    degrees: number;
    unit: string;
  };
  wetBulbTemperature?: {
    degrees: number;
    unit: string;
  };
  relativeHumidity: number; // API returns this directly as a number
  uvIndex: number;
  precipitation: {
    probability: {
      percent: number;
      type: string;
    };
    qpf: {
      quantity: number;
      unit: string;
    };
    snowQpf?: {
      quantity: number;
      unit: string;
    };
  };
  thunderstormProbability?: number;
  airQuality?: {
    aqi: {
      index: number;
      indexType: string;
    };
    category: string;
    primaryPollutant: string;
  };
  wind: {
    direction: {
      degrees: number;
      cardinal: string;
    };
    speed: {
      value: number;
      unit: string;
    };
    gust?: {
      value: number;
      unit: string;
    };
  };
  visibility: {
    distance: number;
    unit: string;
  };
  airPressure: {
    meanSeaLevelMillibars: number;
  };
  cloudCover: number;
  currentConditionsHistory?: {
    temperatureChange: { degrees: number; unit: string };
    maxTemperature: { degrees: number; unit: string };
    minTemperature: { degrees: number; unit: string };
    qpf: { quantity: number; unit: string };
    snowQpf: { quantity: number; unit: string };
  };
}

export interface GoogleWeatherHourlyForecast {
  interval: {
    startTime: string;
    endTime: string;
  };
  displayDateTime?: {
    year: number;
    month: number;
    day: number;
    hours: number;
    minutes: number;
    seconds: number;
    nanos: number;
    utcOffset: string;
  };
  isDaytime: boolean;
  weatherCondition: {
    iconBaseUri: string;
    description: {
      text: string;
      languageCode: string;
    };
    type: string;
  };
  temperature: {
    degrees: number;
    unit: string;
  };
  feelsLikeTemperature: {
    degrees: number;
    unit: string;
  };
  dewPoint?: {
    degrees: number;
    unit: string;
  };
  heatIndex?: {
    degrees: number;
    unit: string;
  };
  windChill?: {
    degrees: number;
    unit: string;
  };
  wetBulbTemperature?: {
    degrees: number;
    unit: string;
  };
  relativeHumidity: number;
  uvIndex: number;
  precipitation: {
    probability: {
      percent: number;
      type: string;
    };
    qpf: {
      quantity: number;
      unit: string;
    };
    snowQpf?: {
      quantity: number;
      unit: string;
    };
  };
  thunderstormProbability?: number;
  wind: {
    direction: {
      degrees: number;
      cardinal: string;
    };
    speed: {
      value: number;
      unit: string;
    };
    gust?: {
      value: number;
      unit: string;
    };
  };
  visibility?: {
    distance: number;
    unit: string;
  };
  airPressure?: {
    meanSeaLevelMillibars: number;
  };
  cloudCover: number;
  iceThickness?: {
    thickness: number;
    unit: string;
  };
}

interface DayPartForecast {
  interval?: {
    startTime: string;
    endTime: string;
  };
  weatherCondition: {
    iconBaseUri: string;
    description: {
      text: string;
      languageCode: string;
    };
    type: string;
  };
  relativeHumidity: number;
  uvIndex: number;
  precipitation: {
    probability: {
      percent: number;
      type: string;
    };
    qpf: {
      quantity: number;
      unit: string;
    };
    snowQpf?: {
      quantity: number;
      unit: string;
    };
  };
  thunderstormProbability?: number;
  wind: {
    direction: {
      degrees: number;
      cardinal: string;
    };
    speed: {
      value: number;
      unit: string;
    };
    gust?: {
      value: number;
      unit: string;
    };
  };
  cloudCover: number;
  iceThickness?: {
    thickness: number;
    unit: string;
  };
}

export interface GoogleWeatherDailyForecast {
  interval: {
    startTime: string;
    endTime: string;
  };
  displayDate: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast: DayPartForecast;
  nighttimeForecast?: DayPartForecast;
  maxTemperature: {
    degrees: number;
    unit: string;
  };
  minTemperature: {
    degrees: number;
    unit: string;
  };
  feelsLikeMaxTemperature?: {
    degrees: number;
    unit: string;
  };
  feelsLikeMinTemperature?: {
    degrees: number;
    unit: string;
  };
  sunEvents?: {
    sunriseTime: string;
    sunsetTime: string;
  };
  moonEvents?: {
    moonPhase: string;
    moonriseTimes?: string[];
    moonsetTimes?: string[];
  };
  maxHeatIndex?: {
    degrees: number;
    unit: string;
  };
  iceThickness?: {
    thickness: number;
    unit: string;
  };
}

export interface GoogleWeatherHourlyHistory {
  interval: {
    startTime: string;
    endTime: string;
  };
  displayDateTime?: {
    year: number;
    month: number;
    day: number;
    hours: number;
    minutes: number;
    seconds: number;
    nanos: number;
    utcOffset: string;
  };
  temperature: {
    degrees: number;
    unit: string;
  };
  feelsLikeTemperature?: {
    degrees: number;
    unit: string;
  };
  dewPoint?: {
    degrees: number;
    unit: string;
  };
  heatIndex?: {
    degrees: number;
    unit: string;
  };
  windChill?: {
    degrees: number;
    unit: string;
  };
  wetBulbTemperature?: {
    degrees: number;
    unit: string;
  };
  relativeHumidity: number;
  precipitation: {
    probability?: {
      percent: number;
      type: string;
    };
    qpf: {
      quantity: number;
      unit: string;
    };
    snowQpf?: {
      quantity: number;
      unit: string;
    };
  };
  thunderstormProbability?: number;
  wind: {
    direction: {
      degrees: number;
      cardinal: string;
    };
    speed: {
      value: number;
      unit: string;
    };
    gust?: {
      value: number;
      unit: string;
    };
  };
  weatherCondition: {
    iconBaseUri: string;
    description: {
      text: string;
      languageCode: string;
    };
    type: string;
  };
  isDaytime: boolean;
  uvIndex: number;
  cloudCover: number;
  iceThickness?: {
    thickness: number;
    unit: string;
  };
  visibility?: {
    distance: number;
    unit: string;
  };
  airPressure?: {
    meanSeaLevelMillibars: number;
  };
}

// Note: Google Weather API returns current conditions directly at root level (not wrapped)
export type GoogleCurrentConditionsResponse = GoogleWeatherCurrentConditions;

// Note: Hourly forecast returns forecastHours at root level
export interface GoogleHourlyForecastResponse {
  forecastHours: GoogleWeatherHourlyForecast[];
}

// Note: Daily forecast returns forecastDays at root level
export interface GoogleDailyForecastResponse {
  forecastDays: GoogleWeatherDailyForecast[];
}

// Note: Hourly history returns historyHours at root level
export interface GoogleHourlyHistoryResponse {
  historyHours: GoogleWeatherHourlyHistory[];
}

/**
 * Client for Google Weather API
 *
 * Includes rate limit detection and retry logic for transient failures.
 */
export class GoogleWeatherClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://weather.googleapis.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Make an API request with rate limit detection and retry logic
   * @param url - The URL to fetch
   * @param retries - Number of retries for transient errors (default: 1)
   * @returns The fetch Response
   */
  private async fetchWithRetry(url: string, retries: number = 1): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Google-Weather-MCP-Server/1.0.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.warn(`[Google Weather] Rate limited (429). Retry-After: ${retryAfter || 'not specified'}`);
        throw new Error(`Google Weather API rate limit exceeded. Please wait before retrying.`);
      }

      // Handle quota exceeded (403)
      if (response.status === 403) {
        const errorBody = await response.text();
        if (errorBody.includes('RESOURCE_EXHAUSTED') || errorBody.includes('quota')) {
          throw new Error('Google Weather API quota exceeded. Check your API key quota in Google Cloud Console.');
        }
        throw new Error(`Google Weather API access denied: ${errorBody}`);
      }

      // Handle API key errors (400)
      if (response.status === 400) {
        const errorBody = await response.text();
        if (errorBody.includes('API_KEY_INVALID') || errorBody.includes('invalid key')) {
          throw new Error('Invalid Google Weather API key. Please check your API key configuration.');
        }
        throw new Error(`Google Weather API bad request: ${errorBody}`);
      }

      // Retry on server errors (5xx)
      if (response.status >= 500 && retries > 0) {
        console.warn(`[Google Weather] Server error (${response.status}), retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchWithRetry(url, retries - 1);
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Google Weather API took too long (30s limit)');
      }
      // Retry on network errors
      if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
        console.warn(`[Google Weather] Network error (${error.code}), retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchWithRetry(url, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Validate latitude and longitude
   */
  private validateCoordinates(lat: number, lon: number): void {
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
    }
    if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
      throw new Error(`Invalid longitude: ${lon}. Must be between -180 and 180.`);
    }
  }

  /**
   * Build URL with location parameters
   */
  private buildUrl(endpoint: string, lat: number, lon: number, additionalParams?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('location.latitude', lat.toString());
    url.searchParams.append('location.longitude', lon.toString());
    url.searchParams.append('unitsSystem', 'METRIC');

    if (additionalParams) {
      for (const [key, value] of Object.entries(additionalParams)) {
        url.searchParams.append(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Get current weather conditions
   */
  async getCurrentConditions(lat: number, lon: number): Promise<GoogleWeatherCurrentConditions> {
    this.validateCoordinates(lat, lon);

    const url = this.buildUrl('currentConditions:lookup', lat, lon);
    console.log(`[Google Weather] Fetching current conditions: ${url.replace(this.apiKey, '***')}`);

    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Weather API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json() as GoogleCurrentConditionsResponse;

    if (!data || !data.currentTime) {
      throw new Error('Invalid API response format: missing currentTime');
    }

    console.log(`[Google Weather] Received current conditions for ${lat}, ${lon}`);
    return data;
  }

  /**
   * Get daily forecast (1-10 days)
   */
  async getDailyForecast(lat: number, lon: number, days: number = 7): Promise<GoogleWeatherDailyForecast[]> {
    this.validateCoordinates(lat, lon);

    if (days < 1 || days > 10) {
      throw new Error(`Invalid days: ${days}. Must be between 1 and 10.`);
    }

    const url = this.buildUrl('forecast/days:lookup', lat, lon, {
      'days': days.toString()
    });
    console.log(`[Google Weather] Fetching ${days}-day forecast: ${url.replace(this.apiKey, '***')}`);

    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Weather API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json() as GoogleDailyForecastResponse;

    if (!data || !data.forecastDays) {
      throw new Error('Invalid API response format: missing forecastDays');
    }

    console.log(`[Google Weather] Received ${data.forecastDays.length} daily forecasts for ${lat}, ${lon}`);
    return data.forecastDays;
  }

  /**
   * Get hourly forecast (1-240 hours)
   */
  async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<GoogleWeatherHourlyForecast[]> {
    this.validateCoordinates(lat, lon);

    if (hours < 1 || hours > 240) {
      throw new Error(`Invalid hours: ${hours}. Must be between 1 and 240.`);
    }

    const url = this.buildUrl('forecast/hours:lookup', lat, lon, {
      'hours': hours.toString()
    });
    console.log(`[Google Weather] Fetching ${hours}-hour forecast: ${url.replace(this.apiKey, '***')}`);

    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Weather API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json() as GoogleHourlyForecastResponse;

    if (!data || !data.forecastHours) {
      throw new Error('Invalid API response format: missing forecastHours');
    }

    console.log(`[Google Weather] Received ${data.forecastHours.length} hourly forecasts for ${lat}, ${lon}`);
    return data.forecastHours;
  }

  /**
   * Get hourly history (past 1-24 hours)
   */
  async getHourlyHistory(lat: number, lon: number, hours: number = 24): Promise<GoogleWeatherHourlyHistory[]> {
    this.validateCoordinates(lat, lon);

    if (hours < 1 || hours > 24) {
      throw new Error(`Invalid hours: ${hours}. Must be between 1 and 24.`);
    }

    const url = this.buildUrl('history/hours:lookup', lat, lon, {
      'hours': hours.toString()
    });
    console.log(`[Google Weather] Fetching ${hours}-hour history: ${url.replace(this.apiKey, '***')}`);

    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Weather API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json() as GoogleHourlyHistoryResponse;

    if (!data || !data.historyHours) {
      throw new Error('Invalid API response format: missing historyHours');
    }

    console.log(`[Google Weather] Received ${data.historyHours.length} hourly history entries for ${lat}, ${lon}`);
    return data.historyHours;
  }
}
