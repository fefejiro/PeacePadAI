import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, Phone, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Therapist {
  id: string;
  name: string;
  type: string;
  address: string;
  phone?: string;
  rating?: number;
  distance?: string;
}

export default function TherapistLocator() {
  const [postalCode, setPostalCode] = useState("");
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!postalCode.trim()) {
      toast({
        title: "Postal code required",
        description: "Please enter a postal code to search",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/therapists/search?postalCode=${postalCode}`);
      if (!response.ok) throw new Error("Search failed");
      
      const data = await response.json();
      setTherapists(data);
      
      if (data.length === 0) {
        toast({
          title: "No results",
          description: "No therapists or mediators found in this area. Try a different postal code.",
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Unable to search for therapists. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Find Professional Support</h1>
        <p className="text-muted-foreground">
          Locate family therapists, relationship counselors, and co-parenting mediators in your area
        </p>
      </div>

      <div className="flex gap-3 mb-8">
        <Input
          type="text"
          placeholder="Enter postal code..."
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs"
          data-testid="input-postal-code"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isLoading}
          data-testid="button-search-therapists"
        >
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {therapists.map((therapist) => (
          <Card key={therapist.id} className="hover-elevate" data-testid={`therapist-card-${therapist.id}`}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <span>{therapist.name}</span>
                {therapist.rating && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {therapist.rating}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="capitalize">{therapist.type}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{therapist.address}</span>
              </div>
              {therapist.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{therapist.phone}</span>
                </div>
              )}
              {therapist.distance && (
                <p className="text-sm text-muted-foreground">{therapist.distance} away</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {therapists.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Enter a postal code to find therapists and mediators near you
          </p>
        </div>
      )}
    </div>
  );
}
