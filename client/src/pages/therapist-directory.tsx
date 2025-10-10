import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Globe, Star, Navigation, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function TherapistDirectoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, address?: string, isCanada?: boolean} | null>(null);
  const [searchDistance, setSearchDistance] = useState<number>(50);
  const [postalCode, setPostalCode] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handlePostalCodeSearch = async () => {
    if (!postalCode.trim()) {
      toast({
        title: "Enter a location",
        description: "Please enter a postal code or address to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Use geocoding API to convert postal code to coordinates
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(postalCode)}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      setUserLocation({
        lat: data.lat,
        lng: data.lng,
        address: postalCode,
        isCanada: data.isCanada || false,
      });
      
      toast({
        title: "Location found",
        description: `Searching for therapists near ${postalCode}`,
      });
    } catch (error) {
      toast({
        title: "Location not found",
        description: "Could not find coordinates for this postal code",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Reverse geocode to determine country
          try {
            const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
            const response = await fetch(reverseUrl);
            const data = await response.json();
            const isCanada = data.address?.country_code === 'ca';
            
            setUserLocation({
              lat,
              lng,
              address: 'Your location',
              isCanada,
            });
          } catch {
            // Fallback if reverse geocoding fails
            setUserLocation({
              lat,
              lng,
              address: 'Your location',
              isCanada: false,
            });
          }
          
          toast({
            title: "Location found",
            description: "Using your current location",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location access denied",
            description: "Please enter a postal code instead",
            variant: "destructive",
          });
        }
      );
    }
  };

  const { data: therapists = [], isLoading } = useQuery({
    queryKey: ["/api/therapists", userLocation?.lat, userLocation?.lng, searchDistance, userLocation?.address, userLocation?.isCanada],
    enabled: !!user && !!userLocation,
    queryFn: async () => {
      // Convert miles to km if not Canadian (server expects km)
      const distanceInKm = userLocation!.isCanada 
        ? searchDistance 
        : Math.round(searchDistance * 1.60934); // miles to km
      
      const params = new URLSearchParams({
        lat: userLocation!.lat.toString(),
        lng: userLocation!.lng.toString(),
        maxDistance: distanceInKm.toString(),
        address: userLocation!.address || '',
      });
      
      const response = await fetch(`/api/therapists?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch therapists');
      return response.json();
    },
  });

  const openInMaps = (address: string, lat: string, lng: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`https://maps.apple.com/?q=${encodeURIComponent(address)}&ll=${lat},${lng}`);
    } else if (isAndroid) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Therapist Directory</h1>
            <p className="text-muted-foreground mt-1">
              Find licensed therapists and support resources near you
            </p>
          </div>
        </div>

        {/* Location Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Location</CardTitle>
            <CardDescription>Enter a postal code/address or use your current location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter postal code or address (e.g., M9W 0A1, Toronto)"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePostalCodeSearch()}
                className="flex-1"
                data-testid="input-postal-code"
              />
              <Button
                onClick={handlePostalCodeSearch}
                disabled={isSearching || !postalCode.trim()}
                data-testid="button-search-location"
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
              <Button
                onClick={handleUseMyLocation}
                variant="outline"
                data-testid="button-use-location"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Use My Location
              </Button>
            </div>
            
            {userLocation && (
              <p className="text-sm text-muted-foreground">
                Searching near: {userLocation.address || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search Controls */}
        {userLocation && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Radius</CardTitle>
              <CardDescription>Adjust distance to find therapists (miles or km)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Search Radius: {searchDistance} {userLocation.isCanada ? 'km' : 'miles'}
                  </label>
                  <Input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={searchDistance}
                    onChange={(e) => setSearchDistance(parseInt(e.target.value))}
                    className="w-full"
                    data-testid="input-search-radius"
                  />
                </div>
                {therapists && (
                  <Badge variant="secondary" data-testid="badge-results-count">
                    {therapists.length} results
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Therapist Cards */}
        <div className="space-y-4">
          {therapists.length === 0 && userLocation ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No therapists found within {searchDistance} {userLocation.isCanada ? 'km' : 'miles'}. Try increasing the search radius.
                </p>
              </CardContent>
            </Card>
          ) : (
            therapists.map((therapist: any) => (
              <Card key={therapist.id} data-testid={`card-therapist-${therapist.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{therapist.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {therapist.specialty}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {therapist.rating && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          {therapist.rating}
                        </Badge>
                      )}
                      <Badge variant="outline" data-testid={`badge-distance-${therapist.id}`}>
                        <MapPin className="h-3 w-3 mr-1" />
                        {therapist.distance} {userLocation?.isCanada ? 'km' : 'mi'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{therapist.address}</span>
                    </div>
                    
                    {therapist.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${therapist.phone}`} className="hover:underline">
                          {therapist.phone}
                        </a>
                      </div>
                    )}
                    
                    {therapist.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${therapist.email}`} className="hover:underline">
                          {therapist.email}
                        </a>
                      </div>
                    )}
                    
                    {therapist.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a
                          href={therapist.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {therapist.acceptsInsurance && (
                    <Badge variant="secondary">Accepts Insurance</Badge>
                  )}

                  {therapist.licenseNumber && (
                    <p className="text-xs text-muted-foreground">
                      License: {therapist.licenseNumber}
                    </p>
                  )}

                  <div className="pt-2">
                    <Button
                      onClick={() => openInMaps(therapist.address, therapist.latitude, therapist.longitude)}
                      data-testid={`button-navigate-${therapist.id}`}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
