import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Upload, FileText, CheckCircle, Clock, XCircle, ArrowRight, ArrowDown } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Expense } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExpenseParticipant {
  id: string;
  expenseId: string;
  userId: string;
  partnershipId: string;
  owedAmount: string;
  paidAmount: string;
  percentage: string;
}

interface Settlement {
  id: string;
  expenseId: string;
  payerId: string;
  receiverId: string;
  partnershipId: string;
  amount: string;
  method: string;
  paymentLink: string | null;
  status: string;
  initiatedAt: Date;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
}

interface PartnershipBalance {
  partnershipId: string;
  userId: string;
  netBalance: string;
  lastUpdated: Date;
}

interface Partnership {
  id: string;
  user1Id: string;
  user2Id: string;
  inviteCode: string;
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("childcare");
  const [selectedPartnership, setSelectedPartnership] = useState("");
  const [userPercentage, setUserPercentage] = useState("50");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<{
    receiptUrl: string;
    fileName: string;
    fileSize: string;
  } | null>(null);
  
  // Settlement form state
  const [paymentMethod, setPaymentMethod] = useState("mark_paid");
  const [paymentLink, setPaymentLink] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ["/api/partnerships"],
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: balances = {} } = useQuery<Record<string, PartnershipBalance>>({
    queryKey: ["/api/balances", ...partnerships.map(p => p.id)],
    queryFn: async () => {
      const balanceMap: Record<string, PartnershipBalance> = {};
      for (const partnership of partnerships) {
        const res = await fetch(`/api/partnerships/${partnership.id}/balance`, {
          credentials: "include",
        });
        if (res.ok) {
          const balance = await res.json();
          balanceMap[partnership.id] = balance;
        }
      }
      return balanceMap;
    },
    enabled: partnerships.length > 0,
  });

  const { data: expenseSettlements = {} } = useQuery<Record<string, Settlement[]>>({
    queryKey: ["/api/expense-settlements", ...expenses.map(e => e.id)],
    queryFn: async () => {
      const settlementsMap: Record<string, Settlement[]> = {};
      for (const expense of expenses) {
        const res = await fetch(`/api/expenses/${expense.id}/settlements`, {
          credentials: "include",
        });
        if (res.ok) {
          const settlements = await res.json();
          settlementsMap[expense.id] = settlements;
        }
      }
      return settlementsMap;
    },
    enabled: expenses.length > 0,
  });

  const { data: pendingSettlements = [] } = useQuery<Settlement[]>({
    queryKey: ["/api/settlements/pending"],
  });

  const confirmSettlement = useMutation({
    mutationFn: async (settlementId: string) => {
      const res = await apiRequest("PATCH", `/api/settlements/${settlementId}/confirm`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ 
        title: "Settlement confirmed", 
        description: "Payment has been marked as received",
        duration: 3000 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm settlement",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const disputeSettlement = useMutation({
    mutationFn: async ({ settlementId, reason }: { settlementId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/settlements/${settlementId}/dispute`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ 
        title: "Settlement disputed", 
        description: "Your co-parent will be notified",
        duration: 3000 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dispute settlement",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/receipt-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return await res.json();
    },
    onSuccess: (data) => {
      setUploadedReceipt(data);
      toast({ title: "Receipt uploaded successfully", duration: 3000 });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: {
      description: string;
      amount: string;
      category: string;
      partnershipId: string;
      splitPercentages: Record<string, number>;
      receiptUrl?: string;
      fileName?: string;
      fileSize?: string;
    }) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      setDialogOpen(false);
      setDescription("");
      setAmount("");
      setCategory("childcare");
      setSelectedPartnership("");
      setUserPercentage("50");
      setReceiptFile(null);
      setUploadedReceipt(null);
      toast({ title: "Expense created successfully", duration: 3000 });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const initiateSettlement = useMutation({
    mutationFn: async (data: {
      expenseId: string;
      partnershipId: string;
      amount: string;
      method: string;
      paymentLink?: string;
    }) => {
      const res = await apiRequest("POST", "/api/settlements/initiate", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      setSettleDialogOpen(false);
      setSelectedExpense(null);
      setPaymentMethod("mark_paid");
      setPaymentLink("");
      setSettlementAmount("");
      toast({ 
        title: "Settlement initiated", 
        description: "Your co-parent will be notified to confirm",
        duration: 3000 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate settlement",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Receipt must be under 10MB",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      setReceiptFile(file);
      uploadReceipt.mutate(file);
    }
  };

  const handleCreateExpense = () => {
    if (!description.trim() || !amount.trim() || !selectedPartnership) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "User information not loaded. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const partnership = partnerships.find(p => p.id === selectedPartnership);
    if (!partnership) {
      toast({
        title: "Error",
        description: "Partnership not found",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const userPct = parseInt(userPercentage);
    const partnerPct = 100 - userPct;
    const partnerId = partnership.user1Id === user.id ? partnership.user2Id : partnership.user1Id;

    createExpense.mutate({
      description,
      amount,
      category,
      partnershipId: selectedPartnership,
      splitPercentages: {
        [user.id]: userPct,
        [partnerId]: partnerPct,
      },
      receiptUrl: uploadedReceipt?.receiptUrl,
      fileName: uploadedReceipt?.fileName,
      fileSize: uploadedReceipt?.fileSize,
    });
  };

  const handleSettleUp = (expense: Expense) => {
    setSelectedExpense(expense);
    setSettlementAmount(expense.amount);
    setSettleDialogOpen(true);
  };

  const handleInitiateSettlement = () => {
    if (!selectedExpense || !settlementAmount) {
      toast({
        title: "Error",
        description: "Please enter a settlement amount",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    initiateSettlement.mutate({
      expenseId: selectedExpense.id,
      partnershipId: selectedExpense.partnershipId,
      amount: settlementAmount,
      method: paymentMethod,
      paymentLink: paymentLink || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700";
      case "pending":
        return "bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700";
      case "settled":
        return "bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700";
      default:
        return "bg-gray-100 dark:bg-gray-950 border-gray-300 dark:border-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "settled":
        return <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground">Loading expenses...</p>
      </div>
    );
  }

  const getExpenseForSettlement = (settlementExpenseId: string) => {
    return expenses.find(e => e.id === settlementExpenseId);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Pending Settlements */}
      {pendingSettlements.length > 0 && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-300 dark:border-amber-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <Clock className="h-5 w-5" />
              Pending Settlement Confirmations ({pendingSettlements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSettlements.map((settlement) => {
              const expense = getExpenseForSettlement(settlement.expenseId);
              const isReceiver = user && settlement.receiverId === user.id;
              
              return (
                <Card key={settlement.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">
                          {expense?.description || "Expense"}
                        </h4>
                        <p className="text-2xl font-bold text-foreground mb-2">
                          ${parseFloat(settlement.amount).toFixed(2)}
                        </p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Payment method: <span className="capitalize">{settlement.method.replace(/_/g, ' ')}</span></p>
                          {settlement.paymentLink && (
                            <p>
                              Link: <a href={settlement.paymentLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{settlement.paymentLink}</a>
                            </p>
                          )}
                          <p className="text-xs">{new Date(settlement.initiatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {isReceiver ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => confirmSettlement.mutate(settlement.id)}
                              disabled={confirmSettlement.isPending}
                              data-testid={`button-confirm-${settlement.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const reason = prompt("Why are you disputing this settlement?");
                                if (reason) {
                                  disputeSettlement.mutate({ settlementId: settlement.id, reason });
                                }
                              }}
                              disabled={disputeSettlement.isPending}
                              data-testid={`button-dispute-${settlement.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Dispute
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline">
                            Awaiting confirmation
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Balance Summary */}
      {partnerships.length > 0 && (
        <Card className="bg-gradient-to-br from-ocean/10 to-sage/10 border-ocean/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Partnership Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {partnerships.map((partnership) => {
              const balance = balances[partnership.id];
              const netBalance = balance ? parseFloat(balance.netBalance) : 0;
              const isPositive = netBalance > 0;
              const isZero = netBalance === 0;
              
              return (
                <div key={partnership.id} className="flex items-center justify-between p-3 rounded-md bg-card">
                  <span className="text-sm text-muted-foreground">Partnership</span>
                  <div className="flex items-center gap-2">
                    {isZero ? (
                      <span className="text-sm text-muted-foreground">Settled up</span>
                    ) : (
                      <>
                        <span className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${Math.abs(netBalance).toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {isPositive ? 'They owe you' : 'You owe them'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Shared Expenses</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-expense">
              <DollarSign className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="partnership">Partnership</Label>
                <Select value={selectedPartnership} onValueChange={setSelectedPartnership}>
                  <SelectTrigger data-testid="select-partnership">
                    <SelectValue placeholder="Select partnership" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerships.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        Partnership {p.inviteCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense-description">Description</Label>
                <Input
                  id="expense-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., School supplies, Medical bills"
                  data-testid="input-expense-description"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-amount"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="childcare">Childcare</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="split-percentage">Your Share (%)</Label>
                <Select value={userPercentage} onValueChange={setUserPercentage}>
                  <SelectTrigger data-testid="select-split-percentage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50% (Equal split)</SelectItem>
                    <SelectItem value="40">40% (You pay less)</SelectItem>
                    <SelectItem value="60">60% (You pay more)</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                    <SelectItem value="100">100% (Full amount)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  You: {userPercentage}% / Partner: {100 - parseInt(userPercentage)}%
                </p>
              </div>
              <div>
                <Label>Receipt (Optional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="receipt-upload"
                    data-testid="input-receipt-file"
                  />
                  <label htmlFor="receipt-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={uploadReceipt.isPending}
                      onClick={() => document.getElementById("receipt-upload")?.click()}
                      data-testid="button-upload-receipt"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadReceipt.isPending
                        ? "Uploading..."
                        : uploadedReceipt
                        ? `Uploaded: ${uploadedReceipt.fileName}`
                        : "Upload Receipt"}
                    </Button>
                  </label>
                </div>
              </div>
              <Button
                onClick={handleCreateExpense}
                disabled={createExpense.isPending}
                className="w-full"
                data-testid="button-save-expense"
              >
                {createExpense.isPending ? "Creating..." : "Create Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Settle Up Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Expense</Label>
              <p className="text-sm text-muted-foreground mt-1">{selectedExpense?.description}</p>
            </div>
            <div>
              <Label htmlFor="settlement-amount">Amount ($)</Label>
              <Input
                id="settlement-amount"
                type="number"
                step="0.01"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                placeholder="0.00"
                data-testid="input-settlement-amount"
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_paid">Mark as Paid</SelectItem>
                  <SelectItem value="e_transfer">e-Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="wise">Wise</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod !== "mark_paid" && paymentMethod !== "cash" && (
              <div>
                <Label htmlFor="payment-link">Payment Link (Optional)</Label>
                <Input
                  id="payment-link"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="e.g., paypal.me/yourname"
                  data-testid="input-payment-link"
                />
              </div>
            )}
            <Button
              onClick={handleInitiateSettlement}
              disabled={initiateSettlement.isPending}
              className="w-full"
              data-testid="button-initiate-settlement"
            >
              {initiateSettlement.isPending ? "Processing..." : "Send Settlement Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-foreground">Expense History</h2>
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No expenses recorded. Add one to get started!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card
                key={expense.id}
                className={`${getStatusColor(expense.status)} hover-elevate`}
                data-testid={`expense-card-${expense.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">{expense.description}</h3>
                        <Badge variant="outline" className="capitalize">
                          {expense.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(expense.status)}
                          <span className="text-sm capitalize">{expense.status}</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-foreground mb-2">
                        ${parseFloat(expense.amount).toFixed(2)}
                      </p>
                      {expense.receiptUrl && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <FileText className="h-4 w-4" />
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            View Receipt
                          </a>
                        </div>
                      )}
                      
                      {/* Settlement History */}
                      {expenseSettlements[expense.id] && expenseSettlements[expense.id].length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <h4 className="text-sm font-semibold text-foreground mb-2">Settlement History</h4>
                          <div className="space-y-2">
                            {expenseSettlements[expense.id].map((settlement) => (
                              <div key={settlement.id} className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium capitalize">
                                    {settlement.method.replace(/_/g, ' ')}
                                  </span>
                                  <Badge 
                                    variant={
                                      settlement.status === 'confirmed' ? 'default' :
                                      settlement.status === 'rejected' ? 'destructive' :
                                      'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {settlement.status.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>${parseFloat(settlement.amount).toFixed(2)}</span>
                                  <span>
                                    {settlement.confirmedAt 
                                      ? new Date(settlement.confirmedAt).toLocaleDateString()
                                      : settlement.rejectedAt
                                      ? new Date(settlement.rejectedAt).toLocaleDateString()
                                      : new Date(settlement.initiatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {settlement.rejectedReason && (
                                  <p className="mt-1 text-destructive">
                                    Reason: {settlement.rejectedReason}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {expense.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleSettleUp(expense)}
                          data-testid={`button-settle-${expense.id}`}
                        >
                          Settle Up
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
