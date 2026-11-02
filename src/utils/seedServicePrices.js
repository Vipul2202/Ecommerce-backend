const ServicePrice = require("../models/servicePrice");

// Current live prices, matching the physical in-store price list as of
// Oct 2026. Runs on every connect, but only inserts services whose key
// isn't already in the collection — it never touches or overwrites a
// price the owner has since changed from the admin panel. This also
// means a newly added service (new key added here later) gets created
// automatically next deploy, without wiping anything else out.
const DEFAULT_PRICES = [
  { key: "outside", category: "tier", label: "Outside Only", sedan: 35, suv: 45, fourWd: 55 },
  { key: "inside_outside", category: "tier", label: "Inside & Out", sedan: 55, suv: 65, fourWd: 75 },
  { key: "premium_wash", category: "tier", label: "Premium Wash", sedan: 95, suv: 105, fourWd: 115 },
  { key: "mini_detail", category: "tier", label: "Mini Detail", sedan: 149, suv: 179, fourWd: 199 },
  { key: "interior_detail", category: "tier", label: "Interior Detail", sedan: 229, suv: 259, fourWd: 279 },
  { key: "full_detail", category: "tier", label: "Full Detail", sedan: 175, suv: 195, fourWd: 225 },
  { key: "signature_detail", category: "tier", label: "Signature Detail", sedan: 275, suv: 295, fourWd: 325 },
  { key: "the_works", category: "tier", label: "The Works", sedan: 349, suv: 399, fourWd: 449 },

  { key: "ceramic_coating", category: "premium", label: "Ceramic Coating", flatPrice: 499, quoteOnly: true },
  { key: "interior_protection_pack", category: "premium", label: "Interior Protection Pack", flatPrice: 299 },
  { key: "window_tinting", category: "premium", label: "Window Tinting", flatPrice: 499 },
  { key: "paintless_dent_removal", category: "premium", label: "Paintless Dent Removal", flatPrice: 199 },

  { key: "stage3_paint_correction", category: "extra", label: "Stage 3 Paint Correction", flatPrice: 299 },
  { key: "buff_polish", category: "extra", label: "Buff & Polish", flatPrice: 179 },
  { key: "headlight_restoration", category: "extra", label: "Headlight Restoration", flatPrice: 50 },
  { key: "leather_steam_clean", category: "extra", label: "Leather Clean & Steam Clean", flatPrice: 70 },
  { key: "dog_hair_removal", category: "extra", label: "Dog Hair Removal", flatPrice: 50 },
  { key: "bull_bar_polish", category: "extra", label: "Bull Bar Polish", flatPrice: 149 },
  { key: "antibacterial_aircon_treatment", category: "extra", label: "Antibacterial Aircon Treatment", flatPrice: 100 },
];

module.exports = async function seedServicePrices() {
  try {
    const existing = await ServicePrice.find().select("key").lean();
    const existingKeys = new Set(existing.map((p) => p.key));
    const missing = DEFAULT_PRICES.filter((p) => !existingKeys.has(p.key));
    if (missing.length === 0) return;
    await ServicePrice.insertMany(missing);
    console.log(`Seeded ${missing.length} service price(s): ${missing.map((p) => p.key).join(", ")}`);
  } catch (error) {
    console.error("Error seeding service prices:", error.message);
  }
};
