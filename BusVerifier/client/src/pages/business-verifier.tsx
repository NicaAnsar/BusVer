import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UploadZone } from "@/components/upload-zone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { MascotCharacter } from "@/components/mascot-character";
import { DataTable } from "@/components/data-table";
import { ProcessingStatus } from "@/components/processing-status";
import { ProspectMap } from "@/components/prospect-map";
import { exportToExcel } from "@/lib/excel-export";
import { Search, Download, RotateCcw, Shield, SearchCode, MapPin, Crosshair } from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type ActionType = "verification" | "prospecting";

interface FileData {
  businessDataId: string;
  detectedColumns: string[];
  aiMapping: Record<string, string>;
  totalRecords: number;
}

interface ProcessingJob {
  id: string;
  businessDataId: string;
  type: string;
  status: string;
  progress: number;
  results?: any;
  errorMessage?: string;
}

export default function BusinessVerifier() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [businessRecords, setBusinessRecords] = useState<any[]>([]);
  
  // Prospecting form state
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [numberOfResults, setNumberOfResults] = useState("50");
  const [industryFilter, setIndustryFilter] = useState("");
  
  // Location-based prospecting state
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  const { toast } = useToast();

  const handleFileUpload = (data: FileData) => {
    setFileData(data);
    setColumnMapping(data.aiMapping);
    
    toast({
      title: "File uploaded successfully",
      description: `${data.totalRecords} records detected`,
    });

    // Handle different actions after upload
    if (selectedAction === "verification") {
      // For verification, start processing immediately after file upload
      // Use a longer timeout to ensure state is fully updated
      setTimeout(() => {
        console.log('Starting verification with fileData:', data);
        startProcessingWithAction("verification", data);
      }, 200);
    } else if (selectedAction === "prospecting") {
      // For prospecting, show that the file is ready and add a success message
      toast({
        title: "File ready for pattern analysis",
        description: "Your file will be used to analyze location patterns for prospecting",
      });
      // User can now configure prospecting parameters and start
    }
  };

  const handleActionSelect = async (action: ActionType) => {
    setSelectedAction(action);
    setCurrentStep(2); // Move to upload step after selecting action
  };

  const startProcessingWithAction = async (action: ActionType, uploadedFileData?: FileData) => {
    const dataToUse = uploadedFileData || fileData;
    
    if (!dataToUse) {
      toast({
        title: "Error",
        description: "Please upload a file first",
        variant: "destructive",
      });
      console.error('Missing fileData');
      return;
    }

    try {
      setCurrentStep(3);
      
      // Apply column mapping first
      const mappingResponse = await fetch("/api/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDataId: dataToUse.businessDataId,
          mapping: uploadedFileData ? uploadedFileData.aiMapping : columnMapping,
        }),
      });

      if (!mappingResponse.ok) {
        throw new Error("Failed to apply column mapping");
      }

      // Start processing
      const processResponse = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDataId: dataToUse.businessDataId,
          type: action,
        }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to start processing");
      }

      const { jobId } = await processResponse.json();
      pollJobStatus(jobId);
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Error",
        description: "Failed to start processing",
        variant: "destructive",
      });
    }
  };

  const startProcessing = async () => {
    if (!fileData || !selectedAction) {
      console.error('Missing fileData or selectedAction:', { fileData: !!fileData, selectedAction });
      return;
    }

    try {
      setCurrentStep(3);
      
      // Apply column mapping first
      const mappingResponse = await fetch("/api/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDataId: fileData.businessDataId,
          mapping: columnMapping,
        }),
      });

      if (!mappingResponse.ok) {
        throw new Error("Failed to apply column mapping");
      }

      // Start processing
      const processResponse = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDataId: fileData.businessDataId,
          type: selectedAction,
        }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to start processing");
      }

      const { jobId } = await processResponse.json();
      pollJobStatus(jobId);
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Error",
        description: "Failed to start processing",
        variant: "destructive",
      });
    }
  };

  const startAIProspecting = async () => {
    if (!fileData) {
      toast({
        title: "Error",
        description: "Please upload a file first",
        variant: "destructive",
      });
      return;
    }

    if (!businessType.trim()) {
      toast({
        title: "Business Type Required",
        description: "Please specify what type of businesses you want to prospect for (e.g., 'Insurance Agencies', 'Law Firms', 'Medical Offices')",
        variant: "destructive",
      });
      return;
    }

    try {
      setCurrentStep(3);
      setSelectedAction("prospecting");
      
      const response = await fetch("/api/ai-prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDataId: fileData.businessDataId,
          businessType,
          location: location || undefined,
          numberOfResults: parseInt(numberOfResults),
          industryFilter: industryFilter !== 'all' ? industryFilter : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start AI prospecting");
      }

      const { jobId, businessDataId } = await response.json();
      
      // Update file data with new business data ID for prospects
      setFileData(prev => prev ? { ...prev, businessDataId } : {
        businessDataId,
        detectedColumns: [],
        aiMapping: {},
        totalRecords: 0
      });
      
      pollJobStatus(jobId);
    } catch (error) {
      console.error("AI Prospecting error:", error);
      toast({
        title: "Error",
        description: "Failed to start AI prospecting",
        variant: "destructive",
      });
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsGettingLocation(false);
        toast({
          title: "Location found",
          description: `Found your location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Location error",
          description: "Could not get your location. Please check permissions.",
          variant: "destructive",
        });
      }
    );
  };

  const startProspectingNearMe = async () => {
    if (!businessType.trim()) {
      toast({
        title: "Business Type Required",
        description: "Please specify what type of businesses to search for",
        variant: "destructive",
      });
      return;
    }

    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please get your location first",
        variant: "destructive",
      });
      return;
    }

    try {
      setCurrentStep(3);
      setSelectedAction("prospecting");
      
      const response = await fetch("/api/prospect-near-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          radius: 5000 // 5km radius
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start location-based prospecting");
      }

      const { jobId, businessDataId } = await response.json();
      
      // Update file data with new business data ID
      setFileData({
        businessDataId,
        detectedColumns: [],
        aiMapping: {},
        totalRecords: 0
      });
      
      setShowMap(true);
      pollJobStatus(jobId);
    } catch (error) {
      console.error("Prospect Near Me error:", error);
      toast({
        title: "Error",
        description: "Failed to start location-based prospecting",
        variant: "destructive",
      });
    }
  };

  const startProspecting = async () => {
    if (!businessType.trim()) {
      toast({
        title: "Error",
        description: "Please enter a business type",
        variant: "destructive",
      });
      return;
    }

    try {
      setCurrentStep(3);
      setSelectedAction("prospecting");
      
      const response = await fetch("/api/prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDataId: fileData?.businessDataId || null,
          businessType,
          location: location || undefined,
          numberOfResults: parseInt(numberOfResults),
          industryFilter: industryFilter !== 'all' ? industryFilter : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start prospecting");
      }

      const { jobId, businessDataId } = await response.json();
      
      // Update file data with new business data ID
      setFileData(prev => prev ? { ...prev, businessDataId } : {
        businessDataId,
        detectedColumns: [],
        aiMapping: {},
        totalRecords: parseInt(numberOfResults)
      });
      
      pollJobStatus(jobId);
    } catch (error) {
      console.error("Prospecting error:", error);
      toast({
        title: "Error",
        description: "Failed to start prospecting",
        variant: "destructive",
      });
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/job/${jobId}`);
        const job: ProcessingJob = await response.json();
        
        setCurrentJob(job);
        
        if (job.status === "completed") {
          clearInterval(pollInterval);
          await loadBusinessRecords(job.businessDataId);
          setCurrentStep(4);
          toast({
            title: "Processing completed",
            description: "Your data has been processed successfully",
          });
        } else if (job.status === "failed" || job.status === "stopped") {
          clearInterval(pollInterval);
          toast({
            title: "Processing failed",
            description: job.errorMessage || "An error occurred",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Job polling error:", error);
        clearInterval(pollInterval);
      }
    }, 1000);
  };

  const loadBusinessRecords = async (businessDataId: string) => {
    try {
      const response = await fetch(`/api/records/${businessDataId}`);
      const records = await response.json();
      setBusinessRecords(records);
    } catch (error) {
      console.error("Failed to load records:", error);
    }
  };

  const handleStopProcessing = async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(`/api/job/${currentJob.id}/stop`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "Processing stopped",
          description: "The processing has been stopped",
        });
      }
    } catch (error) {
      console.error("Stop processing error:", error);
    }
  };

  const handleExport = async () => {
    if (businessRecords.length === 0) {
      toast({
        title: "No data to export",
        description: "Please process some data first",
        variant: "destructive",
      });
      return;
    }

    try {
      await exportToExcel(businessRecords, `business_verification_${Date.now()}.xlsx`);
      toast({
        title: "Export successful",
        description: "Your data has been exported to Excel",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setFileData(null);
    setSelectedAction(null);
    setColumnMapping({});
    setCurrentJob(null);
    setBusinessRecords([]);
    setBusinessType("");
    setLocation("");
    setNumberOfResults("50");
    setIndustryFilter("");
  };

  const getMascotMessage = () => {
    switch (currentStep) {
      case 1:
        return "I'll help you verify and find more businesses! First, choose what you want to do.";
      case 2:
        return selectedAction === "verification" 
          ? "Great choice! Now upload your business list to verify addresses and occupants."
          : "Perfect! Upload a file for pattern analysis, or skip to configure prospecting directly.";
      case 3:
        return "I'm hard at work processing your data. This might take a few minutes!";
      case 4:
        return "All done! Your business data has been processed successfully.";
      default:
        return "Let's get started!";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-primary-foreground" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">Marketing Helper</h1>
                <p className="text-sm text-muted-foreground">Business Verification & Prospecting</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {currentStep === 4 && (
                <Button 
                  onClick={handleExport} 
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-export"
                >
                  <Download className="mr-2" size={16} />
                  Export Results
                </Button>
              )}
              <Button 
                onClick={handleRestart} 
                variant="secondary"
                data-testid="button-restart"
              >
                <RotateCcw className="mr-2" size={16} />
                Start Over
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <ProgressIndicator currentStep={currentStep} />
        </div>

        {/* Step 1: Choose Action */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardContent className="p-8">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="text-action-title">
                      Choose Your Action
                    </h2>
                    <p className="text-muted-foreground">
                      What would you like to do with your business data?
                    </p>
                  </div>

                  {/* Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card 
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleActionSelect("verification")}
                      data-testid="card-verify-option"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Shield className="text-white" size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Verify Existing Data</h3>
                            <p className="text-blue-700 text-sm mb-4">
                              Check and update your business information for accuracy and completeness using address verification.
                            </p>
                            <div className="text-xs text-blue-600">
                              Upload your business list to verify
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleActionSelect("prospecting")}
                      data-testid="card-prospect-option"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                            <SearchCode className="text-white" size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-green-900 mb-2">Find Similar Businesses</h3>
                            <p className="text-green-700 text-sm mb-4">
                              Discover new prospects based on your existing data patterns and specified criteria.
                            </p>
                            <div className="text-xs text-green-600">
                              Generate new leads intelligently
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="mascot-container hidden lg:flex justify-center items-start">
              <MascotCharacter message={getMascotMessage()} icon="search" />
            </div>
          </div>
        )}

        {/* Step 2: Upload File */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardContent className="p-8">
                  <div className="text-center lg:text-left mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2" data-testid="text-upload-title">
                      Upload Your Data File
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedAction === "verification" 
                        ? "Upload your business list to verify addresses and current occupants."
                        : "Upload a reference file to analyze patterns for prospecting (optional)."}
                    </p>
                  </div>
                  <UploadZone onUpload={handleFileUpload} />
                  
                  {/* Prospecting Form - Show if prospecting selected */}
                  {selectedAction === "prospecting" && (
                    <Card className="mt-8 shadow-sm">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold text-foreground mb-4">
                          {fileData ? "Configure Prospecting with Uploaded Data" : "Or Skip Upload & Configure Prospecting"}
                        </h3>
                        {fileData && (
                          <div className="mb-6">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-green-700 text-sm font-medium">
                                  File uploaded: {fileData.totalRecords} records will be used for location pattern analysis
                                </span>
                              </div>
                            </div>
                            
                            {/* AI Prospecting Button */}
                            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="text-md font-semibold text-purple-900 mb-1">Prospect with AI</h4>
                                    <p className="text-purple-700 text-sm mb-2">
                                      Find new prospects in the same cities from your file, excluding existing contacts.
                                    </p>
                                    <div className="text-xs text-purple-600">
                                      {businessType.trim() ? `Looking for: ${businessType}` : 'Please specify business type below first'}
                                    </div>
                                  </div>
                                  <Button 
                                    onClick={startAIProspecting}
                                    className="bg-purple-600 hover:bg-purple-700 text-white ml-4"
                                    data-testid="button-ai-prospect"
                                  >
                                    <SearchCode className="mr-2" size={14} />
                                    Prospect with AI
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                        
                        {/* Prospect Near Me Section */}
                        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm mb-6">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                  <MapPin size={20} />
                                  Prospect Near Me
                                </h4>
                                <p className="text-blue-700 text-sm mb-3">
                                  Use your location to find businesses nearby with Google Maps integration.
                                </p>
                                {userLocation && (
                                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    📍 Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <Button 
                                onClick={getCurrentLocation}
                                variant="outline"
                                disabled={isGettingLocation}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                data-testid="button-get-location"
                              >
                                <Crosshair className="mr-2" size={16} />
                                {isGettingLocation ? "Getting Location..." : "Get My Location"}
                              </Button>
                              
                              <Button 
                                onClick={startProspectingNearMe}
                                disabled={!userLocation || !businessType.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="button-prospect-near-me"
                              >
                                <Search className="mr-2" size={16} />
                                Prospect Near Me
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="business-type">Business Type</Label>
                            <Input
                              id="business-type"
                              placeholder="e.g., restaurants, law firms, dentists"
                              value={businessType}
                              onChange={(e) => setBusinessType(e.target.value)}
                              data-testid="input-business-type"
                            />
                          </div>
                          <div>
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              placeholder="e.g., San Francisco, CA"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              data-testid="input-location"
                            />
                          </div>
                          <div>
                            <Label htmlFor="number-results">Number of Results</Label>
                            <Select value={numberOfResults} onValueChange={setNumberOfResults}>
                              <SelectTrigger id="number-results" data-testid="select-number-results">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="50">50 prospects</SelectItem>
                                <SelectItem value="100">100 prospects</SelectItem>
                                <SelectItem value="250">250 prospects</SelectItem>
                                <SelectItem value="500">500 prospects</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="industry-filter">Industry Filter</Label>
                            <Select value={industryFilter} onValueChange={setIndustryFilter}>
                              <SelectTrigger id="industry-filter" data-testid="select-industry-filter">
                                <SelectValue placeholder="All Industries" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Industries</SelectItem>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Healthcare">Healthcare</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Retail">Retail</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                          <Button 
                            onClick={startProspecting} 
                            className="bg-green-600 hover:bg-green-700"
                            data-testid="button-start-prospecting"
                          >
                            <Search className="mr-2" size={16} />
                            Start Prospecting Without Upload
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="mascot-container hidden lg:flex justify-center items-start">
              <MascotCharacter message={getMascotMessage()} icon="lightbulb" />
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProcessingStatus 
                job={currentJob} 
                onStop={handleStopProcessing}
              />
            </div>
            <div className="mascot-container hidden lg:flex justify-center items-start">
              <MascotCharacter message={getMascotMessage()} icon="cog" animate />
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && (
          <div>
            {businessRecords.length > 0 && (
              <div className="mb-8">
                <ProspectMap
                  locations={businessRecords
                    .filter(record => record.verificationData?.enrichedData?.location)
                    .map(record => ({
                      lat: record.verificationData.enrichedData.location.lat,
                      lng: record.verificationData.enrichedData.location.lng,
                      name: record.companyName,
                      address: record.address,
                      phone: record.phone,
                      website: record.website,
                      rating: record.verificationData?.enrichedData?.rating,
                    }))
                  }
                  center={showMap ? userLocation || undefined : undefined}
                  title={showMap ? 
                    `Prospects Near You (${businessRecords.filter(r => r.verificationData?.enrichedData?.location).length} found)` :
                    `Verified Addresses (${businessRecords.filter(r => r.verificationData?.enrichedData?.location).length} mapped)`
                  }
                />
              </div>
            )}
            <DataTable 
              records={businessRecords} 
              onExport={handleExport}
            />
          </div>
        )}
      </main>
    </div>
  );
}
