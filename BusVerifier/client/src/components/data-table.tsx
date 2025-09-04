import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, PlusCircle, Filter, ArrowUpDown, Edit, Trash2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface DataTableProps {
  records: any[];
  onExport: () => void;
}

export function DataTable({ records, onExport }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const totalRecords = records.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);
  const currentRecords = records.slice(startIndex, endIndex);

  // Calculate statistics
  const verifiedCount = records.filter(r => r.status === "verified").length;
  const updatedCount = records.filter(r => r.status === "updated").length;
  const errorCount = records.filter(r => r.status === "error").length;
  const newCount = records.filter(r => r.status === "new").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="mr-1" size={12} />
            Verified
          </Badge>
        );
      case "updated":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertTriangle className="mr-1" size={12} />
            Updated
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="mr-1" size={12} />
            Issue
          </Badge>
        );
      case "new":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <PlusCircle className="mr-1" size={12} />
            New
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(currentRecords.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleEdit = async (recordId: string, field: string, value: string) => {
    try {
      const response = await fetch(`/api/record/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update record");
      }
      
      // In a real app, you'd update the local state or refetch data
      console.log("Record updated successfully");
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      const response = await fetch(`/api/record/${recordId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete record");
      }
      
      // In a real app, you'd update the local state or refetch data
      console.log("Record deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleGoogleSearch = (record: any) => {
    const searchQuery = `"${record.companyName}" "${record.address}"`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    window.open(googleSearchUrl, '_blank');
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="text-results-title">
              Verification Results
            </h2>
            <p className="text-muted-foreground">Review and edit your verified business data below.</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground" data-testid="text-total-results">
                {totalRecords}
              </div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="text-green-600" size={16} />
              <span className="text-sm font-medium text-green-800">Verified</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1" data-testid="text-verified-count">
              {verifiedCount}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="text-yellow-600" size={16} />
              <span className="text-sm font-medium text-yellow-800">Updated</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600 mt-1" data-testid="text-updated-count">
              {updatedCount}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="text-red-600" size={16} />
              <span className="text-sm font-medium text-red-800">Issues</span>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-1" data-testid="text-error-count">
              {errorCount}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <PlusCircle className="text-blue-600" size={16} />
              <span className="text-sm font-medium text-blue-800">New</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-1" data-testid="text-new-count">
              {newCount}
            </div>
          </div>
        </div>

        {/* Table Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-foreground">Business Data</h3>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm" data-testid="button-filter">
                <Filter className="mr-1" size={16} />
                Filter
              </Button>
              <Button variant="secondary" size="sm" data-testid="button-sort">
                <ArrowUpDown className="mr-1" size={16} />
                Sort
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
            Showing {startIndex + 1}-{endIndex} of {totalRecords}
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table overflow-x-auto border rounded-lg">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  <Checkbox
                    checked={selectedRecords.size === currentRecords.length && currentRecords.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Original Address</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Address Verified</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Current Occupant</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {currentRecords.map((record) => (
                <tr 
                  key={record.id} 
                  className="border-t border-border hover:bg-accent/50"
                  data-testid={`row-record-${record.id}`}
                >
                  <td className="py-3 px-4">
                    <Checkbox
                      checked={selectedRecords.has(record.id)}
                      onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                      data-testid={`checkbox-record-${record.id}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      className="editable-cell font-medium border-0 bg-transparent p-0 h-auto focus:bg-accent"
                      defaultValue={record.companyName || ""}
                      onBlur={(e) => handleEdit(record.id, "companyName", e.target.value)}
                      data-testid={`input-company-${record.id}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-muted-foreground">
                      {record.address || "No address provided"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {record.verificationData?.addressVerified ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="mr-1" size={12} />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <XCircle className="mr-1" size={12} />
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium">
                      {record.verificationData?.currentBusinessName || "No data available"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => handleGoogleSearch(record)}
                        data-testid={`button-google-search-${record.id}`}
                      >
                        <ExternalLink size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handleDelete(record.id)}
                        data-testid={`button-delete-${record.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-20" data-testid="select-items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              data-testid="button-previous-page"
            >
              <ChevronLeft className="mr-1" size={16} />
              Previous
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            {totalPages > 5 && (
              <>
                <span className="px-2 text-muted-foreground">...</span>
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  data-testid={`button-page-${totalPages}`}
                >
                  {totalPages}
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="ml-1" size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
