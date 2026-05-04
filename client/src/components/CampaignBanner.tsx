import { useQuery } from "@tanstack/react-query";
import type { Campaign } from "@shared/schema";

export function CampaignBanner() {
  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/active"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const campaign = campaigns?.[0];
  if (!campaign) return null;

  return (
    <div className="mb-6 flex justify-center" data-testid="campaign-banner">
      <a
        href={campaign.landingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        data-testid="link-campaign-banner"
      >
        <img
          src={campaign.bannerImageUrl}
          alt=""
          width={320}
          height={100}
          className="block"
          style={{ width: 320, height: 100, objectFit: "cover" }}
          data-testid="img-campaign-banner"
        />
      </a>
    </div>
  );
}
