import { NextResponse } from 'next/server';

const DEFAULT_COORDINATES = {
  latitude: -33.7525,
  longitude: 151.2837,
  mapPreviewUrl:
    'https://tile.openstreetmap.org/10/873/625.png'
};

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT =
  'JohinkeDevApp/1.0 (contact: beta@northernbeachesdev.com)';
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const LOT_SEARCH_ENDPOINT =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Common/LotSearch/MapServer/0/query';
const LOT_SEARCH_DATASHEET =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Common/LotSearch/MapServer';
const LAND_ZONING_ENDPOINT =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/19/query';
const OSRM_ROUTE_ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';

type GeocodeResult = {
  latitude?: number;
  longitude?: number;
  mapPreviewUrl?: string;
};

type ParcelSummary = {
  frontageMeters: number;
  depthMeters: number;
  areaSquareMeters: number | null;
  lotPlan?: string;
  centroidLatitude?: number;
  centroidLongitude?: number;
};

type ArcGisRing = Array<[number, number]>;

const SEPP_HOUSING_MAPSERVER =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer';
const HOUSING_SEPP_LMR_URL = 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.4';
const HOUSING_SEPP_TOWN_CENTRE_URL = 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.5';
const CODES_SEPP_PART3A_URL = 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572#pt.3A';
const CODES_SEPP_PART3B_URL = 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572#pt.3B';
const HOUSING_DIVERSITY_PROGRAM_URL = 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy';

type LandZoningAttributes = {
  LABEL?: string;
  LAY_CLASS?: string;
  EPI_NAME?: string;
  COMMENCED_DATE?: number;
};

function buildFallbackStaticMap(latitude?: number, longitude?: number) {
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return DEFAULT_COORDINATES.mapPreviewUrl;
  }
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=17&size=640x400&markers=${latitude},${longitude},lightblue1`;
}

type LegacyPlan = {
  lepName: string;
  lepBaseUrl: string;
  zoningSchedule?: string;
  heightSchedule?: string;
  fsrSchedule?: string;
  lotSizeSchedule?: string;
  dcpName: string;
  dcpUrl: string;
};

const LEGACY_PLANS: Record<string, LegacyPlan> = {
  warringah: {
    lepName: 'Warringah Local Environmental Plan 2011',
    lepBaseUrl: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2011-0293',
    zoningSchedule: '#sch.1',
    heightSchedule: '#sch.2',
    fsrSchedule: '#sch.3',
    lotSizeSchedule: '#sch.4',
    dcpName: 'Warringah Development Control Plan 2011',
    dcpUrl:
      'https://eservices.northernbeaches.nsw.gov.au/ePlanning/live/Pages/Plan/Book.aspx?exhibit=WDCP'
  },
  manly: {
    lepName: 'Manly Local Environmental Plan 2013',
    lepBaseUrl: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2013-0140',
    zoningSchedule: '#sch.2',
    heightSchedule: '#sch.3',
    fsrSchedule: '#sch.4',
    lotSizeSchedule: '#sch.5',
    dcpName: 'Manly Development Control Plan 2013',
    dcpUrl:
      'https://files-preprod-d9.northernbeaches.nsw.gov.au/nbc-prod-files/Manly_Development_Control_Plan_2013_Amendment_11.pdf'
  },
  pittwater: {
    lepName: 'Pittwater Local Environmental Plan 2014',
    lepBaseUrl: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0314',
    zoningSchedule: '#sch.2',
    heightSchedule: '#sch.3',
    fsrSchedule: '#sch.4',
    lotSizeSchedule: '#sch.5',
    dcpName: 'Pittwater 21 Development Control Plan',
    dcpUrl:
      'https://eservices.northernbeaches.nsw.gov.au/ePlanning/live/Pages/Plan/Book.aspx?exhibit=PDCP'
  }
};

const WARRINGAH_SUBURBS = [
  'dee why',
  'brookvale',
  'frenchs forest',
  'collaroy',
  'narrabeen',
  'freshwater',
  'manly vale',
  'north curl curl',
  'curl curl',
  'oxford falls',
  'narraweena'
];
const MANLY_SUBURBS = [
  'manly',
  'fairlight',
  'seaforth',
  'queenscliff',
  'balgowlah',
  'balgowlah heights',
  'clontarf'
];
const PITTWATER_SUBURBS = [
  'mona vale',
  'newport',
  'avalon',
  'avalon beach',
  'bilgola',
  'bilgola plateau',
  'palm beach',
  'bayview',
  'warriewood',
  'inga road',
  'church point'
];

function resolveLegacyPlan(address: string): LegacyPlan {
  const normalised = address.toLowerCase();
  if (WARRINGAH_SUBURBS.some((suburb) => normalised.includes(suburb))) {
    return LEGACY_PLANS.warringah;
  }
  if (MANLY_SUBURBS.some((suburb) => normalised.includes(suburb))) {
    return LEGACY_PLANS.manly;
  }
  if (PITTWATER_SUBURBS.some((suburb) => normalised.includes(suburb))) {
    return LEGACY_PLANS.pittwater;
  }
  return LEGACY_PLANS.warringah;
}

function toWebMercator(lon: number, lat: number) {
  const x = (lon * 20037508.34) / 180;
  const yRad = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  const y = (yRad * 20037508.34) / 180;
  return { x, y };
}

function computePolygonArea(points: Array<{ x: number; y: number }>) {
  let area = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const { x: x1, y: y1 } = points[i];
    const { x: x2, y: y2 } = points[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function formatMeters(value: number) {
  return `${value.toFixed(1)} m`;
}

function maybeFormatArea(area?: number | null) {
  if (!area || !Number.isFinite(area)) {
    return null;
  }
  if (area >= 10000) {
    const hectares = area / 10000;
    return `${hectares.toFixed(2)} ha (approx)`;
  }
  return `${area.toFixed(0)} m^2 (approx)`;
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

type TodBand = 'inner' | 'outer';

type ArcGisFeature<T> = {
  attributes: T;
  geometry?: {
    rings?: Array<Array<[number, number]>>;
  };
};

type TodAreaAttributes = {
  MAP_NAME?: string;
  LAY_CLASS?: string;
  LABEL?: string;
  PRECINCT?: string;
};

type TownCentreAttributes = {
  LABEL?: string;
  LAY_CLASS?: string;
  MAP_NAME?: string;
};

type TodLocationalInsights = {
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
    band: TodBand | null;
  } | null;
};

const EMPTY_TOD_INSIGHTS: TodLocationalInsights = {
  todArea: { isWithin: false, label: null, className: null, mapName: null },
  acceleratedPrecinct: { isWithin: false, label: null, mapName: null },
  deferredArea: { isWithin: false, label: null, mapName: null },
  nearestTownCentre: null
};

function isPointInRing(lon: number, lat: number, ring: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      (yi > lat) !== (yj > lat) &&
      lon <
        ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonCentroid(rings: Array<Array<[number, number]>> | undefined) {
  if (!rings || rings.length === 0) {
    return null;
  }

  const ring = rings[0];
  if (!ring || ring.length === 0) {
    return null;
  }

  let sumLon = 0;
  let sumLat = 0;
  let count = 0;
  const limit = ring.length > 1 ? ring.length - 1 : ring.length;
  for (let i = 0; i < limit; i += 1) {
    const [lon, lat] = ring[i];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      continue;
    }
    sumLon += lon;
    sumLat += lat;
    count += 1;
  }

  if (count === 0) {
    return null;
  }

  return { longitude: sumLon / count, latitude: sumLat / count };
}

function distanceToRingsMeters(
  latitude: number,
  longitude: number,
  rings: Array<Array<[number, number]>> | undefined
) {
  if (!rings || rings.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    if (!ring || ring.length < 3) {
      continue;
    }

    if (isPointInRing(longitude, latitude, ring)) {
      return 0;
    }

    for (const [ringLon, ringLat] of ring) {
      if (!Number.isFinite(ringLon) || !Number.isFinite(ringLat)) {
        continue;
      }
      const distance = haversineDistanceMeters(
        latitude,
        longitude,
        ringLat,
        ringLon
      );
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
  }

  return minDistance;
}

async function querySeppHousingLayer<T>(
  layerId: number,
  params: Record<string, string>
): Promise<{ features?: Array<ArcGisFeature<T>> } | null> {
  const baseParams = new URLSearchParams({ f: 'json', ...params });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${SEPP_HOUSING_MAPSERVER}/${layerId}/query?${baseParams.toString()}`,
      { signal: controller.signal }
    );
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      features?: Array<ArcGisFeature<T>>;
    };
    return json;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTodInsights(
  latitude?: number,
  longitude?: number
): Promise<TodLocationalInsights> {
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return EMPTY_TOD_INSIGHTS;
  }

  const pointGeometry = JSON.stringify({
    x: longitude,
    y: latitude,
    spatialReference: { wkid: 4326 }
  });

  const pointQueryParams = {
    geometry: pointGeometry,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'MAP_NAME,LAY_CLASS,LABEL,PRECINCT',
    returnGeometry: 'false'
  };

  const [todAreaResponse, acceleratedResponse, deferredResponse] =
    await Promise.all([
      querySeppHousingLayer<TodAreaAttributes>(3, pointQueryParams),
      querySeppHousingLayer<TodAreaAttributes>(4, pointQueryParams),
      querySeppHousingLayer<TodAreaAttributes>(5, pointQueryParams)
    ]);

  const todAreaFeature = todAreaResponse?.features?.[0];
  const acceleratedFeature = acceleratedResponse?.features?.[0];
  const deferredFeature = deferredResponse?.features?.[0];

  const envelopeSize = 0.02;
  const envelopeGeometry = JSON.stringify({
    xmin: longitude - envelopeSize,
    xmax: longitude + envelopeSize,
    ymin: latitude - envelopeSize,
    ymax: latitude + envelopeSize,
    spatialReference: { wkid: 4326 }
  });

  const townCentreResponse = await querySeppHousingLayer<TownCentreAttributes>(
    6,
    {
      geometry: envelopeGeometry,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'LABEL,LAY_CLASS,MAP_NAME',
      returnGeometry: 'true',
      outSR: '4326'
    }
  );

  let nearestTownCentre: TodLocationalInsights['nearestTownCentre'] = null;
  const townCentreFeatures = townCentreResponse?.features ?? [];

  if (townCentreFeatures.length > 0) {
    const nearestCandidate = townCentreFeatures
      .map((feature) => {
        const rings = feature.geometry?.rings;
        const centroid = polygonCentroid(rings);
        let straightLineDistance = distanceToRingsMeters(latitude, longitude, rings);
        if (
          !Number.isFinite(straightLineDistance) ||
          straightLineDistance === Number.POSITIVE_INFINITY
        ) {
          straightLineDistance = centroid
            ? haversineDistanceMeters(
                latitude,
                longitude,
                centroid.latitude,
                centroid.longitude
              )
            : Number.POSITIVE_INFINITY;
        }
        return {
          name: feature.attributes.LABEL ?? 'Mapped town centre',
          className: feature.attributes.LAY_CLASS ?? null,
          centroid,
          straightLineDistance
        };
      })
      .filter((item) => Number.isFinite(item.straightLineDistance))
      .sort((a, b) => a.straightLineDistance - b.straightLineDistance)[0];

    if (nearestCandidate) {
      let distanceMeters = nearestCandidate.straightLineDistance;
      const centroid = nearestCandidate.centroid;

      if (
        centroid?.latitude !== undefined &&
        centroid?.longitude !== undefined &&
        Number.isFinite(centroid.latitude) &&
        Number.isFinite(centroid.longitude)
      ) {
        const roadDistance = await fetchRoadDistanceMeters(
          latitude,
          longitude,
          centroid.latitude,
          centroid.longitude
        );
        if (roadDistance !== null && Number.isFinite(roadDistance)) {
          distanceMeters = roadDistance;
        }
      }

      if (distanceMeters <= 1500) {
        const band: TodBand | null =
          distanceMeters <= 400 ? 'inner' : distanceMeters <= 800 ? 'outer' : null;
        nearestTownCentre = {
          name: nearestCandidate.name,
          className: nearestCandidate.className,
          distanceMeters,
          band
        };
      }
    }
  }

  return {
    todArea: {
      isWithin: Boolean(todAreaFeature),
      label:
        todAreaFeature?.attributes.LABEL ??
        todAreaFeature?.attributes.PRECINCT ??
        null,
      className: todAreaFeature?.attributes.LAY_CLASS ?? null,
      mapName: todAreaFeature?.attributes.MAP_NAME ?? null
    },
    acceleratedPrecinct: {
      isWithin: Boolean(acceleratedFeature),
      label:
        acceleratedFeature?.attributes.LABEL ??
        acceleratedFeature?.attributes.PRECINCT ??
        null,
      mapName: acceleratedFeature?.attributes.MAP_NAME ?? null
    },
    deferredArea: {
      isWithin: Boolean(deferredFeature),
      label:
        deferredFeature?.attributes.LABEL ??
        deferredFeature?.attributes.PRECINCT ??
        null,
      mapName: deferredFeature?.attributes.MAP_NAME ?? null
    },
    nearestTownCentre
  };
}

