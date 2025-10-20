import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustodyForDate, getParentColor, hexToRgba } from "@/lib/custodyUtils";
import type { Partnership, Event } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CustodyCalendarViewProps {
  partnership: Partnership | undefined;
  events: Event[];
  currentUserId: string;
}

export function CustodyCalendarView({ partnership, events, currentUserId }: CustodyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDayStyle = (day: Date) => {
    if (!partnership?.custodyEnabled) return {};
    
    const custodyParent = getCustodyForDate(day, partnership, events);
    const color = getParentColor(custodyParent, partnership);
    
    if (color) {
      return {
        backgroundColor: hexToRgba(color, 0.15),
        borderLeft: `3px solid ${color}`,
      };
    }
    
    return {};
  };

  const getParentLabel = (parent: "user1" | "user2" | null) => {
    if (!parent || !partnership) return "";
    
    if (parent === "user1") {
      return currentUserId === partnership.user1Id ? "You" : "Co-Parent";
    } else {
      return currentUserId === partnership.user2Id ? "You" : "Co-Parent";
    }
  };

  if (!partnership?.custodyEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custody Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Custody calendar is not enabled. Set it up from the menu above to see color-coded custody days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Custody Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousMonth}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-xs font-semibold text-muted-foreground text-center p-2"
            >
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            const custodyParent = getCustodyForDate(day, partnership, events);
            const dayEvents = events.filter(event => {
              const eventStart = new Date(event.startDate);
              const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
              return day >= eventStart && day <= eventEnd;
            });
            
            return (
              <div
                key={index}
                className={`min-h-[60px] sm:min-h-[80px] border rounded-md p-1 sm:p-2 ${
                  isSameMonth(day, currentDate)
                    ? "bg-background"
                    : "bg-muted/30 text-muted-foreground"
                }`}
                style={getDayStyle(day)}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className="text-xs sm:text-sm font-medium">{format(day, "d")}</div>
                {custodyParent && (
                  <div className="text-[10px] sm:text-xs font-medium mt-1">
                    {getParentLabel(custodyParent)}
                  </div>
                )}
                {dayEvents.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-[9px] sm:text-[10px] truncate bg-background/50 px-1 rounded"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border-l-4"
              style={{ 
                backgroundColor: hexToRgba(partnership.user1Color || "#3b82f6", 0.15),
                borderColor: partnership.user1Color || "#3b82f6"
              }}
            />
            <span className="text-sm">
              {currentUserId === partnership.user1Id ? "Your Days" : "Co-Parent's Days"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border-l-4"
              style={{ 
                backgroundColor: hexToRgba(partnership.user2Color || "#10b981", 0.15),
                borderColor: partnership.user2Color || "#10b981"
              }}
            />
            <span className="text-sm">
              {currentUserId === partnership.user2Id ? "Your Days" : "Co-Parent's Days"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
