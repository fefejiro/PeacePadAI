import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Phone, Mail, Globe, Star, Navigation, ExternalLink, AlertCircle, Heart, Users, Scale } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function TherapistDirectoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, address?: string, isCanada?: boolean} | null>(null);
  const [searchDistance, setSearchDistance] = useState<number>(50);
  const [postalCode, setPostalCode] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [resourceType, setResourceType] = useState<string>("all");

  const handlePostalCodeSearch = async () => {
    if (!postalCode.trim()) {
      toast({
        title: "Enter a location",
        description: "Please enter a postal code or address to search",
        variant: "destructive",
        duration: 5000,
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
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: "Location not found",
        description: "Could not find coordinates for this postal code",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = async () => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
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
          
          setIsGettingLocation(false);
          toast({
            title: "Location found",
            description: "Using your current location",
            duration: 4000,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsGettingLocation(false);
          toast({
            title: "Location access denied",
            description: "Please enter a postal code instead",
            variant: "destructive",
            duration: 5000,
          });
        }
      );
    }
  };

  // Always fetch crisis resources (available everywhere)
  const { data: crisisResources = [], isLoading: crisisLoading } = useQuery({
    queryKey: ["/api/support-resources", "crisis", resourceType],
    enabled: !!user && (resourceType === "all" || resourceType === "crisis"),
    queryFn: async () => {
      // Fetch crisis resources without location (they're always available)
      const params = new URLSearchParams({
        lat: "43.6532", // Default Toronto coords for mock data
        lng: "-79.3832",
        maxDistance: "1",
        resourceType: "crisis",
      });
      
      const response = await fetch(`/api/support-resources?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch crisis resources');
      return response.json();
    },
  });

  // Fetch location-based resources when user searches
  const { data: localResources = [], isLoading: localLoading } = useQuery({
    queryKey: ["/api/support-resources", userLocation?.lat, userLocation?.lng, searchDistance, userLocation?.address, userLocation?.isCanada, resourceType],
    enabled: !!user && !!userLocation && resourceType !== "crisis",
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
        resourceType: resourceType === "all" ? "therapist" : resourceType, // Don't duplicate crisis
      });
      
      const response = await fetch(`/api/support-resources?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
  });

  // Combine crisis and local resources
  const resources = resourceType === "crisis" 
    ? crisisResources 
    : [...crisisResources, ...localResources];
  
  const isLoading = crisisLoading || localLoading;

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
            <h1 className="text-3xl font-bold text-foreground">Find Support</h1>
            <p className="text-muted-foreground mt-1">
              Find crisis support, therapists, family services, and resources near you
            </p>
          </div>
        </div>

        {/* Resource Type Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resource Type</CardTitle>
            <CardDescription>Choose the type of support you're looking for</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={resourceType} onValueChange={setResourceType}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="crisis" data-testid="tab-crisis">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Crisis
                </TabsTrigger>
                <TabsTrigger value="therapist" data-testid="tab-therapist">
                  <Heart className="h-4 w-4 mr-2" />
                  Therapists
                </TabsTrigger>
                <TabsTrigger value="family-services" data-testid="tab-family">
                  <Users className="h-4 w-4 mr-2" />
                  Family Services
                </TabsTrigger>
                <TabsTrigger value="legal" data-testid="tab-legal">
                  <Scale className="h-4 w-4 mr-2" />
                  Legal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

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
                disabled={isGettingLocation}
                data-testid="button-use-location"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isGettingLocation ? "Getting Location..." : "Use My Location"}
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
                {resources && (
                  <Badge variant="secondary" data-testid="badge-results-count">
                    {resources.length} results
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support Resources */}
        <div className="space-y-4">
          {!userLocation && resources.length > 0 && (
            <Card className="mb-6 bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Showing 24/7 crisis resources available across Canada. Enter a location above to find local therapists and family services.
                </p>
              </CardContent>
            </Card>
          )}
          {resources.length === 0 && userLocation ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No resources found within {searchDistance} {userLocation.isCanada ? 'km' : 'miles'}. Try increasing the search radius or changing the resource type.
                </p>
              </CardContent>
            </Card>
          ) : (
            resources.map((resource: any) => (
              <Card key={resource.id} data-testid={`card-resource-${resource.id}`} className={resource.type === 'crisis' ? 'border-destructive' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{resource.name}</CardTitle>
                        {resource.type === 'crisis' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            24/7 Crisis
                          </Badge>
                        )}
                        {resource.isFree && (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {resource.specialty}
                      </CardDescription>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground mt-2">{resource.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {resource.rating && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          {resource.rating}
                        </Badge>
                      )}
                      {!resource.isOnline && (
                        <Badge variant="outline" data-testid={`badge-distance-${resource.id}`}>
                          <MapPin className="h-3 w-3 mr-1" />
                          {resource.distance} {userLocation?.isCanada ? 'km' : 'mi'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{resource.address}</span>
                    </div>
                    
                    {resource.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${resource.phone}`} className="hover:underline">
                          {resource.phone}
                        </a>
                      </div>
                    )}
                    
                    {resource.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${resource.email}`} className="hover:underline">
                          {resource.email}
                        </a>
                      </div>
                    )}
                    
                    {resource.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a
                          href={resource.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {resource.hours && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium">Hours:</span>
                        <span>{resource.hours}</span>
                      </div>
                    )}

                    {resource.languages && resource.languages.length > 0 && (
                      <div className="col-span-full flex items-start gap-2 text-muted-foreground">
                        <span className="font-medium">Languages:</span>
                        <span>{resource.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {resource.acceptsInsurance && (
                    <Badge variant="secondary">Accepts Insurance</Badge>
                  )}

                  {resource.licenseNumber && (
                    <p className="text-xs text-muted-foreground">
                      License: {resource.licenseNumber}
                    </p>
                  )}

                  {!resource.isOnline && resource.latitude && resource.longitude && (
                    <div className="pt-2">
                      <Button
                        onClick={() => openInMaps(resource.address, resource.latitude, resource.longitude)}
                        data-testid={`button-navigate-${resource.id}`}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Directions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
