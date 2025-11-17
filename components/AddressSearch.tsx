"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { loadGoogleMapsApi } from "../lib/googleMaps";

type PlanningSource = {
  label: string;
  url: string;
};

type ComparableLandAreaSource = {
  source: string;
  value: number | null;
  method?: "manual" | "geometry" | "attribute" | "derived";
  notes?: string;
};

type SiteMetric = {
  id: string;
  label: string;
  value: string;
  linkLabel: string;
  linkUrl: string;
};

type GoverningFactorStatus =
  | "go"
  | "conditional"
  | "no-go"
  | "n/a"
  | "permitted"
  | "prohibited";

type GoverningFactor = {
  label: string;
  value: string;
  note?: string;
  source?: PlanningSource;
  status?: GoverningFactorStatus;
};

type FsrHeightBonus = {
  label: string;
  fsr: string;
  height: string;
  trigger: string;
  source?: PlanningSource;
};

type PlanningOptionCategory = "lmr" | "hda" | "cdc" | "da";

type SetbackSummary = {
  summary: string;
  source: PlanningSource;
  requirements?: {
    front?: number;
    rear?: number;
    side?: number;
  };
};

type PlanningOption = {
  slug: string;
  title: string;
  category: PlanningOptionCategory;
  permissibility: string;
  isPermitted: boolean;
  status?: "permitted" | "conditional" | "prohibited";
  rationale: string;
  zoneCompatibility: string;
  constraints: string[];
  governingFactors?: GoverningFactor[];
  envelopeHint: string;
  fsrHeightBonuses?: FsrHeightBonus[];
  notes?: string[];
  clauses: PlanningSource[];
  setbacks?: SetbackSummary;
};

type PlanningOptionColumn = {
  key: PlanningOptionCategory;
  heading: string;
  description: string;
  options: PlanningOption[];
};

type Recommendation = {
  category: string;
  title: string;
  detail: string;
  sources: PlanningSource[];
};

type ComparableSale = {
  address: string;
  type: string;
  saleDate: string;
  salePrice: number | null;
  year?: number | null;
  comment: string;
  description: string;
  latitude?: number;
  longitude?: number;
  landAreaSquareMeters?: number | null;
  source: PlanningSource;
  landAreaStatus?: "verified" | "estimated" | "conflict" | "missing";
  landAreaSources?: ComparableLandAreaSource[];
};

type DevelopmentActivity = {
  applicationNumber: string;
  address: string;
  description: string;
  status: string;
  decisionDate: string;
  source: PlanningSource;
};

type SimilarApprovedProject = {
  title: string;
  address: string;
  approvalDate: string;
  headlineMetric: string;
  link: PlanningSource;
};

type BuildCostItem = {
  type: string;
  amount: number;
  ratePerSquareMetre?: number;
  note?: string;
};

type Feasibility = {
  summary: string;
  assumptions: string[];
  metrics: {
    totalGrossRealisation: number;
    totalDevelopmentCost: number;
    netProfitBeforeTax: number;
    netProfitMarginPercent: number;
    marginOnCostPercent: number;
    marginOnGrossDevelopmentValuePercent: number;
  };
  costBreakdown: {
    landCost: number;
    buildCost: BuildCostItem[];
    softCosts: number;
    holdingCosts?: number;
    contingencyPercent?: number;
    sellingCosts?: {
      total: number;
      agentCommission: number;
      gst: number;
    };
    saleComparables: string[];
  };
  decision: {
    goNoGo: string;
    recommendation: string;
    rationale: string;
  };
  sources: PlanningSource[];
};

type RecommendationSummary = {
  headline: string;
  status: string;
  rationalePoints: string[];
  nextSteps: string[];
  risks?: string[];
  confidenceRating?: string;
  tagline?: string;
};

type PlanningResult = {
  site: {
    address: string;
    lotPlan: string;
    localGovernmentArea: string;
    zoning: string;
    floorSpaceRatio: string;
    heightOfBuildings: string;
    minLotSize: string;
    mapPreviewUrl: string;
    latitude?: number;
    longitude?: number;
    generatedAt?: string;
    streetView?: {
      latitude?: number;
      longitude?: number;
    };
    streetFrontageMeters?: number | null;
    depthMeters?: number | null;
    rearBoundaryMeters?: number | null;
    leftBoundaryMeters?: number | null;
    rightBoundaryMeters?: number | null;
    lotType?: string | null;
    metrics: SiteMetric[];
    dataSources: PlanningSource[];
    guidelineLinks: PlanningSource[];
    streetViewAvailable: boolean;
    locationalInsights: {
      todArea: {
        isWithin: boolean;
        label: string | null;
        className: string | null;
        mapName: string | null;
      };
      acceleratedPrecinct: {
        isWithin: boolean;
        label: string | null;
        mapName: string | null;
      };
      deferredArea: {
        isWithin: boolean;
        label: string | null;
        mapName: string | null;
      };
      nearestTownCentre: {
        name: string;
        className: string | null;
        distanceMeters: number;
        band: "inner" | "outer" | null;
      } | null;
    };
  };
  planningOptions: PlanningOption[];
  recommendations: Recommendation[];
  comparableSales: ComparableSale[];
  developmentActivity: DevelopmentActivity[];
  similarApprovedProjects: SimilarApprovedProject[];
  feasibility: Feasibility;
  recommendationSummary: RecommendationSummary;
};

type PlanningResponse = {
  ok: boolean;
  data?: PlanningResult;
  error?: string;
};
const suggestionSamples = [
  "1 The Strand, Dee Why NSW",
  "15 Howard Avenue, Dee Why NSW",
  "24 Ocean Road, Palm Beach NSW",
  "88 Pittwater Road, Manly NSW",
  "102 Barrenjoey Road, Mona Vale NSW"
];

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD"
});

const numberFormatter = new Intl.NumberFormat("en-AU", {
  maximumFractionDigits: 0
});

const formatLandAreaStatus = (status?: ComparableSale["landAreaStatus"]) => {
  switch (status) {
    case "verified":
      return { label: "Verified", bg: "#dcfce7", fg: "#166534" };
    case "estimated":
      return { label: "Estimated", bg: "#fef9c3", fg: "#92400e" };
    case "conflict":
      return { label: "Conflict", bg: "#fee2e2", fg: "#b91c1c" };
    case "missing":
      return { label: "Missing", bg: "#e5e7eb", fg: "#374151" };
    default:
      return null;
  }
};

const formatLandAreaSource = (source: ComparableLandAreaSource) => {
  const valueLabel =
    source.value !== null && source.value !== undefined
      ? `${numberFormatter.format(source.value)} m²`
      : "N/A";
  const methodLabel = source.method ? ` (${source.method})` : "";
  const metadata = LAND_AREA_SOURCE_METADATA[source.source];
  const reliabilityLabel = metadata?.reliability ? ` [${metadata.reliability}]` : "";
  const combinedNotes = [source.notes, metadata?.note].filter(Boolean).join(" — ");
  const notesLabel = combinedNotes ? ` — ${combinedNotes}` : "";
  return `${source.source}${reliabilityLabel}: ${valueLabel}${methodLabel}${notesLabel}`;
};


const interpretMapsLoaderError = (error: unknown): string => {
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : "Failed to load Google Maps.";
  if (!rawMessage) {
    return "Failed to load Google Maps.";
  }

  if (rawMessage.includes("RefererNotAllowedMapError")) {
    return "Google Maps API rejected the request because the current domain is not in the allowed HTTP referrers list.";
  }
  if (rawMessage.includes("ApiNotActivatedMapError")) {
    return "Enable the Maps JavaScript API for this key in Google Cloud Console.";
  }
  if (rawMessage.includes("InvalidKeyMapError")) {
    return "The provided Google Maps API key is invalid or has been deleted.";
  }
  if (rawMessage.includes("BillingNotEnabledMapError")) {
    return "Billing is not enabled for this Google Maps project. Enable billing to unlock interactive maps.";
  }
  if (rawMessage.includes("OverQuotaMapError")) {
    return "Google Maps daily quota exceeded. Wait or request a higher quota.";
  }

  return rawMessage;
};

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const BODY_FONT_SIZE = "0.95rem";
const TABLE_FONT_SIZE = "0.9rem";
const LAND_AREA_SOURCE_METADATA: Record<string, { reliability: string; note?: string }> = {
  "SIX Maps NSW Cadastre (current parcels)": {
    reliability: "Authoritative",
    note: "True cadastral lot layer (Torrens title). Updated daily from NSW LRS."
  },
  "Planning Portal – Cadastre Layer": {
    reliability: "High",
    note: "Mirrors SIX Maps; preferred inside Planning Portal workflows."
  },
  "SEED NSW – Property Lot Boundaries": {
    reliability: "High",
    note: "Independent QA feed; updated less frequently but still reliable."
  }
};

