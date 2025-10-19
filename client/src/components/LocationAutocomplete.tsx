import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationResult {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  value?: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter an address or place...",
  className,
  disabled = false
}: LocationAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value?.displayName || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch geocoding results
  const { data, isLoading } = useQuery<{ results: LocationResult[] }>({
    queryKey: ['/api/geocode', debouncedQuery],
    enabled: debouncedQuery.length >= 2,
  });

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowSuggestions(true);
    
    // If user clears the input, clear the selection
    if (!newValue) {
      onChange(null);
    }
  };

  const handleSelectLocation = (location: LocationResult) => {
    const locationData: LocationData = {
      displayName: location.displayName,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    };
    
    setSearchQuery(location.displayName);
    onChange(locationData);
    setShowSuggestions(false);
  };

  const suggestions = data?.results || [];
  const showDropdown = showSuggestions && debouncedQuery.length >= 2 && (isLoading || suggestions.length > 0);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn("pl-9", className)}
          disabled={disabled}
          data-testid="input-location-search"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Searching locations...
            </div>
          )}
          
          {!isLoading && suggestions.length === 0 && debouncedQuery.length >= 2 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No locations found
            </div>
          )}

          {!isLoading && suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => handleSelectLocation(location)}
              className="w-full text-left p-3 hover-elevate active-elevate-2 border-b last:border-b-0 focus:outline-none"
              data-testid={`location-suggestion-${index}`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {location.displayName}
                  </div>
                  {location.city && (
                    <div className="text-xs text-muted-foreground">
                      {[location.city, location.state, location.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
