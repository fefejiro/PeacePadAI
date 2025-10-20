import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
type CallType = 'audio' | 'video';

interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  partnershipId: string | null;
  callType: CallType;
  status: CallStatus;
  startedAt: string | null;
  endedAt: string | null;
  duration: string | null;
  declineReason: string | null;
  createdAt: string;
}

export default function CallsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'missed' | 'received' | 'outgoing'>('all');
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);

  const { data: calls = [], isLoading } = useQuery<Call[]>({
    queryKey: ['/api/calls', filter],
    enabled: !!user,
  });

  const getCallIcon = (call: Call) => {
    if (call.status === 'missed') return <PhoneMissed className="w-5 h-5 text-destructive" data-testid="icon-call-missed" />;
    
    const isIncoming = call.receiverId === user?.id;
    const Icon = call.callType === 'video' ? Video : (isIncoming ? PhoneIncoming : PhoneOutgoing);
    
    return <Icon className="w-5 h-5 text-muted-foreground" data-testid={`icon-call-${call.callType}`} />;
  };

  const getCallLabel = (call: Call) => {
    const isIncoming = call.receiverId === user?.id;
    
    if (call.status === 'missed') return 'Missed call';
    if (call.status === 'declined') return 'Declined';
    if (isIncoming) return 'Incoming call';
    return 'Outgoing call';
  };

  const formatDuration = (seconds: string | null) => {
    if (!seconds) return '0:00';
    const secs = parseInt(seconds);
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPartnerName = (call: Call) => {
    // TODO: Fetch partner names from partnerships/users
    const partnerId = call.callerId === user?.id ? call.receiverId : call.callerId;
    return `Partner ${partnerId.slice(0, 8)}...`; // Placeholder
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-calls-title">Calls</h1>
          <p className="text-sm text-muted-foreground">
            {calls.length} {calls.length === 1 ? 'call' : 'calls'}
          </p>
        </div>
        <Button
          onClick={() => setShowNewCallDialog(true)}
          data-testid="button-new-call"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Call
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="missed" data-testid="filter-missed">Missed</TabsTrigger>
            <TabsTrigger value="received" data-testid="filter-received">Received</TabsTrigger>
            <TabsTrigger value="outgoing" data-testid="filter-outgoing">Outgoing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Loading calls...</div>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Phone className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No calls yet</p>
            <p className="text-sm text-muted-foreground">
              Start a call with your co-parent
            </p>
          </div>
        ) : (
          calls.map((call) => (
            <Card
              key={call.id}
              className="p-4 hover-elevate cursor-pointer"
              data-testid={`card-call-${call.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getCallIcon(call)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate" data-testid={`text-partner-${call.id}`}>
                      {getPartnerName(call)}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground" data-testid={`text-call-label-${call.id}`}>
                      {getCallLabel(call)}
                    </span>
                    {call.status === 'ended' && call.duration && (
                      <>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground" data-testid={`text-duration-${call.id}`}>
                          {formatDuration(call.duration)}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {call.declineReason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {call.declineReason}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
