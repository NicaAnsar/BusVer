import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, X, Phone, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LocationData {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
}

interface ProspectMapProps {
  locations: LocationData[];
  center?: { lat: number; lng: number };
  title?: string;
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export function ProspectMap({ locations, center, title = "Business Locations", className = "" }: ProspectMapProps) {
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Check if Google Maps API is already loaded
  useEffect(() => {
    if (window.google?.maps) {
      setIsApiLoaded(true);
      return;
    }

    // Get API key
    const windowKey = (window as any).VITE_GOOGLE_MAPS_API_KEY;
    const viteKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const apiKey = windowKey && windowKey !== '__GOOGLE_MAPS_API_KEY__' ? windowKey : viteKey;
    
    if (!apiKey || apiKey === '__GOOGLE_MAPS_API_KEY__') {
      setMapError('Maps not available - API key missing');
      return;
    }

    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = false;
    script.defer = false;
    
    script.onload = () => {
      if (window.google?.maps) {
        setIsApiLoaded(true);
      } else {
        setMapError('Failed to load Google Maps API');
      }
    };
    
    script.onerror = () => {
      setMapError('Error loading Google Maps API');
    };

    document.head.appendChild(script);
  }, []);

  // Initialize map when shown
  const initializeMap = async () => {
    if (!isApiLoaded || !mapRef.current || !window.google?.maps) {
      return;
    }

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      const defaultCenter = center || (locations.length > 0 
        ? { lat: locations[0].lat, lng: locations[0].lng }
        : { lat: 39.8283, lng: -98.5795 }
      );
      
      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstance.current = map;

      // Add user location marker if provided
      if (center) {
        const userMarker = new window.google.maps.Marker({
          position: center,
          map: map,
          title: 'Your Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#3B82F6">
                <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="3"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(30, 30),
          },
        });
        markersRef.current.push(userMarker);
      }

      // Add business markers
      if (locations.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        
        locations.forEach((location, index) => {
          const marker = new window.google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.name || `Business ${index + 1}`,
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#10B981">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
            },
          });

          markersRef.current.push(marker);

          // Add click listener
          marker.addListener('click', () => {
            setSelectedLocation(location);
            
            // Create info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div class="p-3 min-w-[200px]">
                  <h3 class="font-semibold text-base mb-2">${location.name || 'Business'}</h3>
                  <p class="text-sm text-gray-600 mb-2">${location.address || ''}</p>
                  ${location.rating ? `<div class="text-sm mb-2">⭐ ${location.rating}</div>` : ''}
                  ${location.phone ? `<div class="text-sm mb-1">📞 ${location.phone}</div>` : ''}
                  ${location.website ? `<div class="text-sm">🌐 <a href="${location.website}" target="_blank" class="text-blue-600">Website</a></div>` : ''}
                </div>
              `
            });
            
            infoWindow.open(map, marker);
          });

          bounds.extend(new window.google.maps.LatLng(location.lat, location.lng));
        });

        // Fit bounds or center on single location
        if (locations.length > 1) {
          map.fitBounds(bounds);
          // Prevent zooming in too much
          const listener = window.google.maps.event.addListener(map, 'bounds_changed', () => {
            if (map.getZoom() > 16) map.setZoom(16);
            window.google.maps.event.removeListener(listener);
          });
        } else if (locations.length === 1) {
          map.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
          map.setZoom(14);
        }

        // If user location is provided, include it in bounds
        if (center && locations.length > 0) {
          bounds.extend(new window.google.maps.LatLng(center.lat, center.lng));
          map.fitBounds(bounds);
        }
      }
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to create map');
    }
  };

  // Initialize map when shown
  useEffect(() => {
    if (showMap && isApiLoaded) {
      setTimeout(initializeMap, 100);
    }
  }, [showMap, isApiLoaded, locations, center]);

  if (mapError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <X className="h-5 w-5" />
            Map Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-muted-foreground">{mapError}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Location data is still available in table format
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
            {locations.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {locations.length} location{locations.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showMap ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {locations.length > 0 
                  ? `View ${locations.length} business${locations.length !== 1 ? 'es' : ''} on interactive map`
                  : 'No locations available to display'
                }
              </p>
              {locations.length > 0 && (
                <Button 
                  onClick={() => setShowMap(true)}
                  disabled={!isApiLoaded}
                  className="gap-2"
                >
                  {!isApiLoaded ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading Maps...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Show Interactive Map
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Click map pins to view business details
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Hide Map
                </Button>
              </div>
              
              <div 
                ref={mapRef} 
                className="w-full h-96 rounded-lg border bg-gray-50"
              />
              
              {/* Selected location details */}
              {selectedLocation && (
                <Card className="border-green-200">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{selectedLocation.name || 'Selected Business'}</h4>
                      <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                      
                      <div className="flex flex-wrap gap-2">
                        {selectedLocation.rating && (
                          <Badge variant="secondary">
                            ⭐ {selectedLocation.rating}
                          </Badge>
                        )}
                        {selectedLocation.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            <a 
                              href={`tel:${selectedLocation.phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {selectedLocation.phone}
                            </a>
                          </div>
                        )}
                        {selectedLocation.website && (
                          <div className="flex items-center gap-1 text-sm">
                            <Globe className="h-3 w-3" />
                            <a 
                              href={selectedLocation.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}