async function fetchRoadDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const coordinates = `${fromLongitude},${fromLatitude};${toLongitude},${toLatitude}`;
    const url = `${OSRM_ROUTE_ENDPOINT}/${coordinates}?overview=false&annotations=distance`;
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      routes?: Array<{ distance?: number }>;
    };
    const distance = data.routes?.[0]?.distance;
    return typeof distance === 'number' && Number.isFinite(distance) ? distance : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLandZoning(
  latitude?: number,
  longitude?: number
): Promise<{ label?: string; className?: string; epiName?: string; commencedDate?: number } | null> {
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const params = new URLSearchParams({
    f: 'json',
    geometry: `${longitude},${latitude}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'LABEL,LAY_CLASS,EPI_NAME,COMMENCED_DATE',
    returnGeometry: 'false'
  });

  try {
    const response = await fetch(`${LAND_ZONING_ENDPOINT}?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      features?: Array<{ attributes?: LandZoningAttributes }>;
    };
    const attributes = json.features?.[0]?.attributes;
    if (!attributes) {
      return null;
    }
    return {
      label: attributes.LABEL ?? undefined,
      className: attributes.LAY_CLASS ?? undefined,
      epiName: attributes.EPI_NAME ?? undefined,
      commencedDate: attributes.COMMENCED_DATE ?? undefined
    };
  } catch {
    return null;
  }
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url =
      `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=` +
      encodeURIComponent(address);
    const response = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
      signal: controller.signal
    });

    if (!response.ok) {
      return {};
    }

    const json = (await response.json()) as Array<{ lat?: string; lon?: string }>;

    if (!Array.isArray(json) || json.length === 0) {
      return {};
    }

    const candidate = json[0];
    const latitude = candidate.lat ? Number.parseFloat(candidate.lat) : undefined;
    const longitude = candidate.lon ? Number.parseFloat(candidate.lon) : undefined;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {};
    }

    const mapPreviewUrl = buildFallbackStaticMap(latitude, longitude);

    return { latitude, longitude, mapPreviewUrl };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchParcelSummary(
  latitude?: number,
  longitude?: number
): Promise<ParcelSummary | null> {
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const params = new URLSearchParams({
      f: 'json',
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      returnGeometry: 'true',
      outFields: 'LOTNUMBER,PLANLABEL,LOT_DP,PLANLOTAREA'
    });
    params.set('geometry', JSON.stringify({ x: longitude, y: latitude }));

    const response = await fetch(`${LOT_SEARCH_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      features?: Array<{
        attributes?: {
          LOTNUMBER?: string;
          PLANLABEL?: string;
          LOT_DP?: string;
          PLANLOTAREA?: number;
        };
        geometry?: { rings?: ArcGisRing[] };
      }>;
    };

    const feature = data.features?.[0];
    if (!feature) {
      return null;
    }

    const lotNumber = feature.attributes?.LOTNUMBER;
    const planLabel = feature.attributes?.PLANLABEL ?? feature.attributes?.LOT_DP;
    const lotPlan = lotNumber && planLabel ? `Lot ${lotNumber} ${planLabel}` : planLabel ?? undefined;

    const rings = feature.geometry?.rings;
    if (!rings || rings.length === 0) {
      return {
        frontageMeters: 0,
        depthMeters: 0,
        areaSquareMeters: feature.attributes?.PLANLOTAREA ?? null,
        lotPlan,
        centroidLatitude: undefined,
        centroidLongitude: undefined
      };
    }

    const firstRing = rings[0];
    const mercatorPoints = firstRing.map(([lon, lat]) => toWebMercator(lon, lat));
    const areaSquareMeters = computePolygonArea(mercatorPoints);
    const centroid = polygonCentroid(rings);

    const [minX, maxX] = [
      Math.min(...firstRing.map(([lon]) => lon)),
      Math.max(...firstRing.map(([lon]) => lon))
    ];
    const [minY, maxY] = [
      Math.min(...firstRing.map(([, lat]) => lat)),
      Math.max(...firstRing.map(([, lat]) => lat))
    ];
    const frontageMeters = haversineDistanceMeters(minY, minX, minY, maxX);
    const depthMeters = haversineDistanceMeters(minY, minX, maxY, minX);

    return {
      frontageMeters,
      depthMeters,
      areaSquareMeters,
      lotPlan,
      centroidLatitude: centroid?.latitude,
      centroidLongitude: centroid?.longitude
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkStreetViewAvailability(
  latitude?: number,
  longitude?: number
) {
  if (
    latitude === undefined ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !GOOGLE_MAPS_KEY
  ) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      key: GOOGLE_MAPS_KEY
    });
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?${params.toString()}`,
      { signal: controller.signal }
    );
    if (!response.ok) {
      return false;
    }
    const metadata = (await response.json()) as { status?: string };
    return metadata.status === 'OK';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { ok: false, error: 'Missing address parameter' },
      { status: 400 }
    );
  }

  try {
    const geocode = await geocodeAddress(address);
    const geocodeLatitude =
      geocode.latitude !== undefined && Number.isFinite(geocode.latitude)
        ? geocode.latitude
        : undefined;
    const geocodeLongitude =
      geocode.longitude !== undefined && Number.isFinite(geocode.longitude)
        ? geocode.longitude
        : undefined;

    const lookupLatitude = geocodeLatitude ?? DEFAULT_COORDINATES.latitude;
    const lookupLongitude = geocodeLongitude ?? DEFAULT_COORDINATES.longitude;

    const parcelSummary = await fetchParcelSummary(lookupLatitude, lookupLongitude);

    const parcelLatitude =
      parcelSummary?.centroidLatitude !== undefined &&
      Number.isFinite(parcelSummary.centroidLatitude)
        ? parcelSummary.centroidLatitude
        : lookupLatitude;
    const parcelLongitude =
      parcelSummary?.centroidLongitude !== undefined &&
      Number.isFinite(parcelSummary.centroidLongitude)
        ? parcelSummary.centroidLongitude
        : lookupLongitude;

    const mapLatitude = parcelLatitude ?? geocodeLatitude ?? DEFAULT_COORDINATES.latitude;
    const mapLongitude = parcelLongitude ?? geocodeLongitude ?? DEFAULT_COORDINATES.longitude;

    const streetViewLatitude =
      geocodeLatitude ?? parcelLatitude ?? DEFAULT_COORDINATES.latitude;
    const streetViewLongitude =
      geocodeLongitude ?? parcelLongitude ?? DEFAULT_COORDINATES.longitude;

    const siteMapPreviewUrl = buildFallbackStaticMap(mapLatitude, mapLongitude);

    const streetViewAvailable = await checkStreetViewAvailability(
      streetViewLatitude,
      streetViewLongitude
    );

    const zoningInfo = await fetchLandZoning(parcelLatitude, parcelLongitude);
    const legacyPlan = resolveLegacyPlan(address);
    const lepUrl = (fragment?: string) => `${legacyPlan.lepBaseUrl}${fragment ?? ''}`;
    const zoneDisplayName = zoningInfo?.label
      ? zoningInfo.className
        ? `${zoningInfo.className} (${zoningInfo.label})`
        : zoningInfo.label
      : 'Low Density Residential (R2)';

    const metrics = [
      {
        id: 'zoning',
        label: 'Zone',
        value: zoneDisplayName,
        linkLabel: `${legacyPlan.lepName} - Land Use Table`,
        linkUrl: lepUrl()
      },
      {
        id: 'height',
        label: 'Height of Buildings (HOB)',
        value: '8.5 metres',
        linkLabel: `${legacyPlan.lepName} - Height of Buildings Map`,
        linkUrl: lepUrl(legacyPlan.heightSchedule)
      },
      {
        id: 'fsr',
        label: 'Floor Space Ratio (FSR)',
        value: '0.5:1',
        linkLabel: `${legacyPlan.lepName} - Floor Space Ratio Map`,
        linkUrl: lepUrl(legacyPlan.fsrSchedule)
      },
      {
        id: 'lot',
        label: 'Minimum Lot Size',
        value: '600 square metres',
        linkLabel: `${legacyPlan.lepName} - Lot Size Map`,
        linkUrl: lepUrl(legacyPlan.lotSizeSchedule)
      }
    ];

    if (parcelSummary) {
      metrics.push(
        {
          id: 'frontage',
          label: 'Approx. Parcel Frontage',
          value: formatMeters(parcelSummary.frontageMeters),
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        },
        {
          id: 'depth',
          label: 'Approx. Parcel Depth',
          value: formatMeters(parcelSummary.depthMeters),
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        }
      );
      const areaLabel = maybeFormatArea(parcelSummary.areaSquareMeters);
      if (areaLabel) {
        metrics.push({
          id: 'area',
          label: 'Parcel Area',
          value: areaLabel,
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        });
      }
    }

    const dataSources = [
      {
        label: `${legacyPlan.lepName} - Land Zoning Maps`,
        url: lepUrl(legacyPlan.zoningSchedule)
      },
      {
        label: 'State Environmental Planning Policy (Housing) 2021',
        url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643'
      },
      {
        label: 'State Environmental Planning Policy (Exempt and Complying Development Codes) 2008',
        url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572'
      }
    ];

    if (parcelSummary) {
      dataSources.push({
        label: 'NSW LotSearch (Common/LotSearch)',
        url: LOT_SEARCH_DATASHEET
      });
    }
    if (zoningInfo?.epiName) {
      dataSources.unshift({
        label: `${zoningInfo.epiName} - Land Zoning Map`,
        url: 'https://www.planningportal.nsw.gov.au/spatialviewer/'
      });
    }

    const locationalInsights = await fetchTodInsights(parcelLatitude, parcelLongitude);
    dataSources.push({
      label: 'SEPP Housing 2021 - Transport Oriented Development mapping',
      url: SEPP_HOUSING_MAPSERVER
    });

    const guidelineLinks = [
      { label: legacyPlan.lepName, url: legacyPlan.lepBaseUrl },
      {
        label: legacyPlan.dcpName,
        url: legacyPlan.dcpUrl
      },
      {
        label: 'SEPP (Exempt and Complying Development Codes) 2008',
        url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572'
      },
      {
        label: 'SEPP (Housing) 2021',
        url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643'
      },
      {
        label: 'Apartment Design Guide (2023)',
        url: 'https://www.planning.nsw.gov.au/sites/default/files/2023-03/apartment-design-guide.pdf'
      },
      {
        label: 'NSW Low and Mid-Rise Housing Design Guide (Draft 2024)',
        url: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy'
      }
    ];

    const nearestTownCentre = locationalInsights.nearestTownCentre;
    const todBand =
      locationalInsights.todArea.isWithin
        ? 'Inner'
        : locationalInsights.acceleratedPrecinct.isWithin || locationalInsights.deferredArea.isWithin
          ? 'Outer'
          : 'N/A';
    const todLabel =
      locationalInsights.todArea.label ??
      locationalInsights.acceleratedPrecinct.label ??
      locationalInsights.deferredArea.label ??
      'Transport Oriented Development area';

    const townCentreBand =
      nearestTownCentre?.band === 'inner'
        ? 'Inner'
        : nearestTownCentre?.band === 'outer'
          ? 'Outer'
          : 'N/A';
    const townCentreName =
      nearestTownCentre?.name ?? 'No mapped town centre within 1.5 km';
    const isTodInner = todBand === 'Inner';
    const isTodOuter = todBand === 'Outer';
    const isLmrBand = isTodInner || isTodOuter;
    const lmrImprovementSummary = isLmrBand
      ? `Housing SEPP Low and Mid-Rise ${todBand.toLowerCase()} band unlocks uplift when Development Applications demonstrate design excellence and frontage >=21 m.`
      : 'Outside Housing SEPP Low and Mid-Rise mapping. Uplift relies on town centre programs or planning proposals.';

    const frontageApprox =
      parcelSummary && Number.isFinite(parcelSummary.frontageMeters) && parcelSummary.frontageMeters > 0
        ? `${formatMeters(parcelSummary.frontageMeters)} frontage (approx)`
        : 'approx. 15 m frontage (Codes SEPP Part 3A minimum)';
    const depthApprox =
      parcelSummary && Number.isFinite(parcelSummary.depthMeters) && parcelSummary.depthMeters > 0
        ? `${formatMeters(parcelSummary.depthMeters)} depth (approx)`
        : 'Depth supports dual occupancy envelope';
    const areaApprox =
      maybeFormatArea(parcelSummary?.areaSquareMeters) ?? '>=600 m^2 (LEP minimum lot size)';
    const frontage21mSatisfied =
      parcelSummary !== null &&
      parcelSummary?.frontageMeters !== undefined &&
      Number.isFinite(parcelSummary.frontageMeters) &&
      parcelSummary.frontageMeters >= 21;

    const lmrContextSummary =
      todBand !== 'N/A'
        ? `${todBand} Transport Oriented Development (TOD) band (${todLabel}) identified in Housing SEPP (Feb 2025).`
        : townCentreBand !== 'N/A'
          ? `${townCentreBand} band for ${townCentreName} under Housing SEPP town centre mapping.`
          : 'Outside February 2025 Transport Oriented Development and town centre release areas.';

    const lmrZoneCompatibility =
      todBand !== 'N/A'
        ? 'Housing SEPP Low and Mid-Rise controls apply with design excellence, frontage >=21 m, deep soil and active transport upgrades.'
        : townCentreBand !== 'N/A'
          ? `Town centre ${townCentreBand.toLowerCase()} band enables low/mid-rise housing with frontage >=21 m, ADG compliance, and public domain uplift.`
          : 'Apartments require a planning proposal or rezoning to secure Housing SEPP Low and Mid-Rise (LMR) mapping before progressing.';

    const todNextStep =
      todBand !== 'N/A'
        ? 'Engage the NSW Planning Transport Oriented Development (TOD) delivery program to confirm frontage, infrastructure, and design excellence milestones.'
        : townCentreBand !== 'N/A'
          ? `Confirm ${townCentreBand.toLowerCase()} band requirements for ${townCentreName}, including parking, deep soil, and ADG compliance.`
          : 'Monitor Housing SEPP updates and prepare a planning proposal to unlock Transport Oriented Development (TOD) or town centre uplift.';

    const townCentreSummary =
      nearestTownCentre
        ? `${nearestTownCentre.name} at ~${Math.round(nearestTownCentre.distanceMeters)} m (${townCentreBand === 'N/A' ? 'outside mapped bands' : `${townCentreBand.toLowerCase()} band`}).`
        : 'Nearest mapped town centre is more than 1.5 km away.';

    const todNonDiscretionaryNote =
      isLmrBand
        ? 'Housing SEPP non-discretionary standards apply to inner/outer Transport Oriented Development bands (frontage >=21 m, height 13 m baseline, deep soil and active transport thresholds).'
        : null;
    const townCentreNonDiscretionaryNote =
      townCentreBand !== 'N/A'
        ? 'Housing SEPP town centre non-discretionary standards apply to mapped inner/outer bands once frontage >=21 m and design excellence benchmarks are satisfied.'
        : null;

    const planningOptions = [
      {
        slug: 'lmr-tod',
        title: 'Low and Mid-Rise (LMR) - Transport Oriented Development (TOD)',
        category: 'lmr',
        status: isLmrBand ? 'permitted' : 'prohibited',
        permissibility:
          todBand === 'N/A'
            ? 'Outside Transport Oriented Development mapping'
            : `Housing SEPP Transport Oriented Development (TOD) ${todBand.toLowerCase()} band (${todLabel})`,
        isPermitted: todBand !== 'N/A',
        rationale:
          todBand === 'N/A'
            ? 'Transport Oriented Development (TOD) uplift is not available until Housing SEPP mapping commences or a planning proposal is progressed.'
            : 'Housing SEPP Transport Oriented Development (TOD) mapping enables low and mid-rise apartments subject to frontage, design excellence, and infrastructure upgrades.',
        zoneCompatibility: lmrZoneCompatibility,
        governingFactors: [
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'LMR uplift', value: `${todBand} band bonuses available`, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Transport Oriented Development (TOD) label', value: todLabel, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Frontage', value: '>=21 m (Housing SEPP Transport Oriented Development (TOD) baseline)', source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Floor Space Ratio (FSR) baseline', value: '1.0:1 (Housing SEPP draft control)', source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Height baseline', value: '13 m (4 storeys) prior to bonuses', source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Minimum lot size', value: areaApprox, source: { label: `${legacyPlan.lepName} - Lot Size Map`, url: lepUrl(legacyPlan.lotSizeSchedule) } }
        ],
        constraints: [
          'Prepare design excellence and ADG compliance evidence covering solar access, cross ventilation, and deep soil.',
          'Submit an infrastructure servicing strategy aligning with NSW Planning Transport Oriented Development (TOD) delivery milestones.',
          'Plan for affordable housing contributions or Voluntary Planning Agreement (VPA) to capture uplift.'
        ],
        envelopeHint:
          'Four-to-six storey apartment building stepping to neighbourhood interface with deep soil and active frontage to the Transport Oriented Development (TOD) street network.',
        fsrHeightBonuses: [
          {
            label: 'Design excellence uplift',
            fsr: 'Up to 1.2:1',
            height: '18 m (6 storeys)',
            trigger: 'Design excellence panel endorsement and public domain upgrades.'
          },
          {
            label: 'Infill affordable housing bonus',
            fsr: 'Up to 1.15:1',
            height: '16 m',
            trigger: 'Deliver >=15% infill affordable dwellings under Housing SEPP Part 2 Division 4.'
          }
        ],
        notes: [
          lmrContextSummary,
          `Town centre context: ${townCentreBand === 'N/A' ? 'outside mapped bands' : `${townCentreBand} band for ${townCentreName}`}.`,
          'Coordinate Transport Oriented Development (TOD) program engagement early to confirm staging windows and parking rate variations.',
          ...(todNonDiscretionaryNote ? [todNonDiscretionaryNote] : [])
        ],
        clauses: [
          {
            label: 'Housing SEPP 2021 - Part 2 Division 4 Low and Mid-Rise Housing',
            url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.4'
          },
          {
            label: 'Apartment Design Guide (2023)',
            url: 'https://www.planning.nsw.gov.au/sites/default/files/2023-03/apartment-design-guide.pdf'
          }
        ]
      },
      {
        slug: 'lmr-affordable-100',
        title: 'Low and Mid-Rise (LMR) - 100% Affordable Housing Bonus',
        category: 'hda',
        status: isLmrBand ? 'permitted' : townCentreBand !== 'N/A' ? 'conditional' : 'prohibited',
        permissibility:
          todBand !== 'N/A'
            ? `Housing SEPP Transport Oriented Development (TOD) ${todBand.toLowerCase()} band – 100% affordable`
            : townCentreBand !== 'N/A'
              ? `Housing SEPP town centre ${townCentreBand.toLowerCase()} band – 100% affordable`
              : 'Requires rezoning or Housing SEPP pathway for 100% affordable housing',
        isPermitted: isLmrBand || townCentreBand !== 'N/A',
        rationale:
          'Housing SEPP enables additional uplift where the development is 100% affordable housing managed by a registered community housing provider.',
        zoneCompatibility:
          isLmrBand || townCentreBand !== 'N/A'
            ? 'Eligible within Transport Oriented Development (TOD) or town centre bands subject to frontage, tenure, and design excellence.'
            : 'Outside mapped uplift areas a planning proposal or SEPP amendment is required.',
        governingFactors: [
          { label: 'Affordable housing tenure', value: '100% managed by registered CHP (Housing SEPP cl. 97)', source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Minimum frontage', value: '>=21 m with active frontage and deep soil', source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'LMR uplift', value: `${todBand} band bonuses available`, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Town centre band', value: townCentreBand, source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          { label: 'Design excellence', value: 'Mandatory design review and excellence pathway', source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } }
        ],
        constraints: [
          'Registered community housing provider to control the scheme for at least 15 years.',
          'Prepare affordable housing management plan and funding strategy.',
          'Demonstrate infrastructure servicing, transport integration, and reduced parking ratios aligned with TOD targets.'
        ],
        envelopeHint:
          'Six to eight storey apartment building with podium activation and community facilities integrated at ground level.',
        fsrHeightBonuses: [
          {
            label: '100% affordable housing bonus',
            fsr: 'Up to 1.5:1',
            height: '21 m',
            trigger: 'Deliver 100% affordable dwellings under Housing SEPP Part 2 Division 4 Subdivision 2.'
          }
        ],
        notes: [
          'Engage NSW Land and Housing Corporation or Community Housing Providers early to secure tenure commitments.',
          'Leverage state or federal financing instruments (HAFF, NHFIC) to maintain affordability.',
          ...(todNonDiscretionaryNote ? [todNonDiscretionaryNote] : []),
          ...(townCentreNonDiscretionaryNote ? [townCentreNonDiscretionaryNote] : []),
          lmrImprovementSummary
        ],
        clauses: [
          {
            label: 'Housing SEPP 2021 - Part 2 Division 4 Subdivision 2',
            url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.4-subdiv.2'
          },
          {
            label: 'Apartment Design Guide (2023)',
            url: 'https://www.planning.nsw.gov.au/sites/default/files/2023-03/apartment-design-guide.pdf'
          }
        ]
      },
      {
        slug: 'lmr-town-centre',
        title: 'Low and Mid-Rise (LMR) - Town Centre',
        category: 'lmr',
        status: isLmrBand ? 'permitted' : townCentreBand !== 'N/A' ? 'conditional' : 'prohibited',
        permissibility:
          townCentreBand === 'N/A'
            ? 'Outside Housing SEPP town centre bands'
            : `Housing SEPP town centre ${townCentreBand.toLowerCase()} band (${townCentreName})`,
        isPermitted: townCentreBand !== 'N/A',
        rationale:
          townCentreBand === 'N/A'
            ? 'Town centre uplift not yet mapped - requires rezoning or Transport Oriented Development (TOD) program inclusion.'
            : 'Town centre mapping permits Low and Mid-Rise (LMR) testing with ADG compliance, frontage, and public domain upgrades.',
        zoneCompatibility:
          townCentreBand !== 'N/A'
            ? `Requires >=21 m frontage, active ground plane, and ADG compliance to support ${townCentreBand.toLowerCase()} band uplift for ${townCentreName}.`
            : 'Outside mapped town centre - merit Development Application (DA) or planning proposal required.',
        governingFactors: [
          { label: 'Town centre', value: townCentreName, source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          { label: 'Town centre band', value: townCentreBand, source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          { label: 'Frontage', value: '>=21 m (Housing SEPP town centre baseline)', source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          { label: 'Height baseline', value: '13 m (4 storeys) with design excellence uplift', source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          { label: 'Floor Space Ratio (FSR) baseline', value: '1.0:1 (subject to ADG compliance)', source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'LMR uplift', value: `${todBand} band bonuses available`, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } }
        ],
        constraints: [
          'Provide town centre design response with active frontage and public domain upgrades.',
          'Address ADG performance for solar access, apartment mix, deep soil, and car parking.',
          'Coordinate traffic, flood, and infrastructure evidence with Northern Beaches Council and NSW Planning.'
        ],
        envelopeHint:
          'Mixed-use podium with upper level apartments responding to town centre setbacks and pedestrian realm upgrades.',
        fsrHeightBonuses: [
          {
            label: 'Design excellence bonus',
            fsr: 'Up to 1.15:1',
            height: '15 m',
            trigger: 'Achieve design excellence endorsement and town centre place-making outcomes.'
          }
        ],
        notes: [
          `Engage town centre place planning teams to align uplift with ${townCentreName} structure planning.`,
          'Active transport integration and reduced parking ratios may be supported with mode shift evidence.',
          'Layer Transport Oriented Development (TOD) engagement if Transport Oriented Development (TOD) mapping activates in addition to the town centre band.',
          ...(townCentreNonDiscretionaryNote ? [townCentreNonDiscretionaryNote] : []),
          lmrImprovementSummary
        ],
        clauses: [
          {
            label: 'Housing SEPP 2021 - Town Centre Housing',
            url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643'
          },
          {
            label: 'Apartment Design Guide (2023)',
            url: 'https://www.planning.nsw.gov.au/sites/default/files/2023-03/apartment-design-guide.pdf'
          }
        ]
      },
      {
        slug: 'cdc-duplex',
        title: 'Complying Development Certificate (CDC) - Duplex',
        category: 'cdc',
        status: 'permitted',
        permissibility: 'Codes SEPP Part 3A Dual Occupancies',
        isPermitted: true,
        rationale:
          'Frontage and area satisfy Codes SEPP Part 3A enabling a complying development duplex subject to bushfire and flood certification where the local zoning permits dual occupancies.',
        zoneCompatibility:
          'Duplex complying development supported where the LEP minimum lot size and frontage are met and hazards managed.',
        governingFactors: [
          { label: 'Setbacks', value: 'Front 6 m, side 0.9 m, rear 3 m (Codes SEPP 3A)', source: { label: 'Codes SEPP Part 3A', url: CODES_SEPP_PART3A_URL } },
          { label: 'Height', value: '8.5 m (LEP) / 2 storeys (Codes SEPP)', source: { label: 'Codes SEPP Part 3B', url: CODES_SEPP_PART3B_URL } },
          { label: 'Floor Space Ratio (FSR)', value: '0.5:1 mapped', source: { label: `${legacyPlan.lepName} - FSR Map`, url: lepUrl(legacyPlan.fsrSchedule) } },
          { label: 'Minimum lot size', value: '600 m^2 (LEP standard)', source: { label: `${legacyPlan.lepName} - Lot Size Map`, url: lepUrl(legacyPlan.lotSizeSchedule) } },
          { label: 'Frontage', value: frontageApprox, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'LMR uplift', value: `${todBand} band bonuses available`, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } }
        ],
        constraints: [
          'Provide bushfire, flood, and engineering certificates prior to Complying Development Certificate (CDC) issue.',
          'Demonstrate Building Height Plane compliance and privacy interface under DCP controls.',
          'Driveway gradients and sight lines to satisfy AS2890 requirements.'
        ],
        envelopeHint:
          'Two storey attached dwellings with articulated facade, 6 m landscaped front setback, and private open space to the rear.',
        fsrHeightBonuses: [
          {
            label: 'Clause 1.15(4) design flexibility',
            fsr: 'Minor Floor Space Ratio (FSR) variation via articulation',
            height: 'Up to 9 m ridge with design evidence',
            trigger: 'Demonstrate negligible amenity impact and compliance with National Construction Code (NCC).'
          }
        ],
        notes: [
          `${legacyPlan.dcpName} controls apply to landscaped area, parking, and private open space.`,
          'Document Building Sustainability Index (BASIX), stormwater, and driveway compliance early to avoid Complying Development Certificate (CDC) deferrals.',
          'Consider Development Application (DA) pathway if significant variations or third-party impacts emerge.'
        ],
        clauses: [
          {
            label: 'Codes SEPP 2008 - Part 3A Dual Occupancies',
            url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572#pt.3A'
          },
          {
            label: `${legacyPlan.dcpName} - Dual Occupancy Controls`,
            url: legacyPlan.dcpUrl
          }
        ]
      },
      {
        slug: 'cdc-terraces',
        title: 'Complying Development Certificate (CDC) - Terraces',
        category: 'cdc',
        status: frontage21mSatisfied ? 'conditional' : 'prohibited',
        permissibility: 'Codes SEPP Part 3B Terraces (subject to frontage)',
        isPermitted: frontage21mSatisfied,
        rationale:
          'Codes SEPP Part 3B supports terrace housing where usable frontage >=21 m and hazards are managed. Site width should be validated via survey.',
        zoneCompatibility:
          'Terrace Complying Development Certificate (CDC) can proceed where the zoning permits multi dwelling housing and frontage and services support up to three dwellings meeting Part 3B envelope.',
        governingFactors: [
          { label: 'Frontage requirement', value: '>=21 m (Part 3B cl. 3B.4)', source: { label: 'Codes SEPP Part 3B', url: CODES_SEPP_PART3B_URL } },
          { label: 'Minimum lot size', value: 'No explicit minimum; >600 m^2 preferred', source: { label: `${legacyPlan.lepName} - Lot Size Map`, url: lepUrl(legacyPlan.lotSizeSchedule) } },
          { label: 'Setbacks', value: 'Front 5 m, rear 6 m, shared party wall (Codes SEPP 3B)', source: { label: 'Codes SEPP Part 3B', url: CODES_SEPP_PART3B_URL } },
          { label: 'Height', value: '8.5 m (LEP) / 2 storeys (Codes SEPP)', source: { label: 'Codes SEPP Part 3B', url: CODES_SEPP_PART3B_URL } },
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'LMR uplift', value: `${todBand} band bonuses available`, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Depth', value: depthApprox }
        ],
        constraints: [
          'Survey frontage to confirm >=21 m clear of truncations or easements.',
          'Provide party wall acoustic, National Construction Code (NCC) fire separation, and stormwater design for terrace modules.',
          'Complying Development Certificate (CDC) excludes lots mapped for high bushfire unless an alternate solution demonstrates compliance.'
        ],
        envelopeHint:
          'Row of two or three terrace dwellings with shared party walls, landscaped front setback, and rear lane or driveway access.',
        fsrHeightBonuses: [
          {
            label: 'Design solution flexibility',
            fsr: 'Up to ~0.65:1 with articulation',
            height: 'Maintain 8.5 m, parapet 7.2 m',
            trigger: 'Demonstrate overshadowing and privacy compliance.'
          }
        ],
        notes: [
          'Terrace Complying Development Certificate (CDC) is sensitive to frontage - confirm survey prior to documentation.',
          'Public domain crossover rationalisation may be required where multiple garages are proposed.',
          'Consider Development Application (DA) if flood, bushfire, or frontage variations exceed Complying Development Certificate (CDC) tolerances.'
        ],
        clauses: [
          {
            label: 'Codes SEPP 2008 - Part 3B Housing',
            url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572#pt.3B'
          },
          {
            label: `${legacyPlan.dcpName} - Low Density Controls`,
            url: legacyPlan.dcpUrl
          }
        ]
      },
      {
        slug: 'da-duplex',
        title: 'Development Application (DA) - Duplex',
        category: 'da',
        status: isLmrBand ? 'permitted' : 'conditional',
        permissibility: `${legacyPlan.lepName} - Dual Occupancy (with consent)`,
        isPermitted: true,
        rationale:
          'Development Application (DA) pathway supports bespoke dual occupancy outcomes where Complying Development Certificate (CDC) triggers cannot be met (flood, bushfire, frontage variations, or design response).',
        zoneCompatibility:
          'Dual occupancy (attached) permissible subject to merit assessment, clause 4.6 requests, and Development Control Plan (DCP) performance benchmarks.',
        governingFactors: [
          { label: 'Setbacks', value: 'Front 6 m, side 1.2 m, rear 6 m (DCP performance)', source: { label: legacyPlan.dcpName, url: legacyPlan.dcpUrl } },
          { label: 'Height', value: '8.5 m mapped (Clause 4.3)', source: { label: `${legacyPlan.lepName} - Clause 4.3`, url: lepUrl('#cl.4.3') } },
          { label: 'Floor Space Ratio (FSR)', value: '0.5:1 (Clause 4.4)', source: { label: `${legacyPlan.lepName} - Clause 4.4`, url: lepUrl('#cl.4.4') } },
          { label: 'Minimum lot size', value: '600 m^2 (Clause 4.1C)', source: { label: `${legacyPlan.lepName} - Clause 4.1C`, url: lepUrl('#cl.4.1C') } },
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          (isLmrBand
            ? {
                label: 'LMR uplift',
                value: `${todBand} band bonuses available`,
                note: 'Design excellence and frontage >=21 m unlock taller and denser outcomes.',
                source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL }
              }
            : { label: 'LMR uplift', value: 'Unavailable (outside LMR mapping)' }),
          { label: 'Frontage', value: frontageApprox, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } }
        ],
        constraints: [
          'Clause 4.6 variation required where height or Floor Space Ratio (FSR) exceed mapped controls.',
          'Support with flood, bushfire, traffic, and landscaping evidence to address DCP objectives.',
          'Neighbour amenity (privacy, solar access, bulk) to be demonstrated via section analysis.'
        ],
        envelopeHint:
          'Two storey attached form with articulated facade, adaptable parking arrangement, and landscape buffers.',
        fsrHeightBonuses: [
          {
            label: 'Clause 4.6 variation',
            fsr: 'Up to ~0.7:1 with design excellence grounds',
            height: '9.5 m ridge with overshadowing analysis',
            trigger: 'Submit Clause 4.6 request demonstrating sufficient planning grounds.'
          }
        ],
        notes: [
          `${legacyPlan.lepName} Clause 4.6 remains available for justified variations.`,
          'Pre-lodgement with Northern Beaches Council recommended when seeking variations or addressing flood/bushfire risk.',
          'Coordinate consultant studies (stormwater, bushfire, geotechnical) prior to Development Application (DA) lodgement.',
          lmrImprovementSummary
        ],
        clauses: [
          {
            label: `${legacyPlan.lepName} - Clause 4.1C Dual Occupancy`,
            url: lepUrl('#cl.4.1C')
          },
          {
            label: `${legacyPlan.dcpName} - Dual Occupancy Chapter`,
            url: legacyPlan.dcpUrl
          }
        ]
      },
      {
        slug: 'da-terraces',
        title: 'Development Application (DA) - Terraces',
        category: 'da',
        status: frontage21mSatisfied ? 'conditional' : 'prohibited',
        permissibility:
          frontage21mSatisfied
            ? `${legacyPlan.lepName} - Multi dwelling housing (terraces) permissible with consent`
            : 'Frontage <21 m may trigger refusal or require amalgamation',
        isPermitted: frontage21mSatisfied,
        rationale:
          'Merit Development Application (DA) supports terrace or multi-dwelling housing where frontage, deep soil, and parking outcomes achieve DCP performance.',
        zoneCompatibility:
          'Multi dwelling housing is merit-based; terraces must respond to neighbourhood context, landscaping, and parking supply under LEP/DCP.',
        governingFactors: [
          { label: 'Frontage', value: frontageApprox, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Minimum frontage target', value: '>=21 m (DCP performance)', source: { label: legacyPlan.dcpName, url: legacyPlan.dcpUrl } },
          { label: 'Height', value: '8.5 m mapped (Clause 4.3)', source: { label: `${legacyPlan.lepName} - Clause 4.3`, url: lepUrl('#cl.4.3') } },
          { label: 'Floor Space Ratio (FSR)', value: '0.5:1 mapped (Clause 4.4)', source: { label: `${legacyPlan.lepName} - Clause 4.4`, url: lepUrl('#cl.4.4') } },
          { label: 'Parking', value: '2 spaces per dwelling (DCP baseline)', source: { label: legacyPlan.dcpName, url: legacyPlan.dcpUrl } },
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          (isLmrBand
            ? {
                label: 'LMR uplift',
                value: `${todBand} band bonuses available`,
                note: 'Design excellence may lift height to 13 m and FSR to 1.0:1.',
                source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL }
              }
            : { label: 'LMR uplift', value: 'Unavailable (outside LMR mapping)' })
        ],
        constraints: [
          'Provide urban design statement demonstrating compatibility with adjoining low density context.',
          'Address on-site detention, flood, and bushfire resilience for terrace format.',
          'Clause 4.6 may be required if Floor Space Ratio (FSR) uplift is sought to improve layouts.'
        ],
        envelopeHint:
          'Two-storey terrace row with individual entries, private open space, and integrated landscape buffer to the street.',
        fsrHeightBonuses: [
          {
            label: 'Clause 4.6 variation',
            fsr: 'Up to ~0.7:1 with design excellence and amenity testing',
            height: '9.5 m ridge (modulated)',
            trigger: 'Demonstrate overshadowing, privacy, and view loss mitigation.'
          }
        ],
        notes: [
          'Consider site amalgamation if frontage <21 m to de-risk refusal.',
          'Active transport and parking variations easier to justify inside Transport Oriented Development (TOD)/town centre bands.',
          'Conduct design review or pre-lodgement to validate terrace layout with council.',
          lmrImprovementSummary
        ],
        clauses: [
          {
            label: `${legacyPlan.lepName} - Multi Dwelling Housing controls`,
            url: lepUrl()
          },
          {
            label: `${legacyPlan.dcpName} - Multi Dwelling Housing`,
            url: legacyPlan.dcpUrl
          }
        ]
      },
      {
        slug: 'da-apartments',
        title: 'Development Application (DA) - Apartments',
        category: 'da',
        status: todBand !== 'N/A' ? 'permitted' : townCentreBand !== 'N/A' ? 'conditional' : 'prohibited',
        permissibility:
          todBand !== 'N/A'
            ? `Housing SEPP Low and Mid-Rise (Transport Oriented Development (TOD) ${todBand.toLowerCase()} band)`
            : townCentreBand !== 'N/A'
              ? `Housing SEPP town centre ${townCentreBand.toLowerCase()} band`
              : 'Requires rezoning before apartments can be lodged',
        isPermitted: todBand !== 'N/A' || townCentreBand !== 'N/A',
        rationale:
          todBand !== 'N/A'
            ? 'Transport Oriented Development (TOD) mapping supports mid-rise apartments with frontage >=21 m, design excellence, and active transport upgrades.'
            : townCentreBand !== 'N/A'
              ? 'Town centre band enables apartment testing subject to ADG compliance and public domain uplift.'
              : 'Outside Transport Oriented Development (TOD)/town centre mapping, apartments require planning proposal or SEPP amendment.',
        zoneCompatibility: lmrZoneCompatibility,
        governingFactors: [
          { label: 'Transport Oriented Development (TOD) band', value: todBand, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'LMR uplift', value: `${todBand} band bonuses available`, source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL } },
          { label: 'Town centre band', value: townCentreBand, source: { label: 'Housing SEPP Town Centre provisions', url: HOUSING_SEPP_TOWN_CENTRE_URL } },
          {
            label: 'Frontage requirement',
            value: '>=21 m (Housing SEPP baseline)',
            source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL }
          },
          {
            label: 'Height baseline',
            value: '13 m (4 storeys) before bonuses',
            source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL }
          },
          {
            label: 'Floor Space Ratio (FSR) baseline',
            value: '1.0:1 (plus bonuses)',
            source: { label: 'Housing SEPP Part 2 Div 4', url: HOUSING_SEPP_LMR_URL }
          },
          todBand !== 'N/A'
            ? {
                label: 'LMR uplift',
                value: `${todBand} band bonuses available`,
                note: 'Design excellence enables 18 m height and 1.2:1 FSR.',
                source: {
                  label: 'Housing SEPP 2021 - Low and Mid-Rise Housing',
                  url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.4'
                }
              }
            : {
                label: 'LMR uplift',
                value: 'Unavailable (outside LMR mapping)'
              },
          {
            label: 'Housing Diversity Amendment (HDA)',
            value: 'Enable additional uplift once HDA mapping commences',
            source: {
              label: 'NSW Low and Mid-Rise Housing Program',
              url: HOUSING_DIVERSITY_PROGRAM_URL
            }
          },
          {
            label: 'State Significant Development (SSD)',
            value: 'SSD pathway viable when capital investment >=$75m or >100 dwellings',
            source: {
              label: 'State Significant Development - Capital Investment Thresholds',
              url: 'https://www.planning.nsw.gov.au/assess-and-regulate/development-assessment/planning-approval-pathways/state-significant-development'
            }
          }
        ],
        constraints: [
          'Apartment Design Guide compliance across solar access, cross ventilation, deep soil, communal areas, and parking.',
          'Design excellence process required for uplift; consider NSW Design Review Panel engagement.',
          'Coordinate infrastructure and public benefit (Voluntary Planning Agreement (VPA)) offers in line with Transport Oriented Development (TOD) or town centre expectations.'
        ],
        envelopeHint:
          'Mid-rise apartment building (4-6 storeys) with podium articulation, deep soil edges, and active frontage to the main street.',
        fsrHeightBonuses: [
          {
            label: 'Design excellence bonus',
            fsr: 'Up to 1.2:1',
            height: '18 m',
            trigger: 'Design excellence endorsement and public domain upgrades.'
          },
          {
            label: 'Infill affordable housing bonus',
            fsr: 'Up to 1.2:1',
            height: '17 m',
            trigger: 'Deliver >=15% infill affordable dwellings managed under Housing SEPP Part 2 Division 4.'
          }
        ],
        notes: [
          'State Significant Development (SSD) pathway becomes viable where capital investment exceeds $75m or >100 dwellings are proposed.',
          'Test Housing Diversity Amendment (HDA) scenarios for additional uplift and design flexibility once mapping commences.',
          'Undertake early utilities and transport engagement to evidence capacity upgrades.',
          ...(todNonDiscretionaryNote ? [todNonDiscretionaryNote] : []),
          ...(townCentreNonDiscretionaryNote ? [townCentreNonDiscretionaryNote] : []),
          lmrImprovementSummary
        ],
        clauses: [
          {
            label: 'Housing SEPP 2021 - Low and Mid-Rise Housing',
            url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643'
          },
          {
            label: 'Apartment Design Guide (2023)',
            url: 'https://www.planning.nsw.gov.au/sites/default/files/2023-03/apartment-design-guide.pdf'
          },
          {
            label: 'State Significant Development - Capital Investment Thresholds',
            url: 'https://www.planning.nsw.gov.au/assess-and-regulate/development-assessment/planning-approval-pathways/state-significant-development'
          }
        ]
      }
    ];

    const generatedAt = new Date().toISOString();

    const sample = {
      site: {
        address,
        lotPlan: parcelSummary?.lotPlan ?? 'Lot 23 DP 738226',
        localGovernmentArea: 'Northern Beaches Council',
        zoning: zoneDisplayName,
        floorSpaceRatio: '0.5:1',
        heightOfBuildings: '8.5 metres',
        minLotSize: '600 square metres',
        latitude: mapLatitude,
        longitude: mapLongitude,
        mapPreviewUrl: siteMapPreviewUrl,
        streetViewAvailable,
        streetView: {
          latitude: streetViewLatitude,
          longitude: streetViewLongitude
        },
        generatedAt,
        metrics,
        dataSources,
        locationalInsights,
        guidelineLinks
      },
      planningOptions,
      recommendations: [
        {
          category: 'Proceedable Pathways',
          title: 'Progress Complying Development Certificate (CDC) duplex documentation',
          detail:
            'Advance the Complying Development Certificate (CDC)-ready duplex scheme with architectural, Building Sustainability Index (BASIX), bushfire and flood reporting so that a complying certificate can be issued immediately after due diligence.',
          sources: [
            {
              label: 'Codes SEPP Part 3A Dual Occupancies',
              url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572#pt.3A'
            }
          ]
        },
        {
          category: 'Risk Flags',
          title: 'Verify terrace frontage and flood constraints',
          detail:
            'Confirm usable frontage >=21 m via survey, then resolve flood and overland flow design to keep terrace Complying Development Certificate (CDC) and Development Application (DA) pathways viable.',
          sources: [
            {
              label: 'NSW LotSearch - Common/LotSearch',
              url: LOT_SEARCH_DATASHEET
            }
          ]
        },
        {
          category: 'Further Investigation',
          title: 'Test Transport Oriented Development (TOD) / town centre apartment scheme',
          detail:
            'Model a 4-6 storey apartment concept aligned with Transport Oriented Development (TOD) design excellence criteria; validate deep soil, parking and infrastructure upgrades with NSW Planning.',
          sources: [
            {
              label: 'Housing SEPP Low and Mid-Rise Housing',
              url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643'
            }
          ]
        },
        {
          category: 'High Risk / Likely Refusal',
          title: 'Apartments without Transport Oriented Development (TOD) / town centre mapping',
          detail:
            'Outside Transport Oriented Development (TOD)/town centre activation apartments face refusal-pursue planning proposal or await Housing SEPP commencement before lodging.',
          sources: [
            {
              label: 'NSW Planning - Transport Oriented Development (TOD) Program',
              url: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy'
            }
          ]
        }
      ],
      comparableSales: [
        {
          address: '14 Ocean View Drive, Dee Why NSW 2099',
          type: 'Dual Occupancy',
          saleDate: '2024-03-18',
          salePrice: 2450000,
          landAreaSquareMeters: 446,
          year: 2024,
          comment: 'Recently completed duplex with coastal finishes and compliant setbacks.',
          description: 'New dual occupancy with double garage and 4-bedroom layout over two levels.',
          latitude: -33.7529,
          longitude: 151.3008,
          source: {
            label: 'NSW Planning Portal - Sales Evidence',
            url: 'https://www.planning.nsw.gov.au/'
          }
        },
        {
          address: '21 Foreshore Avenue, Collaroy NSW 2097',
          type: 'Semi-Detached',
          saleDate: '2023-11-02',
          salePrice: 2320000,
          landAreaSquareMeters: 405,
          year: 2023,
          comment: 'Attached dwellings on similar lot depth with landscaped frontage and private courtyards.',
          description: 'Two semi-detached dwellings each with double garage and coastal design palette.',
          latitude: -33.7312,
          longitude: 151.3015,
          source: {
            label: 'NSW Planning Portal - Sales Evidence',
            url: 'https://www.planning.nsw.gov.au/'
          }
        },
        {
          address: '5 Victor Road, Dee Why NSW 2099',
          type: 'Dual Occupancy',
          saleDate: '2023-08-14',
          salePrice: 2280000,
          landAreaSquareMeters: 462,
          year: 2023,
          comment: 'Merit-approved duplex demonstrating council appetite for high quality attached dwellings.',
          description: 'Dual occupancy with articulated facade, ground floor garages and deep rear landscape.',
          latitude: -33.7574,
          longitude: 151.289,
          source: {
            label: 'Northern Beaches Council Development Application (DA) Tracker',
            url: 'https://eservices.northernbeaches.nsw.gov.au/ePlanning/'
          }
        },
        {
          address: '59A Seaview Street, Balgowlah NSW 2093',
          type: 'Duplex Pair',
          saleDate: '2024-04-05',
          salePrice: 5900000,
          landAreaSquareMeters: 512,
          year: 2024,
          comment:
            'High-end duplex overlooking North Harbour; price disclosed post-settlement at $5.9m.',
          description:
            'Premium three-level attached dwellings with lift, harbour terrace, and luxury fitout.',
          latitude: -33.7906,
          longitude: 151.2595,
          source: {
            label: 'NSW Titles Office Settlement Notice',
            url: 'https://www.nswlrs.com.au/'
          }
        },
        {
          address: '25A Nield Avenue, Balgowlah NSW 2093',
          type: 'Dual Occupancy',
          saleDate: '2023-10-21',
          salePrice: 4750000,
          landAreaSquareMeters: 480,
          year: 2023,
          comment: 'Architect-designed duplex with wide frontage 2km south of the subject catchment.',
          description:
            'Dual occupancy featuring 4 bedrooms, plunge pool, and double garage on 480 m^2 allotment.',
          latitude: -33.7927,
          longitude: 151.2551,
          source: {
            label: 'Northern Beaches Prestige Sales',
            url: 'https://www.planning.nsw.gov.au/'
          }
        }
      ],
      developmentActivity: [
        {
          applicationNumber: 'DA2023/1122',
          address: '5 Victor Road, Dee Why NSW 2099',
          description: 'Dual occupancy (attached) with Torrens title subdivision.',
          status: 'Approved',
          decisionDate: '2023-08-14',
          source: {
            label: 'Northern Beaches Council Development Application (DA) Tracker',
            url: 'https://eservices.northernbeaches.nsw.gov.au/ePlanning/'
          }
        },
        {
          applicationNumber: 'DA2024/0210',
          address: '28 Redman Road, Dee Why NSW 2099',
          description: 'Four storey shop-top housing with ground floor retail and 12 apartments.',
          status: 'Under assessment',
          decisionDate: '2024-05-30',
          source: {
            label: 'Northern Beaches Council Development Application (DA) Tracker',
            url: 'https://eservices.northernbeaches.nsw.gov.au/ePlanning/'
          }
        }
      ],
      similarApprovedProjects: [
        {
          title: 'Coastal Transit Apartments',
          address: '10 Howard Avenue, Dee Why NSW 2099',
          approvalDate: '2022-10-05',
          headlineMetric: '7 storey apartment building (68 units) with podium retail',
          link: {
            label: 'State Significant Development State Significant Development (SSD)-10421',
            url: 'https://www.planningportal.nsw.gov.au/major-projects/project/10421'
          }
        }
      ],
      feasibility: {
        summary: 'Feasibility snapshot reflects Rev 25 (10.09.2025) spreadsheet assumptions for the two luxury townhouses with optional TOD uplift.',
        assumptions: [
          'Land value per spreadsheet: $4.0m (May 2025 valuation).',
          'Construction contract $5.02m plus 10% contingency (Rev 25).',
          'Capitalised finance: 15 month build/settlement at 8.39% p.a. ($593k).',
          'Assumes minimum 15% infill affordable housing across uplift pathways.'
        ],
        metrics: {
          totalGrossRealisation: 14445401.25,
          totalDevelopmentCost: 13801577.634861756,
          netProfitBeforeTax: 643823.6151382439,
          netProfitMarginPercent: 4.46,
          marginOnCostPercent: 4.66,
          marginOnGrossDevelopmentValuePercent: 4.46
        },
        costBreakdown: {
          landCost: 4000000,
          buildCost: [
            {
              type: 'Construction',
              amount: 5018581.8725,
              note: 'Builder contract (Rev 25)'
            },
            {
              type: 'Contingency (10%)',
              amount: 472058.18725
            }
          ],
          softCosts: 3717900.82,
          holdingCosts: 593036.7551007548,
          saleComparables: [
            '14 Ocean View Drive, Dee Why NSW 2099 - $2.45m (Mar 2024)',
            '21 Foreshore Avenue, Collaroy NSW 2097 - $2.32m (Nov 2023)'
          ]
        },
        decision: {
          goNoGo: 'Go (conditional)',
          recommendation: 'Proceed with Complying Development Certificate (CDC) duplex delivery while advancing Transport Oriented Development (TOD) apartment concept design and servicing tests.',
          rationale: 'Complying Development Certificate (CDC) duplex delivers acceptable margin; Transport Oriented Development (TOD) uplift provides strategic upside pending mapping commencement.'
        },
        sources: [
          {
            label: 'CoreLogic RP Data - Duplex Sales Evidence',
            url: 'https://www.corelogic.com.au/'
          },
          {
            label: 'Housing SEPP Low and Mid-Rise Housing Guidance',
            url: 'https://www.planning.nsw.gov.au/policy-and-legislation/housing/low-and-mid-rise-housing-policy'
          }
        ]
      },
      recommendationSummary: {
        headline: 'Deliver Complying Development Certificate (CDC) duplex immediately while progressing Transport Oriented Development (TOD)/town centre uplift investigations.',
        status: 'Go (conditional)',
        rationalePoints: [
          'Codes SEPP duplex pathway is compliant with frontage, area, and hazard certification.',
          `Transport Oriented Development (TOD) / town centre mapping offers apartment upside subject to design excellence (${todBand} Transport Oriented Development (TOD) band, ${townCentreBand} town centre band).`,
          townCentreSummary,
          'Market evidence supports duplex pricing above $2.3m per dwelling, reinforcing baseline feasibility.'
        ],
        nextSteps: [
          'Finalize Complying Development Certificate (CDC) duplex documentation and secure complying development certificate.',
          'Engage NSW Planning Transport Oriented Development (TOD) delivery team to clarify frontage, deep soil, and infrastructure expectations.',
          todNextStep
        ],
        risks: [
          'Flood, overland flow and bushfire certification required to retain Complying Development Certificate (CDC) eligibility.',
          'Transport Oriented Development (TOD) uplift contingent on Housing SEPP commencement-monitor mapping and policy updates.'
        ],
        confidenceRating: 'High (80%)'
      }
    };

    return NextResponse.json({ ok: true, data: sample }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}






















