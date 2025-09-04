import { useState, useRef } from "react";
import { parseFileData } from "@/lib/file-parser";
import { CloudUpload, FileText, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onUpload: (data: any) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      setError('Please upload a CSV or Excel file.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const parsedData = await parseFileData(file);
      
      // Upload to server
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          data: parsedData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const result = await response.json();
      onUpload(result);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`upload-zone bg-muted/30 p-12 text-center rounded-xl cursor-pointer transition-all ${
          isDragOver ? 'border-primary bg-accent' : ''
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="upload-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          data-testid="file-input"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="text-primary animate-spin" size={32} />
            ) : (
              <CloudUpload className="text-primary" size={32} />
            )}
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              {isLoading ? "Processing file..." : "Drag and drop your file here"}
            </p>
            <p className="text-muted-foreground">
              or <span className="text-primary font-medium">click to browse</span>
            </p>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <FileText className="mr-1" size={16} />
              CSV
            </span>
            <span className="flex items-center">
              <FileText className="mr-1" size={16} />
              Excel
            </span>
            <span>Max 10MB</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-destructive text-sm" data-testid="upload-error">
          {error}
        </div>
      )}
    </div>
  );
}
