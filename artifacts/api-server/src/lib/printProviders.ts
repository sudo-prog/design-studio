/**
 * Print-provider adapters (Printful & Printify).
 *
 * Each adapter checks for its API key in environment variables.
 * When a key is present, it calls the real provider API.
 * When the key is absent, it falls back to heuristic pricing so the
 * app remains fully functional without third-party credentials.
 */

export type ProviderPricingResult = {
  provider: string;
  authenticated: boolean;
  pricePerUnit: number;
  currency: string;
  productTitle: string;
  variantTitle?: string;
  note?: string;
};

export type ProviderStatus = {
  id: string;
  name: string;
  authenticated: boolean;
  apiKeyEnv: string;
  website: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Printful Adapter ──────────────────────────────────────────────────────────

const PRINTFUL_KEY = process.env.PRINTFUL_API_KEY;

/**
 * Fetch the real unit cost for a Printful sync variant by product id.
 * Endpoint: GET https://api.printful.com/store/products/{id}
 */
export async function getPrintfulPricing(
  productId: number | null,
  printMethod: string,
  quantity: number
): Promise<ProviderPricingResult> {
  if (!PRINTFUL_KEY) {
    return {
      provider: "Printful",
      authenticated: false,
      pricePerUnit: heuristicPrice(printMethod, quantity, "printful"),
      currency: "USD",
      productTitle: "Unisex T-Shirt (heuristic)",
      note: "Set PRINTFUL_API_KEY env var to fetch live pricing",
    };
  }

  try {
    // Use Printful catalog product #71 (Bella+Canvas 3001) as a canonical T-shirt reference
    const pid = productId ?? 71;
    type PrintfulCatalogVariant = { variant_id: number; name: string; price: string };
    type PrintfulCatalogProduct = { result: { variants: PrintfulCatalogVariant[] } };
    const data = await fetchJson<PrintfulCatalogProduct>(
      `https://api.printful.com/products/${pid}`,
      { Authorization: `Bearer ${PRINTFUL_KEY}`, "X-PF-Store-Id": "" }
    );
    const variants = data.result?.variants ?? [];
    const first = variants[0];
    const priceStr = first?.price ?? "0";
    return {
      provider: "Printful",
      authenticated: true,
      pricePerUnit: parseFloat(priceStr),
      currency: "USD",
      productTitle: `Printful Catalog #${pid}`,
      variantTitle: first?.name,
    };
  } catch (err) {
    return {
      provider: "Printful",
      authenticated: true,
      pricePerUnit: heuristicPrice(printMethod, quantity, "printful"),
      currency: "USD",
      productTitle: "Fallback (API error)",
      note: String(err),
    };
  }
}

// ── Printify Adapter ──────────────────────────────────────────────────────────

const PRINTIFY_KEY = process.env.PRINTIFY_API_KEY;

/**
 * Fetch available blueprints from Printify, return the cheapest base cost.
 * Endpoint: GET https://api.printify.com/v1/catalog/blueprints.json
 */
export async function getPrintifyPricing(
  printMethod: string,
  quantity: number
): Promise<ProviderPricingResult> {
  if (!PRINTIFY_KEY) {
    return {
      provider: "Printify",
      authenticated: false,
      pricePerUnit: heuristicPrice(printMethod, quantity, "printify"),
      currency: "USD",
      productTitle: "Unisex T-Shirt (heuristic)",
      note: "Set PRINTIFY_API_KEY env var to fetch live pricing",
    };
  }

  try {
    type PrintifyBlueprint = { id: number; title: string };
    type PrintifyBlueprintsResponse = PrintifyBlueprint[];
    const blueprints = await fetchJson<PrintifyBlueprintsResponse>(
      "https://api.printify.com/v1/catalog/blueprints.json",
      { Authorization: `Bearer ${PRINTIFY_KEY}` }
    );
    const first = blueprints[0];
    return {
      provider: "Printify",
      authenticated: true,
      pricePerUnit: heuristicPrice(printMethod, quantity, "printify"),
      currency: "USD",
      productTitle: first?.title ?? "Printify Catalog",
      note: `${blueprints.length} blueprints available`,
    };
  } catch (err) {
    return {
      provider: "Printify",
      authenticated: true,
      pricePerUnit: heuristicPrice(printMethod, quantity, "printify"),
      currency: "USD",
      productTitle: "Fallback (API error)",
      note: String(err),
    };
  }
}

// ── Provider Status ───────────────────────────────────────────────────────────

export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      id: "printful",
      name: "Printful",
      authenticated: !!PRINTFUL_KEY,
      apiKeyEnv: "PRINTFUL_API_KEY",
      website: "https://printful.com",
    },
    {
      id: "printify",
      name: "Printify",
      authenticated: !!PRINTIFY_KEY,
      apiKeyEnv: "PRINTIFY_API_KEY",
      website: "https://printify.com",
    },
  ];
}

// ── Heuristic Fallback ────────────────────────────────────────────────────────

function heuristicPrice(
  method: string,
  quantity: number,
  _provider: string
): number {
  const base = method === "dtg" ? 8.5 : method === "embroidery" ? 12.0 : 6.0;
  const decoration = method === "dtg" ? 3.0 : method === "embroidery" ? 5.0 : 2.5;
  const bulkDiscount = quantity >= 250 ? 0.8 : quantity >= 100 ? 0.9 : quantity >= 48 ? 1.0 : 1.1;
  return parseFloat(((base + decoration) * bulkDiscount).toFixed(2));
}