const glossaryEntries: Array<{ term: string; definition: string; url?: string }> = [
  {
    term: "Apartment Design Guide (ADG)",
    definition: "NSW Apartment Design Guide (2023)",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy/apartment-design-guide"
  },
  {
    term: "AS2890",
    definition: "Australian Standard 2890 (Parking Facilities)",
    url: "https://www.standards.org.au/standards-catalogue/sa/snz/building/bd-062/as-2890-1-2020"
  },
  {
    term: "Building Sustainability Index (BASIX)",
    definition: "NSW BASIX sustainability assessment",
    url: "https://www.planningportal.nsw.gov.au/basix"
  },
  {
    term: "Complying Development Certificate (CDC)",
    definition: "Fast-track approval for low-impact development",
    url: "https://www.planningportal.nsw.gov.au/online-applications/complying-development"
  },
  {
    term: "Development Application (DA)",
    definition: "Formal application for development consent",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/development-assessment"
  },
  {
    term: "DCP",
    definition: "Development Control Plan",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/development-control-plans"
  },
  {
    term: "Floor Space Ratio (FSR)",
    definition: "Ratio of gross floor area to site area",
    url: "https://www.planningportal.nsw.gov.au/supporting-documents/floor-space-ratio"
  },
  {
    term: "Housing Diversity Amendment (HDA)",
    definition: "Housing SEPP - Housing Diversity Amendment",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy"
  },
  {
    term: "HOB",
    definition: "Height of Buildings control",
    url: "https://www.planningportal.nsw.gov.au/supporting-documents/height-of-buildings"
  },
  {
    term: "LGA",
    definition: "Local Government Area",
    url: "https://www.olg.nsw.gov.au/what-is-local-government/local-government-areas/"
  },
  {
    term: "Low and Mid-Rise (LMR)",
    definition: "State Environmental Planning Policy (Housing) 2021 - Chapter 6",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.6"
  },
  {
    term: "National Construction Code (NCC)",
    definition: "Australian building and plumbing code",
    url: "https://www.abcb.gov.au/national-construction-code"
  },
  {
    term: "SEPP",
    definition: "State Environmental Planning Policy",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/state-environmental-planning-policies"
  },
  {
    term: "State Significant Development (SSD)",
    definition: "Projects assessed as State Significant Development",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/state-significant-development"
  },
  {
    term: "Transport Oriented Development (TOD)",
    definition: "NSW Transport Oriented Development program",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/housing/transport-oriented-development-program"
  },
  {
    term: "Voluntary Planning Agreement (VPA)",
    definition: "Voluntary Planning Agreement with councils",
    url: "https://www.planning.nsw.gov.au/policy-and-legislation/special-contributions/voluntary-planning-agreements"
  }
];

const formatPlanningStatusLabel = (rawStatus?: string) => {
  if (!rawStatus) {
    return "N/A";
  }
  const status = rawStatus.trim().toLowerCase();
  if (["go", "permitted", "yes", "approve", "approved"].includes(status)) {
    return "Permitted";
  }
  if (
    ["conditional", "go (conditional)", "go-conditional", "go conditional", "maybe"].includes(
      status
    )
  ) {
    return "Conditional";
  }
  if (["no-go", "no go", "prohibited", "fail", "not permitted", "refused"].includes(status)) {
    return "Not permitted";
  }
  if (["n/a", "na", "not applicable", "unknown"].includes(status)) {
    return "N/A";
  }
  return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
};

const buildStaticMapUrl = (latitude?: number, longitude?: number) => {
  if (latitude === undefined || longitude === undefined) return null;
  if (!GOOGLE_MAPS_KEY) return null;
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: "19",
    size: "640x400",
    scale: "2",
    maptype: "satellite",
    markers: `color:0x2563EB|${latitude},${longitude}`,
    key: GOOGLE_MAPS_KEY
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
};

