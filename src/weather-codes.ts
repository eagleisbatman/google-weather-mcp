/**
 * Google Weather Condition Mappings
 *
 * Comprehensive mapping from Google Weather condition types to:
 * - Human-readable descriptions
 * - Agricultural impact assessment
 * - Spray condition recommendations
 * - Ionicons fallback mappings for offline use
 *
 * Google Weather returns iconBaseUri URLs like:
 * https://maps.gstatic.com/weather/v1/sunny
 */

export interface WeatherConditionInfo {
  type: string;
  description: string;
  shortDescription: string;
  agriculturalImpact: string;
  sprayConditions: 'good' | 'fair' | 'poor' | 'avoid';
  ioniconName: string;  // Fallback icon for offline
}

/**
 * Google Weather condition types
 * Based on the weatherCondition.type field
 */
export const WEATHER_CONDITIONS: Record<string, WeatherConditionInfo> = {
  // Clear/Sunny conditions
  'CLEAR': {
    type: 'CLEAR',
    description: 'Clear, Sunny',
    shortDescription: 'Clear',
    agriculturalImpact: 'Excellent conditions for fieldwork',
    sprayConditions: 'good',
    ioniconName: 'sunny'
  },
  'MOSTLY_CLEAR': {
    type: 'MOSTLY_CLEAR',
    description: 'Mostly Clear',
    shortDescription: 'Mostly Clear',
    agriculturalImpact: 'Good conditions for fieldwork',
    sprayConditions: 'good',
    ioniconName: 'sunny'
  },
  'PARTLY_CLOUDY': {
    type: 'PARTLY_CLOUDY',
    description: 'Partly Cloudy',
    shortDescription: 'Partly Cloudy',
    agriculturalImpact: 'Good conditions for most activities',
    sprayConditions: 'good',
    ioniconName: 'partly-sunny'
  },
  'MOSTLY_CLOUDY': {
    type: 'MOSTLY_CLOUDY',
    description: 'Mostly Cloudy',
    shortDescription: 'Mostly Cloudy',
    agriculturalImpact: 'Good for transplanting, reduced water stress',
    sprayConditions: 'good',
    ioniconName: 'cloudy'
  },
  'CLOUDY': {
    type: 'CLOUDY',
    description: 'Cloudy',
    shortDescription: 'Cloudy',
    agriculturalImpact: 'Good for transplanting, moderate evaporation',
    sprayConditions: 'good',
    ioniconName: 'cloudy'
  },
  'OVERCAST': {
    type: 'OVERCAST',
    description: 'Overcast',
    shortDescription: 'Overcast',
    agriculturalImpact: 'Reduced evaporation, suitable for planting',
    sprayConditions: 'good',
    ioniconName: 'cloudy'
  },

  // Fog
  'FOG': {
    type: 'FOG',
    description: 'Fog',
    shortDescription: 'Fog',
    agriculturalImpact: 'High moisture, disease risk. Delay spraying.',
    sprayConditions: 'avoid',
    ioniconName: 'cloudy'
  },
  'LIGHT_FOG': {
    type: 'LIGHT_FOG',
    description: 'Light Fog',
    shortDescription: 'Light Fog',
    agriculturalImpact: 'Moderate moisture, wait for clearing',
    sprayConditions: 'poor',
    ioniconName: 'cloudy'
  },
  'DENSE_FOG': {
    type: 'DENSE_FOG',
    description: 'Dense Fog',
    shortDescription: 'Dense Fog',
    agriculturalImpact: 'Very high moisture, no outdoor activities',
    sprayConditions: 'avoid',
    ioniconName: 'cloudy'
  },
  'HAZE': {
    type: 'HAZE',
    description: 'Haze',
    shortDescription: 'Haze',
    agriculturalImpact: 'Reduced visibility, possible air quality concerns',
    sprayConditions: 'fair',
    ioniconName: 'cloudy'
  },

  // Rain
  'DRIZZLE': {
    type: 'DRIZZLE',
    description: 'Drizzle',
    shortDescription: 'Drizzle',
    agriculturalImpact: 'Light moisture, delay spraying',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },
  'LIGHT_RAIN': {
    type: 'LIGHT_RAIN',
    description: 'Light Rain',
    shortDescription: 'Light Rain',
    agriculturalImpact: 'Light moisture, pause outdoor activities',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },
  'RAIN': {
    type: 'RAIN',
    description: 'Rain',
    shortDescription: 'Rain',
    agriculturalImpact: 'No fieldwork recommended',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },
  'MODERATE_RAIN': {
    type: 'MODERATE_RAIN',
    description: 'Moderate Rain',
    shortDescription: 'Moderate Rain',
    agriculturalImpact: 'Avoid fieldwork, check drainage',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },
  'HEAVY_RAIN': {
    type: 'HEAVY_RAIN',
    description: 'Heavy Rain',
    shortDescription: 'Heavy Rain',
    agriculturalImpact: 'Flooding risk, check drainage',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },
  'SHOWERS': {
    type: 'SHOWERS',
    description: 'Showers',
    shortDescription: 'Showers',
    agriculturalImpact: 'Intermittent rain, plan activities between showers',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },

  // Snow
  'SNOW': {
    type: 'SNOW',
    description: 'Snow',
    shortDescription: 'Snow',
    agriculturalImpact: 'Protect sensitive crops',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'LIGHT_SNOW': {
    type: 'LIGHT_SNOW',
    description: 'Light Snow',
    shortDescription: 'Light Snow',
    agriculturalImpact: 'Cold stress on crops',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'HEAVY_SNOW': {
    type: 'HEAVY_SNOW',
    description: 'Heavy Snow',
    shortDescription: 'Heavy Snow',
    agriculturalImpact: 'Severe cold stress, protect livestock',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'FLURRIES': {
    type: 'FLURRIES',
    description: 'Flurries',
    shortDescription: 'Flurries',
    agriculturalImpact: 'Light snow, monitor temperatures',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'BLIZZARD': {
    type: 'BLIZZARD',
    description: 'Blizzard',
    shortDescription: 'Blizzard',
    agriculturalImpact: 'Dangerous conditions, stay indoors',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },

  // Freezing conditions
  'FREEZING_DRIZZLE': {
    type: 'FREEZING_DRIZZLE',
    description: 'Freezing Drizzle',
    shortDescription: 'Freezing Drizzle',
    agriculturalImpact: 'Ice formation risk, protect crops',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'FREEZING_RAIN': {
    type: 'FREEZING_RAIN',
    description: 'Freezing Rain',
    shortDescription: 'Freezing Rain',
    agriculturalImpact: 'Severe ice risk, protect all crops',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },

  // Ice/Hail
  'SLEET': {
    type: 'SLEET',
    description: 'Sleet',
    shortDescription: 'Sleet',
    agriculturalImpact: 'Crop damage risk',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'ICE_PELLETS': {
    type: 'ICE_PELLETS',
    description: 'Ice Pellets',
    shortDescription: 'Ice Pellets',
    agriculturalImpact: 'Crop damage risk',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },
  'HAIL': {
    type: 'HAIL',
    description: 'Hail',
    shortDescription: 'Hail',
    agriculturalImpact: 'Severe crop damage risk, take cover',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  },

  // Thunderstorms
  'THUNDERSTORM': {
    type: 'THUNDERSTORM',
    description: 'Thunderstorm',
    shortDescription: 'Thunderstorm',
    agriculturalImpact: 'Dangerous conditions, stay indoors',
    sprayConditions: 'avoid',
    ioniconName: 'thunderstorm'
  },
  'ISOLATED_THUNDERSTORM': {
    type: 'ISOLATED_THUNDERSTORM',
    description: 'Isolated Thunderstorms',
    shortDescription: 'Scattered Storms',
    agriculturalImpact: 'Monitor weather, be prepared to take cover',
    sprayConditions: 'avoid',
    ioniconName: 'thunderstorm'
  },
  'SCATTERED_THUNDERSTORM': {
    type: 'SCATTERED_THUNDERSTORM',
    description: 'Scattered Thunderstorms',
    shortDescription: 'Scattered Storms',
    agriculturalImpact: 'Frequent storms, avoid outdoor work',
    sprayConditions: 'avoid',
    ioniconName: 'thunderstorm'
  },
  'SEVERE_THUNDERSTORM': {
    type: 'SEVERE_THUNDERSTORM',
    description: 'Severe Thunderstorm',
    shortDescription: 'Severe Storm',
    agriculturalImpact: 'Dangerous conditions, seek shelter',
    sprayConditions: 'avoid',
    ioniconName: 'thunderstorm'
  },

  // Wind
  'WINDY': {
    type: 'WINDY',
    description: 'Windy',
    shortDescription: 'Windy',
    agriculturalImpact: 'Spray drift risk, secure loose items',
    sprayConditions: 'avoid',
    ioniconName: 'cloudy'
  },
  'BREEZY': {
    type: 'BREEZY',
    description: 'Breezy',
    shortDescription: 'Breezy',
    agriculturalImpact: 'Moderate spray drift risk',
    sprayConditions: 'poor',
    ioniconName: 'cloudy'
  },

  // Mixed conditions
  'RAIN_AND_SNOW': {
    type: 'RAIN_AND_SNOW',
    description: 'Rain and Snow Mix',
    shortDescription: 'Rain/Snow',
    agriculturalImpact: 'Cold wet conditions, protect crops',
    sprayConditions: 'avoid',
    ioniconName: 'rainy'
  },
  'WINTRY_MIX': {
    type: 'WINTRY_MIX',
    description: 'Wintry Mix',
    shortDescription: 'Wintry Mix',
    agriculturalImpact: 'Mixed precipitation, hazardous conditions',
    sprayConditions: 'avoid',
    ioniconName: 'snow'
  }
};

/**
 * Default condition info for unknown types
 */
const DEFAULT_CONDITION: WeatherConditionInfo = {
  type: 'UNKNOWN',
  description: 'Unknown',
  shortDescription: 'Unknown',
  agriculturalImpact: 'Check local conditions',
  sprayConditions: 'fair',
  ioniconName: 'cloudy'
};

/**
 * Get weather condition info with fallback for unknown types
 */
export function getWeatherConditionInfo(type: string): WeatherConditionInfo {
  // Normalize type to uppercase and handle variations
  const normalizedType = type?.toUpperCase().replace(/[\s-]+/g, '_') || 'UNKNOWN';
  return WEATHER_CONDITIONS[normalizedType] || DEFAULT_CONDITION;
}

/**
 * Extract icon type from Google icon URL
 * e.g., "https://maps.gstatic.com/weather/v1/sunny" -> "sunny"
 */
export function extractIconType(iconBaseUri: string): string {
  if (!iconBaseUri) return 'unknown';
  const parts = iconBaseUri.split('/');
  return parts[parts.length - 1] || 'unknown';
}

/**
 * Get Ionicon name from Google icon URL for offline fallback
 */
export function getIoniconFromGoogleIcon(iconBaseUri: string): string {
  const iconType = extractIconType(iconBaseUri).toLowerCase();

  const iconMapping: Record<string, string> = {
    'sunny': 'sunny',
    'clear': 'sunny',
    'clear_day': 'sunny',
    'clear_night': 'moon',
    'partly_cloudy': 'partly-sunny',
    'partly_cloudy_day': 'partly-sunny',
    'partly_cloudy_night': 'cloudy-night',
    'mostly_cloudy': 'cloudy',
    'cloudy': 'cloudy',
    'overcast': 'cloudy',
    'fog': 'cloudy',
    'haze': 'cloudy',
    'drizzle': 'rainy',
    'rain': 'rainy',
    'light_rain': 'rainy',
    'heavy_rain': 'rainy',
    'showers': 'rainy',
    'thunderstorm': 'thunderstorm',
    'snow': 'snow',
    'light_snow': 'snow',
    'heavy_snow': 'snow',
    'sleet': 'snow',
    'hail': 'snow',
    'windy': 'flag',
    'tornado': 'warning'
  };

  return iconMapping[iconType] || 'cloudy';
}

/**
 * Evaluate spray conditions based on weather parameters
 */
export function evaluateSprayConditions(
  conditionType: string,
  windSpeedKmh: number,
  humidityPercent: number,
  precipProbabilityPercent: number
): {
  recommendation: 'good' | 'fair' | 'poor' | 'avoid';
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  // Weather condition impact
  const conditionInfo = getWeatherConditionInfo(conditionType);
  if (conditionInfo.sprayConditions === 'avoid') {
    return { recommendation: 'avoid', reasons: [`Weather: ${conditionInfo.description}`] };
  }
  if (conditionInfo.sprayConditions === 'poor') score -= 2;
  if (conditionInfo.sprayConditions === 'fair') score -= 1;

  // Wind speed (ideal: 3-10 km/h)
  if (windSpeedKmh > 16) {
    reasons.push('Wind too strong (>16 km/h) - spray drift risk');
    score -= 3;
  } else if (windSpeedKmh > 10) {
    reasons.push('Wind moderate - some drift possible');
    score -= 1;
  } else if (windSpeedKmh < 2) {
    reasons.push('Very calm - inversion risk');
    score -= 1;
  }

  // Humidity (ideal: 40-80%)
  if (humidityPercent < 40) {
    reasons.push('Low humidity (<40%) - rapid evaporation');
    score -= 2;
  } else if (humidityPercent > 90) {
    reasons.push('High humidity (>90%) - slow drying');
    score -= 1;
  }

  // Precipitation probability
  if (precipProbabilityPercent > 50) {
    reasons.push(`High rain probability (${precipProbabilityPercent}%)`);
    score -= 3;
  } else if (precipProbabilityPercent > 30) {
    reasons.push(`Moderate rain chance (${precipProbabilityPercent}%)`);
    score -= 1;
  }

  // Determine recommendation
  let recommendation: 'good' | 'fair' | 'poor' | 'avoid';
  if (score >= 0) recommendation = 'good';
  else if (score >= -2) recommendation = 'fair';
  else if (score >= -4) recommendation = 'poor';
  else recommendation = 'avoid';

  if (reasons.length === 0) {
    reasons.push('Conditions favorable for spraying');
  }

  return { recommendation, reasons };
}
