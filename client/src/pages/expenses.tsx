import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold text-foreground">Shared Expenses</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Expense Tracking & Splitting</h2>
          <CardDescription>Coming soon - Track, split, and manage shared expenses transparently</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is currently under development. Soon you'll be able to log expenses, upload receipts, split costs automatically, and track payment status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
