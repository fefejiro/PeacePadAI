import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Calendar, MessageSquare, Phone, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AuditTrail {
  messages: any[];
  events: any[];
  calls: any[];
  recordings: any[];
  summary: {
    totalMessages: number;
    totalEvents: number;
    totalCalls: number;
    totalRecordings: number;
  };
}

export default function AuditTrailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const { data: auditTrail, isLoading } = useQuery<AuditTrail>({
    queryKey: ["/api/audit-trail"],
    enabled: !!user,
  });

  const handleExport = async (format: string) => {
    try {
      setIsExporting(true);
      
      const response = await fetch(`/api/audit-trail?format=${format}`, {
        credentials: 'include',
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `peacepad-audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `peacepad-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast({
        title: "Export successful",
        description: `Your audit trail has been downloaded as ${format.toUpperCase()}`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export audit trail. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    try {
      const response = await fetch('/api/audit-trail?format=json', {
        credentials: 'include',
      });
      const data = await response.json();
      
      const shareText = `PeacePad Audit Trail Summary:\n- Messages: ${data.summary.totalMessages}\n- Events: ${data.summary.totalEvents}\n- Calls: ${data.summary.totalCalls}\n- Recordings: ${data.summary.totalRecordings}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'PeacePad Audit Trail',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard",
          description: "Audit trail summary copied to clipboard",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading audit trail...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit Trail & Export</h1>
            <p className="text-muted-foreground mt-1">
              Legal-friendly documentation of all your communications and activities
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card data-testid="card-messages-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditTrail?.summary.totalMessages || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-events-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditTrail?.summary.totalEvents || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-calls-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditTrail?.summary.totalCalls || 0}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-recordings-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Video className="h-4 w-4" />
                Recordings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditTrail?.summary.totalRecordings || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              Download your complete audit trail for legal documentation or sharing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                data-testid="button-export-json"
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>

              <Button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                variant="secondary"
                data-testid="button-export-csv"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download CSV
              </Button>

              <Button
                onClick={handleShare}
                disabled={isExporting}
                variant="outline"
                data-testid="button-share-summary"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Share Summary
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What's included:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>All chat messages with timestamps and tone analysis</li>
                <li>Scheduled events and appointments</li>
                <li>Call logs with session codes and durations</li>
                <li>Recording transcripts (if available)</li>
                <li>Activity audit logs for legal compliance</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>Latest communication history</CardDescription>
          </CardHeader>
          <CardContent>
            {auditTrail?.messages && auditTrail.messages.length > 0 ? (
              <div className="space-y-3">
                {auditTrail.messages.slice(0, 5).map((message: any) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted"
                    data-testid={`message-item-${message.id}`}
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.timestamp).toLocaleString()} • Tone: {message.tone || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No messages yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
