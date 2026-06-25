import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// NOTE: The browser-loaded Google Maps JS SDK (Places Autocomplete) still
// requires a key in the script URL — this is a Google SDK constraint. That
// key MUST be locked down in Google Cloud Console with:
//   - HTTP referrer restrictions limited to this app's domains
//   - API restrictions: Maps JavaScript API + Places API only
// The Geocoding API call is proxied server-side below so the key is never
// shipped to the browser for that endpoint.

export const getGoogleMapsKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured on the server.");
    }
    return { apiKey };
  });

const reverseGeocodeSchema = z.object({
  lat: z.number().finite().gte(-90).lte(90),
  lon: z.number().finite().gte(-180).lte(180),
});

export const reverseGeocodeCoordinates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reverseGeocodeSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured on the server.");
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${data.lat},${data.lon}`);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(
        "[reverseGeocodeCoordinates] HTTP error",
        response.status,
      );
      throw new Error("Could not reverse geocode current location");
    }

    const body = (await response.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{ place_id: string; formatted_address: string }>;
    };

    if (body.status !== "OK" || !body.results || body.results.length === 0) {
      if (body.status && body.status !== "ZERO_RESULTS") {
        console.error(
          "[reverseGeocodeCoordinates] Google error",
          body.status,
          body.error_message,
        );
        throw new Error("Reverse geocode failed");
      }
      return { result: null };
    }

    const top = body.results[0];
    return {
      result: {
        id: top.place_id,
        label: top.formatted_address,
        lat: data.lat,
        lon: data.lon,
      },
    };
  });