const buildStreetViewUrl = (latitude?: number, longitude?: number) => {
  if (latitude === undefined || longitude === undefined) return null;
  if (!GOOGLE_MAPS_KEY) return null;
  const params = new URLSearchParams({
    size: "640x400",
    location: `${latitude},${longitude}`,
    fov: "75",
    pitch: "0",
    source: "outdoor",
    key: GOOGLE_MAPS_KEY
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
};

const buildComparablesMapUrl = (
  site: Pick<PlanningResult['site'], 'latitude' | 'longitude' | 'mapPreviewUrl'>,
  comparables: ComparableSale[]
) => {
  const points: Array<{ latitude: number; longitude: number; label: string }> = [];

  if (
    site.latitude !== undefined &&
    site.longitude !== undefined &&
    Number.isFinite(site.latitude) &&
    Number.isFinite(site.longitude)
  ) {
    points.push({ latitude: site.latitude, longitude: site.longitude, label: "S" });
  }

  comparables.forEach((sale, index) => {
    if (
      sale.latitude !== undefined &&
      sale.longitude !== undefined &&
      Number.isFinite(sale.latitude) &&
      Number.isFinite(sale.longitude)
    ) {
      points.push({
        latitude: sale.latitude,
        longitude: sale.longitude,
        label: String(index + 1)
      });
    }
  });

  if (points.length === 0) {
    return site.mapPreviewUrl;
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const diffLat = Math.max(0.0001, maxLat - minLat);
  const diffLon = Math.max(0.0001, maxLon - minLon);
  const maxDiff = Math.max(diffLat, diffLon);

  let zoom = 14;
  if (maxDiff < 0.002) zoom = 17;
  else if (maxDiff < 0.005) zoom = 16;
  else if (maxDiff < 0.01) zoom = 15;
  else if (maxDiff < 0.02) zoom = 14;
  else if (maxDiff < 0.05) zoom = 13;
  else if (maxDiff < 0.1) zoom = 12;
  else zoom = 11;

  if (GOOGLE_MAPS_KEY) {
    const params = new URLSearchParams({
      center: `${centerLat},${centerLon}`,
      zoom: zoom.toString(),
      size: "640x400",
      scale: "2",
      maptype: "roadmap",
      key: GOOGLE_MAPS_KEY
    });

    points.forEach((point) => {
      const style =
        point.label === "S" ? "color:0xDC2626|label:S" : `color:0x1D4ED8|label:${point.label}`;
      params.append("markers", `${style}|${point.latitude},${point.longitude}`);
    });

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }

  const markerParams = points
    .map((point) => {
      const style = point.label === "S" ? "red-pushpin" : "lightblue1";
      return `markers=${point.latitude},${point.longitude},${style}`;
    })
    .join("&");

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLon}&zoom=${zoom}&size=640x400&${markerParams}`;
};
export default function AddressSearch() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!GOOGLE_MAPS_KEY) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[AddressSearch] NEXT_PUBLIC_GOOGLE_MAPS_KEY is missing. Falling back to static imagery."
        );
      }
      return;
    }

    let cancelled = false;

    setMapError(null);

    loadGoogleMapsApi(GOOGLE_MAPS_KEY, ["places"])
      .then(() => {
        if (cancelled) return;
        setMapsReady(true);
        setMapError(null);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[AddressSearch] Google Maps API loaded successfully.");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setMapsReady(false);
        setMapError(interpretMapsLoaderError(error));
        if (process.env.NODE_ENV !== "production") {
          console.error("[AddressSearch] Failed to load Google Maps API.", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !inputRef.current || !window.google?.maps?.places) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      fields: ["formatted_address"]
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setAddress(place.formatted_address);
        setSuggestions([]);
      }
    });

    return () => {
      window.google.maps.event.removeListener(listener);
      autocompleteRef.current = null;
    };
  }, [mapsReady]);

  const updateSuggestions = (value: string) => {
    if (mapsReady) {
      setSuggestions([]);
      return;
    }

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    const filtered = suggestionSamples
      .filter((item) => item.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 5);

    setSuggestions(filtered.length > 0 ? filtered : suggestionSamples.slice(0, 3));
  };

  const handleSearch = async () => {
    if (loading) {
      return;
    }

    if (!address.trim()) {
      setError("Please enter an address to continue.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        "/api/nswPlanningAtPoint?address=" + encodeURIComponent(address.trim())
      );
      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }
      const payload: PlanningResponse = await res.json();

      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "No data returned");
      }

      setResult(payload.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem", display: "grid", gap: "1.5rem" }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSearch();
        }}
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => {
            const next = e.target.value;
            setAddress(next);
            updateSuggestions(next);
          }}
          placeholder="Enter Property Address"
          style={{ padding: "0.5rem", minWidth: "260px", flex: "1 0 240px" }}
          list={!mapsReady ? "address-suggestions" : undefined}
          autoComplete="off"
          aria-label="Enter a property address in New South Wales"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Analysing…" : "Analyse Site"}
        </button>
      </form>

      {!mapsReady && (
        <datalist id="address-suggestions">
          {suggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      )}

      {mapError && (
        <p style={{ color: "#b91c1c", margin: 0, fontSize: BODY_FONT_SIZE }}>
          Google Maps API error: {mapError} Fallback imagery will be used.
        </p>
      )}

      {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

      {result && <ResultDisplay result={result} mapsReady={mapsReady} mapError={mapError} />}
    </div>
  );
}
type ResultDisplayProps = {
  result: PlanningResult;
  mapsReady: boolean;
  mapError: string | null;
};

function ResultDisplay({ result, mapsReady, mapError }: ResultDisplayProps) {
  const {
    site,
    planningOptions,
    recommendations,
    comparableSales,
    developmentActivity,
    similarApprovedProjects,
    feasibility,
    recommendationSummary
  } = result;

  const planningColumns = useMemo<PlanningOptionColumn[]>(() => {
    const columnPresets: Array<{
      key: PlanningOptionCategory;
      heading: string;
      description: string;
    }> = [
      {
        key: "lmr",
        heading: "Low and Mid-Rise (LMR) Uplift (Apartments)",
        description:
          "Low and Mid-Rise uplift opportunities within Transport Oriented Development (TOD) and town centre programs."
      },
      {
        key: "hda",
        heading: "Housing Diversity Amendment (HDA) Pathways",
        description:
          "Housing Diversity Amendment scenarios focused on affordable housing and future HDA mapping uplift."
      },
      {
        key: "cdc",
        heading: "Complying Development Certificate (CDC) Pathways - Duplex & Terrace",
        description:
          "Complying Development Certificate options for Duplex and terrace delivery where Codes SEPP criteria are satisfied."
      },
      {
        key: "da",
        heading: "Development Application (DA) Pathways - Merit Assessment",
        description:
          "Development Application routes (Duplex, terraces, apartments) including clause 4.6 and design excellence pathways."
      }
    ];

    return columnPresets
      .map((preset) => ({
        ...preset,
        options: planningOptions.filter((option) => option.category === preset.key)
      }))
      .filter((column) => column.options.length > 0);
  }, [planningOptions]);

  const pricedComparableSales = useMemo(
    () => comparableSales
      .filter((sale) => sale.salePrice !== null && sale.salePrice !== undefined)
      .sort((a, b) => {
        const aArea = a.landAreaSquareMeters ?? 0;
        const bArea = b.landAreaSquareMeters ?? 0;
        return bArea - aArea; // Sort descending by land size
      }),
    [comparableSales]
  );

  const buildCostTotal = feasibility.costBreakdown.buildCost.reduce(
    (acc, item) => acc + item.amount,
    0
  );
  const softCostsValue = feasibility.costBreakdown.softCosts ?? 0;
  const sellingCosts = feasibility.costBreakdown.sellingCosts;
  const gstOnSales = sellingCosts?.gst ?? 0;
  const softCostsExGst = Math.max(softCostsValue - gstOnSales, 0);
  const holdingCostsValue = feasibility.costBreakdown.holdingCosts ?? 0;
  const totalCost =
    feasibility.costBreakdown.landCost + buildCostTotal + softCostsValue + holdingCostsValue;

  const feasibilityRows = [
    {
      item: "Land Cost",
      estimate: currencyFormatter.format(feasibility.costBreakdown.landCost),
      note: "Market estimate"
    },
    {
      item: "Build Cost",
      estimate: currencyFormatter.format(buildCostTotal),
      note: "Based on current specification"
    },
    {
      item: "Soft Costs",
      estimate: currencyFormatter.format(softCostsExGst),
      note: `Consultants, approvals, operations${
        sellingCosts?.agentCommission
          ? ` (agent commission ${currencyFormatter.format(sellingCosts.agentCommission)})`
          : ""
      }`
    },
    {
      item: "Holding Costs",
      estimate: currencyFormatter.format(holdingCostsValue),
      note: "Finance and council rates"
    },
    {
      item: "Total Cost",
      estimate: currencyFormatter.format(totalCost),
      note: "Land + build + soft + holding"
    },
    {
      item: "Total Revenue",
      estimate: currencyFormatter.format(feasibility.metrics.totalGrossRealisation),
      note: "Based on comparable sales"
    },
    {
      item: "Net Profit (pre-tax)",
      estimate: currencyFormatter.format(feasibility.metrics.netProfitBeforeTax),
      note: `Margin ${feasibility.metrics.marginOnCostPercent}%`
    }
  ];

  if (gstOnSales > 0) {
    const softIndex = feasibilityRows.findIndex((row) => row.item === "Soft Costs");
    const gstRow = {
      item: "GST on sales (margin scheme)",
      estimate: currencyFormatter.format(gstOnSales),
      note: "Margin scheme GST payable at settlement"
    };
    if (softIndex >= 0) {
      feasibilityRows.splice(softIndex + 1, 0, gstRow);
    } else {
      feasibilityRows.splice(2, 0, gstRow);
    }
  }

  const recommendationGroups = useMemo(
    () => [
      {
        title: "Proceedable Pathways",
        accentColor: "#10b981",
        items: recommendations.filter(
          (item) => item.category.toLowerCase() === "proceedable pathways"
        )
      },
      {
        title: "Risk Flags",
        accentColor: "#f97316",
        items: recommendations.filter((item) => item.category.toLowerCase() === "risk flags")
      },
      {
        title: "Further Investigation",
        accentColor: "#0ea5e9",
        items: recommendations.filter(
          (item) => item.category.toLowerCase() === "further investigation"
        )
      },
      {
        title: "High Risk / Likely Refusal",
        accentColor: "#ef4444",
        items: recommendations.filter(
          (item) => item.category.toLowerCase() === "high risk / likely refusal"
        )
      }
    ],
    [recommendations]
  );

  const generatedAtDisplay = site.generatedAt
    ? new Date(site.generatedAt).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
    : null;
  const dataSourceSummary = site.dataSources.map((source) => source.label).join(", ");
  const comparableSourceLabels = Array.from(
    new Set(pricedComparableSales.map((sale) => sale.source.label))
  );
  const comparableSourceSummary = comparableSourceLabels.join(", ");

  return (
    <div
      style={{
        border: "1px solid #d0d7de",
        borderRadius: "16px",
        padding: "1.75rem",
        display: "grid",
        gap: "2.5rem",
        backgroundColor: "#f8fafc",
        maxWidth: "1200px",
        width: "100%",
        margin: "0 auto"
      }}
    >
      <MapImagery site={site} mapsReady={mapsReady} mapError={mapError} />

      <section style={{ display: "grid", gap: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a" }}>
            2. Site Data
          </h2>
          <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.6, fontSize: BODY_FONT_SIZE }}>
            Low and Mid-Rise (LMR) site characteristics including lot dimensions, street frontage, and locational context sourced from NSW Planning Portal datasets.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gap: "0.8rem",
              gridTemplateColumns: "1fr"
            }}
          >
            {site.metrics.map((metric) => (
              <article
                key={metric.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #d0d7de",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "grid",
                  gap: "0.45rem"
                }}
              >
                <span style={{ fontSize: BODY_FONT_SIZE, color: "#64748b" }}>{metric.label}</span>
                <strong style={{ fontSize: "1.1rem", color: "#0f172a" }}>{metric.value}</strong>
                <a
                  href={metric.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: BODY_FONT_SIZE }}
                >
                  {metric.linkLabel}
                </a>
              </article>
            ))}
          </div>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "0.75rem"
            }}
          >
            {siteSummaryEntries(site).map(({ label, value }) => (
              <div key={label}>
                <dt style={{ fontWeight: 600, color: "#1f2937" }}>{label}</dt>
                <dd style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <SourceList heading="Primary datasets" items={site.dataSources} />
        {generatedAtDisplay && (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
            Data captured {generatedAtDisplay} AEST from {dataSourceSummary || "project datasets"}.
          </p>
        )}
      </section>

      <section style={{ display: "grid", gap: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a" }}>
            3. Zoning Summary & Planning Options
          </h2>
          <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.6, fontSize: BODY_FONT_SIZE }}>
            Zoning requirements and available approval pathways including Complying Development Certificate (CDC), Development Application (DA), Low and Mid-Rise (LMR), Apartment Design Guide (ADG) Guidelines, Housing Diversity Amendment (HDA), and State Significant Development (SSD). Review Floor Space Ratio (FSR) and Maximum Height Allowances for each pathway.
          </p>
        </div>

        <PlanningOptionSummaryTable options={planningOptions} />

        <div style={{ display: "grid", gap: "1.5rem" }}>
          {planningColumns.map((column) => (
            <div key={column.key} style={{ display: "grid", gap: "0.9rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a" }}>{column.heading}</h3>
                <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.5, fontSize: BODY_FONT_SIZE }}>
                  {column.description}
                </p>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                {column.options.map((option) => (
                  <PlanningOptionCard key={option.slug} option={option} site={site} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {generatedAtDisplay && (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
            Planning pathway data captured {generatedAtDisplay} AEST. Sources include NSW Housing
            SEPP datasets and listed clauses.
          </p>
        )}
      </section>
      <RecommendationSummarySection summary={recommendationSummary} />

      <section style={{ display: "grid", gap: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a" }}>
            5. Additional Guidance
          </h2>
          <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.6, fontSize: BODY_FONT_SIZE }}>
            Use these action cards to progress the preferred pathway while managing identified
            risks and investigation items.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "1fr"
          }}
        >
          {recommendationGroups.map((group) => (
            <RecommendationColumn
              key={group.title}
              title={group.title}
              items={group.items}
              accentColor={group.accentColor}
            />
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a" }}>
            6. Comparable Sales & Development Activity
          </h2>
          <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.6, fontSize: BODY_FONT_SIZE }}>
            Comparable evidence and nearby development activity sourced from NSW Planning Portal
            and market intelligence datasets.
          </p>
        </div>

        <ComparableSalesMap
          site={site}
          comparables={comparableSales}
          mapsReady={mapsReady}
          mapError={mapError}
        />

        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #d0d7de",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "grid",
              gap: "1rem"
            }}
          >
            <header>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Sales Comparables</h3>
              <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: BODY_FONT_SIZE }}>
                Evidence of Duplex, terrace, and Low and Mid-Rise (LMR) outcomes supporting the feasibility assumptions.
              </p>
            </header>
            {pricedComparableSales.length === 0 ? (
              <p style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>
                No priced comparable sales available for this search.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "720px",
                    fontSize: TABLE_FONT_SIZE
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>#</th>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>Type</th>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>Sale date</th>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>Price</th>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>Land area</th>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>$/m2</th>
                      <th style={{ textAlign: "left", padding: "0.6rem", color: "#475569", fontSize: "0.75rem" }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricedComparableSales.map((sale, index) => {
                      const saleDateLabel = sale.saleDate
                        ? new Date(sale.saleDate).toLocaleDateString("en-AU")
                        : "Unknown";
                      const priceLabel =
                        sale.salePrice !== null && sale.salePrice !== undefined
                          ? currencyFormatter.format(sale.salePrice)
                          : "Price unavailable";
                      const landArea =
                        sale.landAreaSquareMeters !== null && sale.landAreaSquareMeters !== undefined
                          ? `${numberFormatter.format(sale.landAreaSquareMeters)} m2`
                          : "N/A";
                      const rateLabel =
                        sale.salePrice !== null &&
                        sale.salePrice !== undefined &&
                        sale.landAreaSquareMeters !== null &&
                        sale.landAreaSquareMeters !== undefined &&
                        sale.landAreaSquareMeters > 0
                          ? `${currencyFormatter.format(
                              sale.salePrice / sale.landAreaSquareMeters
                            )}/m2`
                          : "N/A";

                      return (
                        <Fragment key={sale.address + (sale.saleDate ?? index)}>
                          <tr style={{ borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                            <td
                              rowSpan={2}
                              style={{
                                padding: "0.6rem",
                                color: "#334155", fontSize: TABLE_FONT_SIZE,
                                fontWeight: 600,
                                verticalAlign: "top",
                                width: "40px"
                              }}
                            >
                              {index + 1}
                            </td>
                            <td colSpan={6} style={{ padding: "0.6rem", color: "#0f172a", fontWeight: 600 }}>
                              <div>{sale.address}</div>
                              {sale.comment && (
                                <div style={{ color: "#64748b", fontSize: TABLE_FONT_SIZE, marginTop: "0.2rem", fontWeight: 500 }}>
                                  {sale.comment}
                                </div>
                              )}
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "0.6rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>{sale.type}</td>
                            <td style={{ padding: "0.6rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>{saleDateLabel}</td>
                            <td style={{ padding: "0.6rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>{priceLabel}</td>
                            <td style={{ padding: "0.6rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>{landArea}</td>
                            <td style={{ padding: "0.6rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>{rateLabel}</td>
                            <td style={{ padding: "0.6rem" }}>
                              <a
                                href={sale.source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#1d4ed8", fontSize: TABLE_FONT_SIZE }}
                              >
                                {sale.source.label}
                              </a>
                            </td>
                          </tr>
                          {(sale.landAreaStatus || (sale.landAreaSources && sale.landAreaSources.length > 0)) && (
                            <tr style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                              <td colSpan={7} style={{ padding: "0.6rem 0.6rem 0.8rem" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                  {(() => {
                                    const status = formatLandAreaStatus(sale.landAreaStatus);
                                    if (!status) return null;
                                    return (
                                      <span
                                        style={{
                                          alignSelf: "flex-start",
                                          padding: "0.2rem 0.6rem",
                                          borderRadius: "999px",
                                          backgroundColor: status.bg,
                                          color: status.fg,
                                          fontSize: "0.75rem",
                                          fontWeight: 600
                                        }}
                                      >
                                        Land area {status.label}
                                      </span>
                                    );
                                  })()}
                                  {sale.landAreaSources && sale.landAreaSources.length > 0 && (
                                    <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#475569", fontSize: TABLE_FONT_SIZE }}>
                                      {sale.landAreaSources.map((source, sourceIndex) => (
                                        <li key={source.source + sourceIndex}>{formatLandAreaSource(source)}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pricedComparableSales.length > 0 && (
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                Comparable data captured {generatedAtDisplay ?? "recently"} from{" "}
                {comparableSourceSummary || "NSW Planning & CoreLogic APIs"}.
              </p>
            )}
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #d0d7de",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "grid",
              gap: "1rem"
            }}
          >
            <header>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Nearby Development Applications</h3>
              <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: BODY_FONT_SIZE }}>
                Council and state assessed applications, including Land and Environment Court findings from the past 2 years, signalling appetite for uplift in the area.
              </p>
            </header>
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {developmentActivity.length === 0 ? (
                <p style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>
                  No aligned development applications have been determined in the past 12 months.
                  Continue monitoring the council tracker for emerging approvals.
                </p>
              ) : (
                developmentActivity.map((item) => (
                  <article
                    key={item.applicationNumber}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "0.85rem",
                      display: "grid",
                      gap: "0.35rem",
                      backgroundColor: "#fdf4ff"
                    }}
                  >
                    <strong style={{ color: "#0f172a" }}>
                      {item.applicationNumber} | {item.status}
                    </strong>
                    <span style={{ color: "#475569", fontSize: BODY_FONT_SIZE }}>
                      {item.address} | Decided{" "}
                      {new Date(item.decisionDate).toLocaleDateString("en-AU")}
                    </span>
                    <p style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>
                      {item.description}
                    </p>
                    <SourceList heading="Source" items={[item.source]} />
                  </article>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #d0d7de",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "grid",
              gap: "1rem"
            }}
          >
            <header>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Similar Approved Projects</h3>
              <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: BODY_FONT_SIZE }}>
                Benchmark consents to test design language, staging, and conditions of approval.
              </p>
            </header>
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {similarApprovedProjects.map((project) => (
                <article
                  key={project.title}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "0.85rem",
                    display: "grid",
                    gap: "0.35rem",
                    backgroundColor: "#ecfeff"
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>{project.title}</strong>
                  <span style={{ color: "#475569", fontSize: BODY_FONT_SIZE }}>
                    {project.address} • Approved {new Date(project.approvalDate).toLocaleDateString("en-AU")}
                  </span>
                  <p style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>
                    {project.headlineMetric}
                  </p>
                  <SourceList heading="Documentation" items={[project.link]} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.6rem", color: "#0f172a" }}>
          7. Feasibility Snapshot
        </h2>
        <article
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #d0d7de",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "grid",
            gap: "1.25rem"
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Summary</h3>
            <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: BODY_FONT_SIZE }}>{feasibility.summary}</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "460px"
              }}
            >
              <thead>
                <tr>
                  {['Item', 'Estimate', 'Notes'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: BODY_FONT_SIZE,
                        backgroundColor: "#f1f5f9",
                        color: "#0f172a",
                        borderBottom: "1px solid #cbd5f5"
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feasibilityRows.map((row) => (
                  <tr key={row.item}>
                    <td
                      style={{
                        padding: "0.75rem",
                        borderTop: "1px solid #dfe3f0",
                        color: "#1e293b", fontSize: TABLE_FONT_SIZE,
                        fontWeight: 600,
                        width: "30%"
                      }}
                    >
                      {row.item}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        borderTop: "1px solid #dfe3f0",
                        color: "#1d4ed8",
                        fontWeight: 600,
                        width: "30%"
                      }}
                    >
                      {row.estimate}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem",
                        borderTop: "1px solid #dfe3f0",
                        color: "#475569"
                      }}
                    >
                      {row.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>Assumptions</h3>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>
              {feasibility.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </div>
          <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
            {feasibility.decision.rationale}
          </p>
          <SourceList heading="Feasibility sources" items={feasibility.sources} />
        </article>
      </section>

      <section>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.6rem", color: "#0f172a" }}>
          8. Technical Glossary
        </h2>
        <article
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #d0d7de",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "grid",
            gap: "0.75rem"
          }}
        >
          <p style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>
            Abbreviations used throughout the report are expanded here for clarity.
          </p>
          <dl
            style={{
              display: "grid",
              gap: "0.6rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              margin: 0
            }}
          >
            {glossaryEntries.map((entry) => (
              <div key={entry.term}>
                <dt style={{ fontWeight: 600, color: "#0f172a" }}>{entry.term}</dt>
                <dd style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#1d4ed8", fontSize: TABLE_FONT_SIZE }}
                    >
                      {entry.definition}
                    </a>
                  ) : (
                    entry.definition
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
    </div>
  );
}
type MapImageryProps = {
  site: PlanningResult['site'];
  mapsReady: boolean;
  mapError: string | null;
};

function MapImagery({ site, mapsReady, mapError }: MapImageryProps) {
  const fallbackImage = site.mapPreviewUrl;
  const staticMapUrl = buildStaticMapUrl(site.latitude, site.longitude) ?? fallbackImage;
  const streetViewTarget = site.streetView ?? {
    latitude: site.latitude,
    longitude: site.longitude
  };
  const streetViewLatitude = streetViewTarget?.latitude;
  const streetViewLongitude = streetViewTarget?.longitude;
  const streetViewFallback =
    site.streetViewAvailable && GOOGLE_MAPS_KEY
      ? buildStreetViewUrl(streetViewLatitude, streetViewLongitude)
      : null;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const mapMarkerRef = useRef<google.maps.Marker | null>(null);
  const streetViewRef = useRef<HTMLDivElement | null>(null);
  const streetViewInstanceRef = useRef<google.maps.StreetViewPanorama | null>(null);

  const canRenderInteractiveMap =
    mapsReady &&
    site.latitude !== undefined &&
    site.longitude !== undefined &&
    Number.isFinite(site.latitude) &&
    Number.isFinite(site.longitude);

  const hasStreetViewPoint =
    typeof streetViewLatitude === "number" &&
    Number.isFinite(streetViewLatitude) &&
    typeof streetViewLongitude === "number" &&
    Number.isFinite(streetViewLongitude);
  const canRenderStreetView = mapsReady && site.streetViewAvailable && hasStreetViewPoint;

  useEffect(() => {
    if (!canRenderInteractiveMap || !mapContainerRef.current) {
      return;
    }
    const googleMaps = window.google;
    const position = { lat: site.latitude as number, lng: site.longitude as number };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new googleMaps.maps.Map(mapContainerRef.current, {
        center: position,
        zoom: 19,
        mapTypeId: "satellite",
        disableDefaultUI: true,
        clickableIcons: false
      });
    } else {
      mapInstanceRef.current.setCenter(position);
      mapInstanceRef.current.setZoom(19);
    }
    if (!mapMarkerRef.current) {
      mapMarkerRef.current = new googleMaps.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: site.address ?? "Selected site"
      });
    } else {
      mapMarkerRef.current.setPosition(position);
      mapMarkerRef.current.setMap(mapInstanceRef.current);
    }
  }, [canRenderInteractiveMap, site.address, site.latitude, site.longitude]);

  useEffect(() => {
    if (!streetViewRef.current) {
      return;
    }

    if (!canRenderStreetView) {
      if (streetViewInstanceRef.current) {
        streetViewInstanceRef.current.setVisible(false);
        streetViewInstanceRef.current = null;
      }
      return;
    }

    const googleMaps = window.google;
    streetViewInstanceRef.current = new googleMaps.maps.StreetViewPanorama(
      streetViewRef.current,
      {
        position: {
          lat: streetViewLatitude as number,
          lng: streetViewLongitude as number
        },
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        disableDefaultUI: true
      }
    );

    return () => {
      streetViewInstanceRef.current?.setVisible(false);
      streetViewInstanceRef.current = null;
    };
  }, [canRenderStreetView, streetViewLatitude, streetViewLongitude]);

  useEffect(() => {
    if (!canRenderInteractiveMap && mapMarkerRef.current) {
      mapMarkerRef.current.setMap(null);
      mapMarkerRef.current = null;
    }
  }, [canRenderInteractiveMap]);

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a" }}>
          1. Site Context
        </h2>
        <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.6, fontSize: BODY_FONT_SIZE }}>
          Visualise the parcel immediately after entering the address. Satellite imagery centres on
          the lot and Street View appears whenever Google coverage is available for the frontage.
        </p>
      </div>
      {site.address && (
        <p
          style={{
            margin: "0.5rem 0 0",
            fontWeight: 600,
            color: "#0f172a"
          }}
        >
          {site.address}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            canRenderStreetView || streetViewFallback
              ? "repeat(auto-fit, minmax(280px, 1fr))"
              : "minmax(280px, 1fr)",
          gap: "1rem"
        }}
      >
        <figure
          style={{
            margin: 0,
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #cbd5f5",
            backgroundColor: "#0f172a",
            minHeight: "260px",
            position: "relative"
          }}
        >
          {canRenderInteractiveMap ? (
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- Google Maps static image requires raw <img> */}
              <img
                src={staticMapUrl}
                alt="Satellite map of the selected property"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
              />
              {!GOOGLE_MAPS_KEY || mapError ? (
                <figcaption
                  style={{
                    padding: "0.75rem 1rem",
                    color: "#f8fafc",
                    backgroundColor: "rgba(15, 23, 42, 0.75)"
                  }}
                >
                  {mapError
                    ? `Google Maps disabled: ${mapError}`
                    : "Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to serve live satellite imagery."}
                </figcaption>
              ) : null}
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "16px",
                  height: "16px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(37, 99, 235, 0.85)",
                  border: "2px solid #ffffff",
                  boxShadow: "0 0 6px rgba(15, 23, 42, 0.45)",
                  pointerEvents: "none"
                }}
              />
            </>
          )}
        </figure>
        {(canRenderStreetView || streetViewFallback) && (
          <figure
            style={{
              margin: 0,
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #cbd5f5",
              backgroundColor: "#0f172a",
              minHeight: "260px",
              position: "relative"
            }}
          >
            {canRenderStreetView ? (
              <div ref={streetViewRef} style={{ width: "100%", height: "100%" }} />
            ) : (
              streetViewFallback && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Google Street View static frame requires raw <img> */}
                  <img
                    src={streetViewFallback}
                    alt="Street view perspective of the selected property"
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </>
              )
            )}
            {!canRenderStreetView && streetViewFallback && (
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "16px",
                  height: "16px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(37, 99, 235, 0.85)",
                  border: "2px solid #ffffff",
                  boxShadow: "0 0 6px rgba(15, 23, 42, 0.45)",
                  pointerEvents: "none"
                }}
              />
            )}
          </figure>
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: BODY_FONT_SIZE,
          color: "#64748b",
          textAlign: "center"
        }}
      >
        Powered by NSW Planning Portal & Google Maps
      </p>
      <SourceList heading="Key guidelines" items={site.guidelineLinks} />
    </section>
  );
}

type ComparableSalesMapProps = {
  site: PlanningResult['site'];
  comparables: ComparableSale[];
  mapsReady: boolean;
  mapError: string | null;
};

function ComparableSalesMap({ site, comparables, mapsReady, mapError }: ComparableSalesMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);

  const fallbackMapUrl = useMemo(
    () =>
      buildComparablesMapUrl(
        { latitude: site.latitude, longitude: site.longitude, mapPreviewUrl: site.mapPreviewUrl },
        comparables
      ),
    [site.latitude, site.longitude, site.mapPreviewUrl, comparables]
  );

  const canRenderInteractiveMap =
    mapsReady &&
    site.latitude !== undefined &&
    site.longitude !== undefined &&
    Number.isFinite(site.latitude) &&
    Number.isFinite(site.longitude);

  useEffect(() => {
    if (!canRenderInteractiveMap || !mapContainerRef.current) {
      return;
    }
    const googleMaps = window.google;
    const map =
      mapInstanceRef.current ??
      new googleMaps.maps.Map(mapContainerRef.current, {
        center: { lat: site.latitude as number, lng: site.longitude as number },
        zoom: 14,
        mapTypeId: "roadmap",
        disableDefaultUI: true,
        clickableIcons: false
      });

    mapInstanceRef.current = map;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];

    const bounds = new googleMaps.maps.LatLngBounds();

    if (
      site.latitude !== undefined &&
      site.longitude !== undefined &&
      Number.isFinite(site.latitude) &&
      Number.isFinite(site.longitude)
    ) {
      const sitePosition = new googleMaps.maps.LatLng(
        site.latitude as number,
        site.longitude as number
      );
      const siteMarker = new googleMaps.maps.Marker({
        map,
        position: sitePosition,
        label: { text: "S", color: "#ffffff", fontWeight: "700" },
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#dc2626",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        },
        title: site.address
      });
      markerRefs.current.push(siteMarker);
      bounds.extend(sitePosition);
    }

    const validComparables = comparables.filter(
      (sale) =>
        sale.latitude !== undefined &&
        sale.longitude !== undefined &&
        Number.isFinite(sale.latitude) &&
        Number.isFinite(sale.longitude)
    );

    validComparables.forEach((sale, index) => {
      const position = new googleMaps.maps.LatLng(
        sale.latitude as number,
        sale.longitude as number
      );
      const marker = new googleMaps.maps.Marker({
        map,
        position,
        label: {
          text: String(index + 1),
          color: "#ffffff",
          fontWeight: "700"
        },
        icon: {
          path: googleMaps.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        },
        title: sale.address
      });
      markerRefs.current.push(marker);
      bounds.extend(position);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 48);
    }
  }, [canRenderInteractiveMap, comparables, site.address, site.latitude, site.longitude]);

  useEffect(() => {
    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  if (!canRenderInteractiveMap) {
    return (
      <figure
        style={{
          margin: 0,
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #d0d7de",
          position: "relative",
          backgroundColor: "#0f172a",
          minHeight: "280px"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Static map placeholders require raw <img> */}
        <img
          src={fallbackMapUrl}
          alt="Map of nearby sales and development activity"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {(!GOOGLE_MAPS_KEY || mapError) && (
          <figcaption
            style={{
              position: "absolute",
              left: "1rem",
              right: "1rem",
              bottom: "3.2rem",
              padding: "0.6rem 0.8rem",
              borderRadius: "10px",
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              color: "#f8fafc",
              fontSize: BODY_FONT_SIZE,
              lineHeight: 1.4
            }}
          >
            {mapError
              ? `Google Maps disabled: ${mapError}`
              : 'Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to display live comparative pins.'}
          </figcaption>
        )}
        <figcaption
          style={{
            position: "absolute",
            left: "1rem",
            right: "1rem",
            bottom: "1rem",
            padding: "0.6rem 0.8rem",
            borderRadius: "10px",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            color: "#f8fafc",
            fontSize: BODY_FONT_SIZE,
            lineHeight: 1.4
          }}
        >
          {'Site shown as red "S" pin. Comparable sales numbered 1-n in blue.'}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      style={{
        margin: 0,
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #d0d7de",
        position: "relative",
        backgroundColor: "#0f172a",
        minHeight: "280px"
      }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      <figcaption
        style={{
          position: "absolute",
          left: "1rem",
          right: "1rem",
          bottom: "1rem",
          padding: "0.6rem 0.8rem",
          borderRadius: "10px",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          color: "#f8fafc",
          fontSize: BODY_FONT_SIZE,
          lineHeight: 1.4
        }}
      >
        {'Site shown as red "S" pin. Comparable sales numbered 1-n in blue.'}
      </figcaption>
    </figure>
  );
}
type RecommendationSummarySectionProps = {
  summary: RecommendationSummary;
};

function RecommendationSummarySection({ summary }: RecommendationSummarySectionProps) {
  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a" }}>
          4. Recommendation Summary
        </h2>
        <p style={{ margin: "0.35rem 0 0", color: "#475569", lineHeight: 1.6, fontSize: BODY_FONT_SIZE }}>
          Snapshot of the recommended pathway, supporting rationale, and next steps.
        </p>
      </div>
      <article
        style={{
          display: "grid",
          gap: "1rem",
          border: "1px solid #d0d7de",
          borderRadius: "12px",
          padding: "1.25rem",
          backgroundColor: "#ffffff"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.35rem", flex: "1 1 260px" }}>
            {summary.headline}
          </h3>
          <StatusBadge
            label={summary.status}
            status={summary.status.toLowerCase().includes("go") ? "permitted" : "conditional"}
            fallbackPermitted
          />
        </div>
        <div>
          <h4 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>Why this path</h4>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>
            {summary.rationalePoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>Next steps</h4>
          <ol style={{ margin: 0, paddingLeft: "1.4rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>
            {summary.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        {summary.risks && summary.risks.length > 0 && (
          <div>
            <h4 style={{ margin: "0 0 0.5rem", color: "#b91c1c" }}>Risks to manage</h4>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#b91c1c" }}>
              {summary.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.confidenceRating && (
          <p style={{ margin: 0, color: "#0f172a", fontWeight: 600 }}>
            Confidence: {summary.confidenceRating}
          </p>
        )}
        {summary.tagline && (
          <p style={{ margin: 0, color: "#475569", fontStyle: "italic" }}>{summary.tagline}</p>
        )}
      </article>
    </section>
  );
}

type RecommendationColumnProps = {
  title: string;
  items: Recommendation[];
  accentColor: string;
};

function RecommendationColumn({ title, items, accentColor }: RecommendationColumnProps) {
  if (items.length === 0) return null;

  return (
    <section
      style={{
        border: `1px solid ${accentColor}`,
        borderRadius: "12px",
        padding: "1.25rem",
        backgroundColor: "#ffffff",
        display: "grid",
        gap: "0.9rem"
      }}
    >
      <h3 style={{ margin: 0, color: accentColor }}>{title}</h3>
      <div style={{ display: "grid", gap: "0.85rem" }}>
        {items.map((item) => (
          <article
            key={item.title}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.85rem",
              display: "grid",
              gap: "0.35rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <strong style={{ color: "#0f172a" }}>{item.title}</strong>
            <p style={{ margin: 0, color: "#475569", fontSize: BODY_FONT_SIZE }}>{item.detail}</p>
            <SourceList heading="Sources" items={item.sources} />
          </article>
        ))}
      </div>
    </section>
  );
}
type PlanningOptionSummaryTableProps = {
  options: PlanningOption[];
};

function PlanningOptionSummaryTable({ options }: PlanningOptionSummaryTableProps) {
  if (options.length === 0) return null;

  const categoryLabels: Record<PlanningOptionCategory, string> = {
    lmr: "LMR",
    hda: "HDA",
    cdc: "CDC",
    da: "DA"
  };

  const rows = options.map((option) => {
    const tone = option.status ?? (option.isPermitted ? "permitted" : "conditional");
    const statusLabel = formatPlanningStatusLabel(tone);
    const palette =
      tone === "permitted"
        ? { bg: "#dcfce7", fg: "#166534" }
        : tone === "conditional"
          ? { bg: "#fef9c3", fg: "#92400e" }
        : { bg: "#fee2e2", fg: "#b91c1c" };

    return {
      key: option.slug,
      title: option.title,
      category: categoryLabels[option.category] ?? option.category,
      statusLabel,
      palette,
      trigger: option.permissibility
    };
  });

  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
        overflowX: "auto"
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "560px",
          fontSize: TABLE_FONT_SIZE
        }}
      >
        <caption
          style={{
            textAlign: "left",
            padding: "1rem 1.25rem 0.5rem",
            fontWeight: 600,
            color: "#0f172a",
            fontSize: TABLE_FONT_SIZE
          }}
        >
          Status summary
        </caption>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "0.75rem 1.25rem", color: "#475569", fontSize: TABLE_FONT_SIZE }}>
              Pathway
            </th>
            <th style={{ textAlign: "left", padding: "0.75rem 1.25rem", color: "#475569", fontSize: TABLE_FONT_SIZE }}>
              Category
            </th>
            <th style={{ textAlign: "left", padding: "0.75rem 1.25rem", color: "#475569", fontSize: TABLE_FONT_SIZE }}>
              Status
            </th>
            <th style={{ textAlign: "left", padding: "0.75rem 1.25rem", color: "#475569", fontSize: TABLE_FONT_SIZE }}>
              Key trigger
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: "0.85rem 1.25rem", color: "#0f172a", fontWeight: 600, fontSize: TABLE_FONT_SIZE }}>
                {row.title}
              </td>
              <td style={{ padding: "0.85rem 1.25rem", color: "#475569", fontSize: TABLE_FONT_SIZE }}>{row.category}</td>
              <td style={{ padding: "0.85rem 1.25rem", fontSize: TABLE_FONT_SIZE }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.2rem 0.75rem",
                    borderRadius: "999px",
                    backgroundColor: row.palette.bg,
                    color: row.palette.fg,
                    fontWeight: 600,
                    fontSize: TABLE_FONT_SIZE
                  }}
                >
                  {row.statusLabel}
                </span>
              </td>
              <td style={{ padding: "0.85rem 1.25rem", color: "#475569", lineHeight: 1.5, fontSize: TABLE_FONT_SIZE }}>
                {row.trigger}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
type PlanningOptionCardProps = {
  option: PlanningOption;
  site: PlanningResult['site'];
};

function PlanningOptionCard({ option, site }: PlanningOptionCardProps) {
  const primaryConstraints = option.constraints.slice(0, 2);
  const remainingConstraints = option.constraints.length - primaryConstraints.length;
  const setbacksSource = option.setbacks?.source;
  const showDetailedSections = option.isPermitted;

  const frontage = site.streetFrontageMeters ?? null;
  const lotDepth = site.depthMeters ?? null;
  const frontSetback = option.setbacks?.requirements?.front ?? null;
  const rearSetback = option.setbacks?.requirements?.rear ?? frontSetback ?? null;
  const sideSetback = option.setbacks?.requirements?.side ?? null;

  const buildableWidth =
    frontage !== null && sideSetback !== null
      ? Math.max(frontage - 2 * sideSetback, 0)
      : null;
  const buildableDepth =
    lotDepth !== null
      ? Math.max(lotDepth - (frontSetback ?? 0) - (rearSetback ?? frontSetback ?? 0), 0)
      : null;

  const formatDimension = (value: number | null) =>
    value !== null && Number.isFinite(value) ? `${value.toFixed(1)} m` : null;
  const footprintLabels = [
    buildableWidth !== null ? `Width approx. ${formatDimension(buildableWidth)}` : null,
    buildableDepth !== null ? `Depth approx. ${formatDimension(buildableDepth)}` : null
  ].filter((value): value is string => Boolean(value));

  const parseFirstNumber = (input?: string) => {
    if (!input) return null;
    const match = input.match(/-?\d+(\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : null;
  };

  const baselineFsrFactor = option.governingFactors?.find((factor) =>
    /floor space ratio.*baseline/i.test(factor.label)
  );
  const baselineHeightFactor = option.governingFactors?.find((factor) =>
    /height.*baseline/i.test(factor.label)
  );
  const baselineFsrValue = parseFirstNumber(baselineFsrFactor?.value);
  const baselineHeightValue = parseFirstNumber(baselineHeightFactor?.value);

  const fsrBonusRows =
    option.fsrHeightBonuses?.map((bonus) => ({
      label: bonus.label,
      fsrText: bonus.fsr,
      heightText: bonus.height,
      trigger: bonus.trigger,
      fsrValue: parseFirstNumber(bonus.fsr),
      heightValue: parseFirstNumber(bonus.height),
      source: bonus.source
    })) ?? [];

  const numericalFsrRows = [
    { value: baselineFsrValue, text: baselineFsrFactor?.value },
    ...fsrBonusRows.map((row) => ({ value: row.fsrValue, text: row.fsrText }))
  ];
  const numericalHeightRows = [
    { value: baselineHeightValue, text: baselineHeightFactor?.value },
    ...fsrBonusRows.map((row) => ({ value: row.heightValue, text: row.heightText }))
  ];

  const maxFsrEntry = numericalFsrRows.reduce(
    (
      best: { value: number | null; text: string | undefined } | null,
      current
    ) => {
      if (current.value === null || Number.isNaN(current.value)) {
        return best;
      }
      if (!best || (best.value ?? Number.NEGATIVE_INFINITY) < current.value) {
        return { value: current.value, text: current.text };
      }
      return best;
    },
    null
  );

  const maxHeightEntry = numericalHeightRows.reduce(
    (
      best: { value: number | null; text: string | undefined } | null,
      current
    ) => {
      if (current.value === null || Number.isNaN(current.value)) {
        return best;
      }
      if (!best || (best.value ?? Number.NEGATIVE_INFINITY) < current.value) {
        return { value: current.value, text: current.text };
      }
      return best;
    },
    null
  );

  const formatFsr = (value: number | null, fallback?: string) => {
    if (value === null || Number.isNaN(value)) {
      return fallback ?? "—";
    }
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${formatted.replace(/\.00$/, "")}:1`;
  };

  const formatHeight = (value: number | null, fallback?: string) => {
    if (value === null || Number.isNaN(value)) {
      return fallback ?? "—";
    }
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${formatted.replace(/\.00$/, "")} m`;
  };

  const hasFsrData =
    Boolean(baselineFsrFactor?.value || baselineHeightFactor?.value) ||
    fsrBonusRows.length > 0;

  const fsrTableRows = hasFsrData
    ? [
        {
          label: "Baseline controls",
          fsrText: baselineFsrFactor?.value ?? "—",
          heightText: baselineHeightFactor?.value ?? "—",
          trigger: "LEP / Housing SEPP baseline",
          source: baselineFsrFactor?.source ?? baselineHeightFactor?.source
        },
        ...fsrBonusRows.map((row) => ({
          label: row.label,
          fsrText: row.fsrText,
          heightText: row.heightText,
          trigger: row.trigger,
          source: row.source
        })),
        {
          label: "Maximum with bonuses",
          fsrText: formatFsr(maxFsrEntry?.value ?? null, maxFsrEntry?.text),
          heightText: formatHeight(maxHeightEntry?.value ?? null, maxHeightEntry?.text),
          trigger: "Assumes eligible bonuses applied where permissible."
        }
      ]
    : [];

  return (
    <article
      style={{
        border: "1px solid #dbeafe",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        boxShadow: "0 1px 0 rgba(15, 23, 42, 0.05)"
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "1rem",
          padding: "1rem 1.25rem"
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>{option.title}</h4>
          <p
            style={{
              margin: "0.3rem 0 0",
              color: "#475569",
              lineHeight: 1.5,
              fontSize: BODY_FONT_SIZE
            }}
          >
            {option.rationale}
          </p>
        </div>
        <div>
          <StatusBadge
            label={option.permissibility}
            status={option.status}
            fallbackPermitted={option.isPermitted}
          />
        </div>
        {showDetailedSections && option.setbacks && (
          <section>
            <strong
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#0f172a",
                fontSize: BODY_FONT_SIZE
              }}
            >
              Indicative residential setbacks
            </strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.4, fontSize: BODY_FONT_SIZE }}>
              {option.setbacks.summary}
            </p>
            {setbacksSource && (
              setbacksSource.url ? (
                <a
                  href={setbacksSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#1d4ed8",
                    fontSize: BODY_FONT_SIZE,
                    marginTop: "0.35rem",
                    display: "inline-flex"
                  }}
                >
                  {setbacksSource.label}
                </a>
              ) : (
                <span style={{ color: "#475569", fontSize: BODY_FONT_SIZE }}>
                  {setbacksSource.label}
                </span>
              )
            )}
          </section>
        )}
        {showDetailedSections && footprintLabels.length > 0 && (
          <section>
            <strong
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#0f172a",
                fontSize: BODY_FONT_SIZE
              }}
            >
              Indicative buildable footprint
            </strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.4, fontSize: BODY_FONT_SIZE }}>
              {footprintLabels.join(" | ")}
            </p>
            <p style={{ margin: "0.2rem 0 0", color: "#94a3b8", fontSize: "0.8rem" }}>
              Approximation only - excludes articulation zones, easements, and frontage/town centre variations.
            </p>
          </section>
        )}
        {showDetailedSections && (
          <section>
            <strong
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#0f172a",
                fontSize: BODY_FONT_SIZE
              }}
            >
              Zoning compatibility
            </strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.4, fontSize: BODY_FONT_SIZE }}>
              {option.zoneCompatibility}
            </p>
          </section>
        )}
        {showDetailedSections && option.governingFactors && option.governingFactors.length > 0 && (
          <section>
            <strong
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#0f172a",
                fontSize: BODY_FONT_SIZE
              }}
            >
              Governing factors
            </strong>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: TABLE_FONT_SIZE,
                color: "#475569"
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.45rem 0.6rem 0.45rem 0",
                      borderBottom: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontWeight: 600,
                      fontSize: TABLE_FONT_SIZE
                    }}
                  >
                    Factor
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.45rem 0.6rem",
                      borderBottom: "1px solid #e2e8f0",
                      color: "#0f172a",
                      fontWeight: 600,
                      fontSize: TABLE_FONT_SIZE
                    }}
                  >
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {option.governingFactors.map((factor) => {
                  const source = factor.source;
                  const showSecondarySource =
                    source && source.label && source.label !== factor.label;

                  return (
                    <tr
                      key={`${option.slug}-${factor.label}`}
                      style={{ borderTop: "1px solid #e2e8f0" }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          fontWeight: 600,
                          color: "#0f172a",
                          padding: "0.4rem 0.6rem 0.4rem 0",
                          fontSize: TABLE_FONT_SIZE
                        }}
                      >
                        {source ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0f172a", textDecoration: "underline", fontSize: TABLE_FONT_SIZE }}
                          >
                            {factor.label}
                          </a>
                        ) : (
                          factor.label
                        )}
                      </th>
                      <td style={{ padding: "0.4rem 0", lineHeight: 1.4, fontSize: TABLE_FONT_SIZE }}>
                        <div>{factor.value}</div>
                        {factor.note && (
                          <div style={{ color: "#64748b", marginTop: "0.2rem", fontSize: TABLE_FONT_SIZE }}>{factor.note}</div>
                        )}
                        {showSecondarySource && source && (
                          <div style={{ marginTop: "0.3rem", fontSize: TABLE_FONT_SIZE }}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#1d4ed8", fontSize: TABLE_FONT_SIZE }}
                            >
                              {source.label}
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
        {showDetailedSections && option.constraints.length > 0 && (
          <section>
            <strong
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#0f172a",
                fontSize: BODY_FONT_SIZE
              }}
            >
              Key requirements
            </strong>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.1rem",
                display: "grid",
                gap: "0.25rem",
                color: "#475569",
                fontSize: BODY_FONT_SIZE
              }}
            >
              {primaryConstraints.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {remainingConstraints > 0 && <li>+ {remainingConstraints} further controls</li>}
            </ul>
          </section>
        )}
        {showDetailedSections && (
          <section>
            <strong
              style={{
                display: "block",
                marginBottom: "0.35rem",
                color: "#0f172a",
                fontSize: BODY_FONT_SIZE
              }}
            >
              Envelope notes
            </strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.4, fontSize: BODY_FONT_SIZE }}>
              {option.envelopeHint}
            </p>
          </section>
        )}
      </div>
      {showDetailedSections && fsrTableRows.length > 0 && (
        <div style={{ padding: "0 1.25rem 1.25rem" }}>
          <h5 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>Floor Space Ratio (FSR) & height bonuses</h5>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", minWidth: "420px", fontSize: TABLE_FONT_SIZE }}
            >
              <thead>
                <tr>
                  {['Bonus', 'Floor Space Ratio (FSR)', 'Height', 'Trigger'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "0.6rem",
                        fontSize: TABLE_FONT_SIZE,
                        backgroundColor: "#f1f5f9",
                        color: "#0f172a",
                        borderBottom: "1px solid #cbd5f5"
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fsrTableRows.map((row, index) => {
                  const isTotalRow = index === fsrTableRows.length - 1;
                  const rowSource = row.source;

                  return (
                    <tr
                      key={`${row.label}-${index}`}
                      style={isTotalRow ? { backgroundColor: "#f8fafc" } : undefined}
                    >
                      <td
                        style={{
                          padding: "0.6rem",
                          borderTop: "1px solid #dfe3f0",
                          color: "#1e293b", fontSize: TABLE_FONT_SIZE,
                          fontWeight: isTotalRow ? 700 : 600,
                          lineHeight: 1.4
                        }}
                      >
                        <div>{row.label}</div>
                        {rowSource && (
                          <div style={{ marginTop: "0.25rem", fontWeight: 500, fontSize: TABLE_FONT_SIZE }}>
                            <a
                              href={rowSource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#1d4ed8", fontSize: TABLE_FONT_SIZE }}
                            >
                              {rowSource.label}
                            </a>
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem",
                          borderTop: "1px solid #dfe3f0",
                          color: "#334155", fontSize: TABLE_FONT_SIZE,
                          fontWeight: isTotalRow ? 600 : 500
                        }}
                      >
                        {row.fsrText}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem",
                          borderTop: "1px solid #dfe3f0",
                          color: "#334155", fontSize: TABLE_FONT_SIZE,
                          fontWeight: isTotalRow ? 600 : 500
                        }}
                      >
                        {row.heightText}
                      </td>
                      <td
                        style={{
                          padding: "0.6rem",
                          borderTop: "1px solid #dfe3f0",
                          color: "#475569",
                          lineHeight: 1.4
                        }}
                      >
                        {row.trigger}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {option.notes && option.notes.length > 0 && (
        <div style={{ padding: "0 1.25rem 1.25rem" }}>
          <h5 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>Notes</h5>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#475569", fontSize: BODY_FONT_SIZE }}>
            {option.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ padding: "0 1.25rem 1.25rem" }}>
        <SourceList heading="Clauses & references" items={option.clauses} />
      </div>
    </article>
  );
}

type SourceListProps = {
  heading: string;
  items: PlanningSource[];
};

function SourceList({ heading, items }: SourceListProps) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h4 style={{ margin: "1rem 0 0.5rem", color: "#1f2937" }}>{heading}</h4>
      <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#1d4ed8" }}>
        {items.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

type StatusBadgeProps = {
  label: string;
  status?: PlanningOption['status'];
  fallbackPermitted?: boolean;
};

function StatusBadge({ label, status, fallbackPermitted }: StatusBadgeProps) {
  const tone = status ?? (fallbackPermitted ? "permitted" : "conditional");
  const palette =
    tone === "permitted"
      ? { bg: "#dcfce7", fg: "#166534" }
      : tone === "conditional"
      ? { bg: "#fef9c3", fg: "#92400e" }
      : { bg: "#fee2e2", fg: "#b91c1c" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.35rem 0.75rem",
        borderRadius: "999px",
        backgroundColor: palette.bg,
        color: palette.fg,
        fontSize: TABLE_FONT_SIZE,
        fontWeight: 600
      }}
    >
      {label}
    </span>
  );
}

function siteSummaryEntries(site: PlanningResult['site']) {
  const entries = [
    { label: "Address", value: site.address },
    { label: "Lot and Plan", value: site.lotPlan },
    { label: "Local Government Area", value: site.localGovernmentArea }
  ];

  if (site.zoning) {
    entries.push({ label: "Zoning", value: site.zoning });
  }

  const { todArea, acceleratedPrecinct, deferredArea, nearestTownCentre } = site.locationalInsights;
  if (todArea.isWithin) {
    entries.push({
      label: "Transport Oriented Development (TOD)",
      value: `${todArea.label ?? 'Transport Oriented Development area'} (${todArea.className ?? 'inner band'})`
    });
  } else if (acceleratedPrecinct.isWithin) {
    entries.push({
      label: "Transport Oriented Development (TOD)",
      value: `Accelerated precinct ${acceleratedPrecinct.label ?? ''}`
    });
  } else if (deferredArea.isWithin) {
    entries.push({
      label: "Transport Oriented Development (TOD)",
      value: "Deferred Transport Oriented Development area"
    });
  } else {
    entries.push({
      label: "Transport Oriented Development (TOD)",
      value: "Outside mapped Transport Oriented Development areas"
    });
  }

  if (nearestTownCentre) {
    const distance = Number.isFinite(nearestTownCentre.distanceMeters)
      ? `~${Math.round(nearestTownCentre.distanceMeters)} m`
      : "";
    entries.push({
      label: "Nearest town centre",
      value: `${nearestTownCentre.name} (${nearestTownCentre.band ?? 'outside band'}) ${distance}`.trim()
    });
  }

  entries.push({
    label: "Street View coverage",
    value: site.streetViewAvailable ? "Available" : "Not available"
  });

  return entries;
}



