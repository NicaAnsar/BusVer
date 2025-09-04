import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Loader2, AlertTriangle, XCircle, StopCircle } from "lucide-react";

interface ProcessingStatusProps {
  job: any;
  onStop: () => void;
}

export function ProcessingStatus({ job, onStop }: ProcessingStatusProps) {
  if (!job) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-4 mx-auto" />
            <h2 className="text-2xl font-semibold text-foreground">Initializing...</h2>
            <p className="text-muted-foreground mt-1">Setting up your processing job</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="text-green-600" size={24} />;
      case "failed":
        return <XCircle className="text-red-600" size={24} />;
      case "stopped":
        return <StopCircle className="text-yellow-600" size={24} />;
      case "running":
        return <Loader2 className="animate-spin text-blue-600" size={24} />;
      default:
        return <Clock className="text-muted-foreground" size={24} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "stopped":
        return "text-yellow-600";
      case "running":
        return "text-blue-600";
      default:
        return "text-muted-foreground";
    }
  };

  const isActive = job.status === "running" || job.status === "pending";

  return (
    <Card className="shadow-sm">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="text-processing-title">
            {job.type === "prospecting" ? "Finding Prospects" : "Processing Your Data"}
          </h2>
          <p className="text-muted-foreground">
            {job.type === "prospecting" 
              ? "Searching for new business prospects..." 
              : "Please wait while we verify and enrich your business information."
            }
          </p>
        </div>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span data-testid="text-progress-percentage">{job.progress || 0}%</span>
            </div>
            <Progress value={job.progress || 0} className="h-3" data-testid="progress-bar" />
          </div>

          {/* Processing Steps */}
          <div className="space-y-4">
            <div 
              className={`flex items-center space-x-3 p-4 rounded-lg border ${
                job.progress > 0 ? "bg-green-50 border-green-200" : "bg-muted border-border"
              }`}
            >
              {job.progress > 0 ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <Clock className="text-muted-foreground" size={20} />
              )}
              <span className={job.progress > 0 ? "text-green-800" : "text-muted-foreground"}>
                Data parsing and validation {job.progress > 0 ? "completed" : "pending"}
              </span>
            </div>

            <div 
              className={`flex items-center space-x-3 p-4 rounded-lg border ${
                job.progress > 25 ? "bg-green-50 border-green-200" : 
                job.progress > 0 ? "bg-blue-50 border-blue-200" : "bg-muted border-border"
              }`}
            >
              {job.progress > 25 ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : job.progress > 0 ? (
                <Loader2 className="animate-spin text-blue-600" size={20} />
              ) : (
                <Clock className="text-muted-foreground" size={20} />
              )}
              <span className={
                job.progress > 25 ? "text-green-800" : 
                job.progress > 0 ? "text-blue-800" : "text-muted-foreground"
              }>
                {job.type === "prospecting" 
                  ? "Searching business databases..." 
                  : "Verifying business information against databases..."
                }
              </span>
            </div>

            <div 
              className={`flex items-center space-x-3 p-4 rounded-lg border ${
                job.progress > 75 ? "bg-green-50 border-green-200" : 
                job.progress > 50 ? "bg-blue-50 border-blue-200" : "bg-muted border-border"
              }`}
            >
              {job.progress > 75 ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : job.progress > 50 ? (
                <Loader2 className="animate-spin text-blue-600" size={20} />
              ) : (
                <Clock className="text-muted-foreground" size={20} />
              )}
              <span className={
                job.progress > 75 ? "text-green-800" : 
                job.progress > 50 ? "text-blue-800" : "text-muted-foreground"
              }>
                {job.type === "prospecting" 
                  ? "Enriching prospect data" 
                  : "Enriching data with additional information"
                }
              </span>
            </div>

            <div 
              className={`flex items-center space-x-3 p-4 rounded-lg border ${
                job.progress === 100 ? "bg-green-50 border-green-200" : 
                job.progress > 90 ? "bg-blue-50 border-blue-200" : "bg-muted border-border"
              }`}
            >
              {job.progress === 100 ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : job.progress > 90 ? (
                <Loader2 className="animate-spin text-blue-600" size={20} />
              ) : (
                <Clock className="text-muted-foreground" size={20} />
              )}
              <span className={
                job.progress === 100 ? "text-green-800" : 
                job.progress > 90 ? "text-blue-800" : "text-muted-foreground"
              }>
                Generating final report
              </span>
            </div>
          </div>

          {/* Status and Results */}
          {job.results && (
            <div className="pt-6 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {job.type === "prospecting" ? (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground" data-testid="text-prospects-generated">
                        {job.results.totalGenerated || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Generated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600" data-testid="text-business-type">
                        {job.results.businessType}
                      </div>
                      <div className="text-sm text-muted-foreground">Type</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600" data-testid="text-location">
                        {job.results.location || "All"}
                      </div>
                      <div className="text-sm text-muted-foreground">Location</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">100%</div>
                      <div className="text-sm text-muted-foreground">Success</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground" data-testid="text-processed-count">
                        {job.results.totalProcessed || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600" data-testid="text-verified-count">
                        {(job.results.verified || 0) + (job.results.updated || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Verified</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600" data-testid="text-updated-count">
                        {job.results.updated || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600" data-testid="text-error-count">
                        {job.results.errors || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Issues</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {job.errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-red-600" size={20} />
                <span className="text-red-800 font-medium">Error:</span>
              </div>
              <p className="text-red-700 mt-1" data-testid="text-error-message">
                {job.errorMessage}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center pt-6">
            {isActive && (
              <Button 
                onClick={onStop} 
                variant="destructive"
                data-testid="button-stop-processing"
              >
                <StopCircle className="mr-2" size={16} />
                Stop Processing
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
