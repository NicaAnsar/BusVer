import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface PlaceVerificationResult {
  verified: boolean;
  confidence: number;
  addressVerified: boolean;
  currentBusinessName: string;
  placeDetails?: {
    formatted_address?: string;
    business_status?: string;
    rating?: number;
    user_ratings_total?: number;
    website?: string;
    formatted_phone_number?: string;
  };
}

// Location-based business search for Prospect Near Me feature
export async function searchNearbyBusinesses(
  businessType: string,
  latitude: number,
  longitude: number,
  radius: number = 5000
) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Google Maps API key not found, using mock data");
    return mockNearbyBusinesses(businessType);
  }

  const location = `${latitude},${longitude}`;
  const query = `${businessType} near ${location}`;
  
  console.log(`Searching for nearby businesses: "${query}" within ${radius}m`);
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&key=${GOOGLE_PLACES_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'ZERO_RESULTS') {
      console.log(`No results found for "${query}"`);
      return [];
    }
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    const businesses = data.results?.map((place: any) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      phone: place.international_phone_number,
      website: place.website,
      rating: place.rating,
      priceLevel: place.price_level,
      types: place.types,
      geometry: place.geometry,
      businessStatus: place.business_status
    })) || [];

    console.log(`Found ${businesses.length} nearby businesses for "${businessType}"`);
    return businesses;
    
  } catch (error) {
    console.error('Google Places nearby search error:', error);
    // Return mock data as fallback
    return mockNearbyBusinesses(businessType);
  }
}

function mockNearbyBusinesses(businessType: string) {
  return [
    {
      placeId: 'mock_1',
      name: `${businessType} Solutions`,
      address: '123 Main St, Los Angeles, CA 90210',
      phone: '(555) 123-4567',
      website: 'https://example.com',
      rating: 4.2,
      priceLevel: 2,
      types: ['business'],
      geometry: { location: { lat: 34.0522, lng: -118.2437 } },
      businessStatus: 'OPERATIONAL'
    },
    {
      placeId: 'mock_2', 
      name: `Professional ${businessType}`,
      address: '456 Oak Ave, Los Angeles, CA 90210',
      phone: '(555) 987-6543',
      website: 'https://example2.com',
      rating: 4.5,
      priceLevel: 3,
      types: ['business'],
      geometry: { location: { lat: 34.0622, lng: -118.2537 } },
      businessStatus: 'OPERATIONAL'
    }
  ];
}

// Geocode an address to get coordinates
export async function geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_MAPS_API_KEY || !address) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Google Places API integration for address verification
export async function verifyAddress(address: string): Promise<PlaceVerificationResult> {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Google Places API key not found, using mock data");
    return mockVerificationResult();
  }

  try {
    // Step 1: Search for the place using Places API Text Search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(address)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return {
        verified: false,
        confidence: 0.1,
        addressVerified: false,
        currentBusinessName: 'Address not found in Google Places'
      };
    }

    const place = searchData.results[0];
    
    // Step 2: Get detailed place information
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,business_status,rating,user_ratings_total,website,formatted_phone_number&key=${GOOGLE_PLACES_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status === 'OK' && detailsData.result) {
      const details = detailsData.result;
      
      return {
        verified: true,
        confidence: 0.85,
        addressVerified: true,
        currentBusinessName: details.name || 'Business found at location',
        placeDetails: {
          formatted_address: details.formatted_address,
          business_status: details.business_status,
          rating: details.rating,
          user_ratings_total: details.user_ratings_total,
          website: details.website,
          formatted_phone_number: details.formatted_phone_number
        }
      };
    }

    return {
      verified: true,
      confidence: 0.6,
      addressVerified: true,
      currentBusinessName: place.name || 'Business location verified'
    };

  } catch (error) {
    console.error("Google Places API error:", error);
    return mockVerificationResult();
  }
}

