import { supabase } from "@/integrations/supabase/client";

const LISTING_BUCKET = "listing-images";
const MAX_FILE_MB = 8;

export interface DealListingSyncInput {
  userId: string;
  dealId: string;
  address: string;
  clientName: string | null;
  side: string;
  salePrice: number;
  grossCommission: number;
  agentSplitPct: number;
  brokerageSplitPct: number;
  referralPct: number;
  referralTo: string | null;
  closeDate: string | null;
  status: string;
  images?: File[];
}

export function mapDealStatusToListingStatus(status: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "sold" || normalized === "closed") return "Sold";
  if (normalized === "under_agreement" || normalized === "pending" || normalized === "clear_to_close" || normalized === "commitment") {
    return "Pending";
  }
  if (normalized === "on_mls" || normalized === "new_listing") return "Active";
  if (normalized === "canceled") return "Not on MLS";
  return "Active";
}

export async function uploadListingImages(userId: string, images: File[]) {
  const uploadedPaths: string[] = [];

  try {
    for (const image of images) {
      if (!image.type.startsWith("image/")) {
        throw new Error(`${image.name} is not an image.`);
      }
      if (image.size > MAX_FILE_MB * 1024 * 1024) {
        throw new Error(`${image.name} is larger than ${MAX_FILE_MB}MB.`);
      }

      const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(LISTING_BUCKET).upload(path, image, {
        contentType: image.type,
        upsert: false,
      });
      if (error) throw error;
      uploadedPaths.push(path);
    }

    return uploadedPaths;
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(LISTING_BUCKET).remove(uploadedPaths).catch(() => {});
    }
    throw error;
  }
}

export async function syncDealToListing(input: DealListingSyncInput) {
  const uploadedPaths = input.images?.length ? await uploadListingImages(input.userId, input.images) : [];

  try {
    const { data: existingListing, error: existingError } = await supabase
      .from("listings")
      .select("id,image_paths,seller_name,seller_email,seller_phone,seller_new_address,beds,baths,sqft,notes")
      .or(`deal_id.eq.${input.dealId},address.eq.${input.address}`)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (existingError) throw existingError;

    const listingPayload = {
      user_id: input.userId,
      deal_id: input.dealId,
      address: input.address,
      list_price: input.salePrice,
      status: mapDealStatusToListingStatus(input.status),
      client_name: input.clientName,
      deal_side: input.side,
      close_date: input.closeDate,
      gross_commission: input.grossCommission,
      agent_split_pct: input.agentSplitPct,
      brokerage_split_pct: input.brokerageSplitPct,
      referral_pct: input.referralPct,
      referral_to: input.referralTo,
      image_paths: [...(existingListing?.image_paths ?? []), ...uploadedPaths],
      seller_name: existingListing?.seller_name ?? null,
      seller_email: existingListing?.seller_email ?? null,
      seller_phone: existingListing?.seller_phone ?? null,
      seller_new_address: existingListing?.seller_new_address ?? null,
      beds: existingListing?.beds ?? null,
      baths: existingListing?.baths ?? null,
      sqft: existingListing?.sqft ?? null,
      notes: existingListing?.notes ?? null,
    };

    if (existingListing?.id) {
      const { error } = await supabase.from("listings").update(listingPayload).eq("id", existingListing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from("listings").insert(listingPayload);
    if (error) throw error;
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(LISTING_BUCKET).remove(uploadedPaths).catch(() => {});
    }
    throw error;
  }
}
