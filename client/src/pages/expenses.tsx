import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Upload, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
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

export default function ExpensesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("childcare");
  const [status, setStatus] = useState("pending");
  const [splitPercentage, setSplitPercentage] = useState("50");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<{
    receiptUrl: string;
    fileName: string;
    fileSize: string;
  } | null>(null);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
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
      toast({ title: "Receipt uploaded successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload receipt",
        variant: "destructive",
      });
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: {
      description: string;
      amount: string;
      category: string;
      status: string;
      splitPercentage: string;
      receiptUrl?: string;
      fileName?: string;
      fileSize?: string;
    }) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setDialogOpen(false);
      setDescription("");
      setAmount("");
      setCategory("childcare");
      setStatus("pending");
      setSplitPercentage("50");
      setReceiptFile(null);
      setUploadedReceipt(null);
      toast({ title: "Expense created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
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
        });
        return;
      }
      setReceiptFile(file);
      uploadReceipt.mutate(file);
    }
  };

  const handleCreateExpense = () => {
    if (!description.trim() || !amount.trim()) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }
    createExpense.mutate({
      description,
      amount,
      category,
      status,
      splitPercentage,
      receiptUrl: uploadedReceipt?.receiptUrl,
      fileName: uploadedReceipt?.fileName,
      fileSize: uploadedReceipt?.fileSize,
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

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
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
                <Label htmlFor="split-percentage">Split Percentage (%)</Label>
                <Select value={splitPercentage} onValueChange={setSplitPercentage}>
                  <SelectTrigger data-testid="select-split-percentage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50/50 (Equal split)</SelectItem>
                    <SelectItem value="60">60/40</SelectItem>
                    <SelectItem value="70">70/30</SelectItem>
                    <SelectItem value="80">80/20</SelectItem>
                    <SelectItem value="100">100% (Full amount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Payment Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
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
                      <p className="text-sm text-muted-foreground mb-1">
                        Split: {expense.splitPercentage || "50"}% / {100 - parseInt(expense.splitPercentage || "50")}%
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
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
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
