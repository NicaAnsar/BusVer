import { storage } from './storage';

export async function processLocationProspecting(
  jobId: string,
  businessDataId: string,
  options: { businessType: string; latitude: number; longitude: number; radius: number }
) {
  try {
    console.log(`Starting location prospecting for job ${jobId}, businessData ${businessDataId}`);
    
    await storage.updateProcessingJob(jobId, {
      status: "running",
      progress: 20
    });

    // Use Google Places API to find nearby businesses - this is the main work
    const { searchNearbyBusinesses } = await import('./google-places');
    
    console.log(`Searching for ${options.businessType} near ${options.latitude}, ${options.longitude}`);
    
    const businesses = await searchNearbyBusinesses(
      options.businessType,
      options.latitude,
      options.longitude,
      options.radius
    );

    console.log(`Found ${businesses.length} businesses`);
    await storage.updateProcessingJob(jobId, { progress: 80 });

    // Convert to business records format
    const businessRecords = businesses.map((business: any, index: number) => ({
      businessDataId,
      companyName: business.name,
      email: null,
      phone: business.phone || null,
      website: business.website || null,
      address: business.address,
      industry: business.types?.join(', ') || 'Business',
      status: "verified" as const,
      verificationData: {
        verified: true,
        confidence: business.rating ? business.rating / 5 : 0.7,
        addressVerified: true,
        currentBusinessName: business.name,
        enrichedData: {
          rating: business.rating,
          priceLevel: business.priceLevel,
          googlePlacesId: business.placeId,
          location: {
            lat: business.geometry.location.lat,
            lng: business.geometry.location.lng
          }
        }
      },
      originalRowIndex: index,
      isDeleted: false,
    }));

    await storage.createBusinessRecords(businessRecords);

    await storage.updateBusinessData(businessDataId, {
      status: "completed",
      totalRecords: businesses.length,
      processedRecords: businesses.length,
      verifiedRecords: businesses.length,
      errorRecords: 0,
    });

    await storage.updateProcessingJob(jobId, {
      status: "completed",
      progress: 100,
      completedAt: new Date(),
      results: {
        totalFound: businesses.length,
        businessType: options.businessType,
        location: `${options.latitude.toFixed(4)}, ${options.longitude.toFixed(4)}`,
        radius: `${options.radius}m`
      }
    });

  } catch (error) {
    console.error("Location prospecting error:", error);
    await storage.updateProcessingJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Location prospecting failed",
      completedAt: new Date(),
    });
  }
}