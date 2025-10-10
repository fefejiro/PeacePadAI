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
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchDistance, setSearchDistance] = useState<number>(50);
  const [locationError, setLocationError] = useState<boolean>(false);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError(true);
          // Use a default location (e.g., center of US)
          setUserLocation({
            lat: 39.8283,
            lng: -98.5795,
          });
          toast({
            title: "Location access denied",
            description: "Using default location. You can search all therapists.",
          });
        }
      );
    } else {
      setLocationError(true);
      setUserLocation({
        lat: 39.8283,
        lng: -98.5795,
      });
    }
  }, [toast]);

  const { data: therapists = [], isLoading } = useQuery({
    queryKey: ["/api/therapists", userLocation?.lat, userLocation?.lng, searchDistance],
    enabled: !!user && !!userLocation,
    queryFn: async () => {
      const params = new URLSearchParams({
        lat: userLocation!.lat.toString(),
        lng: userLocation!.lng.toString(),
        maxDistance: searchDistance.toString(),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading therapists...</p>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Initializing location...</p>
      </div>
    );
  }

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

        {/* Search Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
            <CardDescription>Adjust search radius to find therapists near you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Search Radius: {searchDistance} miles
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
              <Badge variant="secondary" data-testid="badge-results-count">
                {therapists.length} results
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Therapist Cards */}
        <div className="space-y-4">
          {therapists.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No therapists found within {searchDistance} miles. Try increasing the search radius.
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
                        {therapist.distance} mi
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