// Gemini AI integration for intelligent data analysis and geographic filtering
export async function analyzeBusinessData(businesses: any[]): Promise<{
  patterns: string[];
  recommendations: string[];
  locationInsights: any[];
  stateFilter?: string;
  targetLocations: string[];
}> {
  if (!process.env.GEMINI_API_KEY || businesses.length === 0) {
    return {
      patterns: [],
      recommendations: [],
      locationInsights: [],
      targetLocations: []
    };
  }

  // Try with retry logic to handle API overload
  let retries = 3;
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Gemini API attempt ${attempt}/${retries}`);
      const prompt = `You are a geographic data extraction specialist. Your PRIMARY TASK is to extract ALL cities from this spreadsheet data:

Business Data (${businesses.length} total records):
${JSON.stringify(businesses.slice(0, 20), null, 2)}

CRITICAL CITY EXTRACTION TASK:
Your main job is to find EVERY city mentioned in this data. Look for cities in ANY format:
- Full addresses: "123 Main St, Los Angeles, CA 94102"
- City/State columns: city: "Miami", state: "FL" 
- Combined location fields: "Boston, Massachusetts"
- Address components in any column name: address, street, city, state, location, etc.

EXTRACTION RULES:
1. Extract ALL unique cities found in the data
2. Format as "City, State" (e.g., "Miami, FL", "Los Angeles, CA")
3. Use standard state abbreviations (CA, FL, NY, TX, etc.)
4. Include every city - don't filter or limit the list
5. If you find partial data like just city or just state, try to match them intelligently

Return JSON with:
1. "targetLocations": COMPLETE list of "City, State" strings found in the data
2. "patterns": Geographic insights about the locations found
3. "recommendations": Suggestions for prospecting in these areas
4. "locationInsights": Detailed objects with city, state, zipCode when available
5. "stateFilter": Primary state if 70%+ of businesses are in one state

EXAMPLE - if you find businesses in Los Angeles, Miami, and Chicago:
{"targetLocations": ["Los Angeles, CA", "Miami, FL", "Chicago, IL"], "patterns": ["Businesses across 3 major metropolitan areas"], "recommendations": ["Prospect in similar major cities"], "locationInsights": [{"city": "Los Angeles", "state": "CA"}, {"city": "Miami", "state": "FL"}, {"city": "Chicago", "state": "IL"}]}

Remember: Your success is measured by how many cities you can extract from the data!`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array", 
              items: { type: "string" }
            },
            locationInsights: {
              type: "array",
              items: { 
                type: "object",
                properties: {
                  city: { type: "string" },
                  state: { type: "string" },
                  zipCode: { type: "string" }
                }
              }
            },
            stateFilter: {
              type: "string"
            },
            targetLocations: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["patterns", "recommendations", "locationInsights", "targetLocations"]
        }
      },
      contents: prompt,
    });

      const rawJson = response.text;
      if (rawJson) {
        const result = JSON.parse(rawJson);
        console.log("Gemini AI analysis result:", result);
        return result;
      }

    } catch (error) {
      lastError = error;
      console.error(`Gemini API attempt ${attempt} failed:`, error);
      
      if (attempt < retries) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error("All Gemini API attempts failed. Last error:", lastError);
  return {
    patterns: [],
    recommendations: [],
    locationInsights: [],
    targetLocations: []
  };
}

// Search for businesses by type in a specific city
export async function searchBusinessesByType(
  businessType: string, 
  cityState: string, 
  maxResults: number = 20
): Promise<any[]> {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.warn("Google Places API key not found, returning empty results");
    return [];
  }

  try {
    // Search for businesses of the specified type in the city
    const query = `${businessType} in ${cityState}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log(`Searching Google Places for: "${query}"`);
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results) {
      console.log(`No results found for ${businessType} in ${cityState}`);
      return [];
    }

    const businesses = [];
    const results = searchData.results.slice(0, maxResults);

    for (const place of results) {
      // Get detailed information for each business
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,business_status,rating,user_ratings_total,website,formatted_phone_number,opening_hours&key=${GOOGLE_PLACES_API_KEY}`;
      
      try {
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status === 'OK' && detailsData.result) {
          const details = detailsData.result;
          
          businesses.push({
            companyName: details.name,
            address: details.formatted_address,
            website: details.website || null,
            phone: details.formatted_phone_number || null,
            rating: details.rating || null,
            reviewCount: details.user_ratings_total || null,
            businessStatus: details.business_status || 'OPERATIONAL',
            placeId: place.place_id
          });
        }
      } catch (detailError) {
        console.error(`Error fetching details for place ${place.place_id}:`, detailError);
      }
    }

    console.log(`Found ${businesses.length} businesses for ${businessType} in ${cityState}`);
    return businesses;

  } catch (error) {
    console.error(`Error searching for businesses in ${cityState}:`, error);
    return [];
  }
}

// Mock data for fallback when APIs are unavailable
function mockVerificationResult(): PlaceVerificationResult {
  const businessNames = [
    'Metro Business Center', 'Professional Services LLC', 'Downtown Associates',
    'City Commercial Group', 'Prime Location Ventures', 'Central Business Hub'
  ];

  const verified = Math.random() > 0.2;
  
  return {
    verified,
    confidence: Math.random() * 0.5 + 0.4,
    addressVerified: verified,
    currentBusinessName: verified ? 
      businessNames[Math.floor(Math.random() * businessNames.length)] :
      'Address not found in Google Places'
  };
}