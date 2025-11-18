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
  frontageMeters: number | null;
  depthMeters: number | null;
  streetFrontageMeters: number | null;
  rearBoundaryMeters: number | null;
  leftBoundaryMeters: number | null;
  rightBoundaryMeters: number | null;
  areaSquareMeters: number | null;
  geometryAreaSquareMeters: number | null;
  planLotAreaSquareMeters: number | null;
  areaSource: 'geometry' | 'attribute' | 'unknown';
  lotPlan?: string;
  lotClassSubtype?: number | null;
  lotType?: string;
  centroidLatitude?: number;
  centroidLongitude?: number;
};

type ArcGisRing = Array<[number, number]>;

const SEPP_HOUSING_MAPSERVER =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/SEPP_Housing_2021/MapServer';

const PLANNING_PORTAL_MAPSERVER =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer';
const PLANNING_LAYER_FSR = 9;
const PLANNING_LAYER_HOB = 12;
const PLANNING_LAYER_MLS = 22;

type LandZoningAttributes = {
  LABEL?: string;
  LAY_CLASS?: string;
  EPI_NAME?: string;
  COMMENCED_DATE?: number;
};

const LOT_CLASS_SUBTYPE_LABELS: Record<number, string> = {
  1: 'Standard lot',
  2: 'Part lot',
  3: 'Strata lot',
  4: 'Stratum lot'
};



function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalisePlanLotArea(value: unknown, units?: unknown): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }
  if (typeof units === 'string' && units.toLowerCase() === 'ha') {
    return value * 10000;
  }
  return value;
}

function normaliseArcGisString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (isFiniteNumber(value)) {
    return value.toString();
  }
  return undefined;
}

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

function formatMeters(value: number | null | undefined, fallback = 'N/A') {
  if (!isFiniteNumber(value)) {
    return fallback;
  }
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

type BoundaryMetrics = {
  depthMeters: number | null;
  widthMeters: number | null;
  streetFrontageMeters: number | null;
  rearBoundaryMeters: number | null;
  leftBoundaryMeters: number | null;
  rightBoundaryMeters: number | null;
};

function sanitiseLength(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return null;
  }
  const absolute = Math.abs(value);
  if (absolute < 0.01) {
    return null;
  }
  return absolute;
}

function computeBoundaryMetrics(
  mercatorPoints: Array<{ x: number; y: number }> | undefined,
  geocode?: { x: number; y: number }
): BoundaryMetrics {
  if (!mercatorPoints || mercatorPoints.length < 3) {
    return {
      depthMeters: null,
      widthMeters: null,
      streetFrontageMeters: null,
      rearBoundaryMeters: null,
      leftBoundaryMeters: null,
      rightBoundaryMeters: null
    };
  }

  const points = [...mercatorPoints];
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01) {
      points.pop();
    }
  }

  if (points.length < 3) {
    return {
      depthMeters: null,
      widthMeters: null,
      streetFrontageMeters: null,
      rearBoundaryMeters: null,
      leftBoundaryMeters: null,
      rightBoundaryMeters: null
    };
  }

  let meanX = 0;
  let meanY = 0;
  for (const point of points) {
    meanX += point.x;
    meanY += point.y;
  }
  meanX /= points.length;
  meanY /= points.length;

  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  for (const point of points) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    sumXX += dx * dx;
    sumYY += dy * dy;
    sumXY += dx * dy;
  }
  const divisor = points.length === 0 ? 1 : points.length;
  const covXX = sumXX / divisor;
  const covYY = sumYY / divisor;
  const covXY = sumXY / divisor;

  const diff = covXX - covYY;
  const discriminant = Math.sqrt(Math.max(0, diff * diff + 4 * covXY * covXY));
  const lambda1 = (covXX + covYY + discriminant) / 2;
  const lambda2 = (covXX + covYY - discriminant) / 2;

  const epsilon = 1e-9;
  let axis1: [number, number];
  if (Math.abs(covXY) > epsilon) {
    axis1 = [lambda1 - covYY, covXY];
  } else if (covXX >= covYY) {
    axis1 = [1, 0];
  } else {
    axis1 = [0, 1];
  }
  const axis1Length = Math.hypot(axis1[0], axis1[1]);
  if (axis1Length > 0) {
    axis1 = [axis1[0] / axis1Length, axis1[1] / axis1Length];
  } else {
    axis1 = [1, 0];
  }

  let axis2: [number, number];
  if (discriminant < epsilon && Math.abs(lambda1 - lambda2) < epsilon) {
    axis2 = [0, 1];
  } else {
    axis2 = [-axis1[1], axis1[0]];
  }

  const axisPoints = points.map((point) => {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    const depth = axis1[0] * dx + axis1[1] * dy;
    const width = axis2[0] * dx + axis2[1] * dy;
    return { depth, width };
  });

  const depthValues = axisPoints.map((point) => point.depth);
  const widthValues = axisPoints.map((point) => point.width);
  const minDepth = Math.min(...depthValues);
  const maxDepth = Math.max(...depthValues);
  const minWidth = Math.min(...widthValues);
  const maxWidth = Math.max(...widthValues);

  const depthRange = sanitiseLength(maxDepth - minDepth);
  const widthRange = sanitiseLength(maxWidth - minWidth);

  const depthTolerance = Math.max(0.5, Math.abs((maxDepth - minDepth) * 0.05));
  const widthTolerance = Math.max(0.5, Math.abs((maxWidth - minWidth) * 0.05));

  let geocodeDepth: number | null = null;
  if (geocode && isFiniteNumber(geocode.x) && isFiniteNumber(geocode.y)) {
    const dx = geocode.x - meanX;
    const dy = geocode.y - meanY;
    geocodeDepth = axis1[0] * dx + axis1[1] * dy;
  }

  let frontDepth = minDepth;
  let rearDepth = maxDepth;
  if (geocodeDepth !== null) {
    const distanceToMin = Math.abs(geocodeDepth - minDepth);
    const distanceToMax = Math.abs(maxDepth - geocodeDepth);
    if (distanceToMax < distanceToMin) {
      frontDepth = maxDepth;
      rearDepth = minDepth;
    }
  }

  const pointsCount = axisPoints.length;

  const collectWidthsAtDepth = (targetDepth: number) => {
    const values: number[] = [];
    for (let index = 0; index < pointsCount; index += 1) {
      const current = axisPoints[index];
      const next = axisPoints[(index + 1) % pointsCount];

      if (Math.abs(current.depth - targetDepth) <= depthTolerance) {
        values.push(current.width);
      }
      if (Math.abs(next.depth - targetDepth) <= depthTolerance) {
        values.push(next.width);
      }

      const depthDelta = next.depth - current.depth;
      if (depthDelta === 0) {
        continue;
      }
      const t = (targetDepth - current.depth) / depthDelta;
      if (t > 0 && t < 1) {
        const widthAt = current.width + t * (next.width - current.width);
        values.push(widthAt);
      }
    }
    return values.filter((value) => Number.isFinite(value)) as number[];
  };

  const collectDepthsAtWidth = (targetWidth: number) => {
    const values: number[] = [];
    for (let index = 0; index < pointsCount; index += 1) {
      const current = axisPoints[index];
      const next = axisPoints[(index + 1) % pointsCount];

      if (Math.abs(current.width - targetWidth) <= widthTolerance) {
        values.push(current.depth);
      }
      if (Math.abs(next.width - targetWidth) <= widthTolerance) {
        values.push(next.depth);
      }

      const widthDelta = next.width - current.width;
      if (widthDelta === 0) {
        continue;
      }
      const t = (targetWidth - current.width) / widthDelta;
      if (t > 0 && t < 1) {
        const depthAt = current.depth + t * (next.depth - current.depth);
        values.push(depthAt);
      }
    }
    return values.filter((value) => Number.isFinite(value)) as number[];
  };

  const computeRange = (values: number[]) => {
    if (!values || values.length < 2) {
      return null;
    }
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return sanitiseLength(maxValue - minValue);
  };

  let streetFrontageMeters = computeRange(collectWidthsAtDepth(frontDepth));
  if (streetFrontageMeters === null) {
    streetFrontageMeters = widthRange;
  }

  let rearBoundaryMeters = computeRange(collectWidthsAtDepth(rearDepth));
  if (rearBoundaryMeters === null) {
    rearBoundaryMeters = widthRange;
  }

  let leftBoundaryMeters = computeRange(collectDepthsAtWidth(minWidth));
  if (leftBoundaryMeters === null) {
    leftBoundaryMeters = depthRange;
  }

  let rightBoundaryMeters = computeRange(collectDepthsAtWidth(maxWidth));
  if (rightBoundaryMeters === null) {
    rightBoundaryMeters = depthRange;
  }

  return {
    depthMeters: depthRange,
    widthMeters: widthRange,
    streetFrontageMeters,
    rearBoundaryMeters,
    leftBoundaryMeters,
    rightBoundaryMeters
  };
}

function inferLotType(
  classSubtype: number | null | undefined,
  metrics: {
    streetFrontageMeters?: number | null;
    rearBoundaryMeters?: number | null;
    leftBoundaryMeters?: number | null;
    rightBoundaryMeters?: number | null;
  }
): string | undefined {
  const subtypeLabel =
    classSubtype !== null && classSubtype !== undefined
      ? LOT_CLASS_SUBTYPE_LABELS[classSubtype]
      : undefined;

  if (subtypeLabel && subtypeLabel !== 'Standard lot') {
    return subtypeLabel;
  }

  const frontage = metrics.streetFrontageMeters;
  const rear = metrics.rearBoundaryMeters;
  const left = metrics.leftBoundaryMeters;
  const right = metrics.rightBoundaryMeters;

  if (isFiniteNumber(frontage) && isFiniteNumber(rear)) {
    if (frontage < rear * 0.5 && frontage < 6) {
      return 'Battle-axe lot';
    }

    const taperRatio = frontage / rear;
    if (taperRatio > 1.4) {
      return 'Tapered lot (front wider)';
    }
    if (taperRatio < 0.7) {
      return 'Tapered lot (rear wider)';
    }
  }

  if (isFiniteNumber(left) && isFiniteNumber(right)) {
    const minSide = Math.min(left, right);
    const maxSide = Math.max(left, right);
    if (minSide > 0 && maxSide / minSide > 1.5) {
      return 'Irregular lot';
    }
  }

  if (subtypeLabel) {
    return subtypeLabel;
  }

  return undefined;
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

type PlanningLayerResult = {
  label: string | null;
  className: string | null;
  mapName: string | null;
};

async function queryPlanningLayerLabel(
  layerId: number,
  latitude: number,
  longitude: number
): Promise<PlanningLayerResult | null> {
  if (
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
    outFields: 'LABEL,LAY_CLASS,MAP_NAME',
    returnGeometry: 'false'
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${PLANNING_PORTAL_MAPSERVER}/${layerId}/query?${params.toString()}`,
      { signal: controller.signal, cache: 'no-store' }
    );
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      features?: Array<{ attributes?: { LABEL?: string; LAY_CLASS?: string; MAP_NAME?: string } }>;
    };
    const attributes = json.features?.[0]?.attributes;
    if (!attributes) {
      return null;
    }
    return {
      label: attributes.LABEL ?? null,
      className: attributes.LAY_CLASS ?? null,
      mapName: attributes.MAP_NAME ?? null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFsrAtPoint(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const result = await queryPlanningLayerLabel(PLANNING_LAYER_FSR, latitude, longitude);
  return result?.label ?? null;
}

async function fetchHeightAtPoint(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const result = await queryPlanningLayerLabel(PLANNING_LAYER_HOB, latitude, longitude);
  if (!result?.label) {
    return null;
  }
  const label = result.label;
  const numericMatch = label.match(/^(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    return `${numericMatch[1]} metres`;
  }
  return label;
}

async function fetchLotSizeAtPoint(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const result = await queryPlanningLayerLabel(PLANNING_LAYER_MLS, latitude, longitude);
  if (!result?.label) {
    return null;
  }
  const label = result.label;
  const numericMatch = label.match(/^(\d+(?:\.\d+)?)/);
  if (numericMatch) {
    return `${numericMatch[1]} square metres`;
  }
  return label;
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const geocodingApiKey = process.env.GEOCODING_API_KEY;

  if (geocodingApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const params = new URLSearchParams({
        address: address,
        key: geocodingApiKey
      });
      const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store'
      });

      if (response.ok) {
        const json = (await response.json()) as {
          status?: string;
          results?: Array<{
            geometry?: {
              location?: { lat?: number; lng?: number };
            };
          }>;
        };

        if (json.status === 'OK' && json.results && json.results.length > 0) {
          const location = json.results[0].geometry?.location;
          if (location?.lat !== undefined && location?.lng !== undefined) {
            const latitude = location.lat;
            const longitude = location.lng;
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              const mapPreviewUrl = buildFallbackStaticMap(latitude, longitude);
              return { latitude, longitude, mapPreviewUrl };
            }
          }
        }
      }
    } catch {
      // Fall through to Nominatim
    } finally {
      clearTimeout(timeout);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    // Use Google Geocoding API if key is available for more accurate results
    if (GOOGLE_MAPS_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(url, {
        signal: controller.signal
      });

      if (response.ok) {
        const json = await response.json() as {
          status: string;
          results?: Array<{
            geometry?: {
              location?: {
                lat?: number;
                lng?: number;
              };
            };
          }>;
        };

        if (json.status === 'OK' && json.results && json.results.length > 0) {
          const location = json.results[0].geometry?.location;
          const latitude = location?.lat;
          const longitude = location?.lng;

          if (latitude !== undefined && longitude !== undefined && 
              Number.isFinite(latitude) && Number.isFinite(longitude)) {
            const mapPreviewUrl = buildFallbackStaticMap(latitude, longitude);
            return { latitude, longitude, mapPreviewUrl };
          }
        }
      }
    }

    // Fallback to Nominatim if Google API is not available or fails
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
      outFields: 'LOTNUMBER,PLANLABEL,LOT_DP,PLANLOTAREA,CLASSSUBTYPE'
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
          CLASSSUBTYPE?: number;
        };
        geometry?: { rings?: ArcGisRing[] };
      }>;
    };

    const feature = data.features?.[0];
    if (!feature) {
      return null;
    }

    const lotNumber = normaliseArcGisString(feature.attributes?.LOTNUMBER);
    const planLabel = normaliseArcGisString(
      feature.attributes?.PLANLABEL ?? feature.attributes?.LOT_DP
    );
    const planLotArea = normalisePlanLotArea(feature.attributes?.PLANLOTAREA);
    const lotPlan = lotNumber && planLabel ? `Lot ${lotNumber} ${planLabel}` : planLabel;
    const classSubtypeRaw = feature.attributes?.CLASSSUBTYPE;
    const lotClassSubtype =
      typeof classSubtypeRaw === 'number' && Number.isFinite(classSubtypeRaw)
        ? classSubtypeRaw
        : typeof classSubtypeRaw === 'string'
          ? Number.parseInt(classSubtypeRaw, 10)
          : null;

    const rings = feature.geometry?.rings;
    if (!rings || rings.length === 0) {
      return {
        frontageMeters: null,
        depthMeters: null,
        streetFrontageMeters: null,
        rearBoundaryMeters: null,
        leftBoundaryMeters: null,
        rightBoundaryMeters: null,
        areaSquareMeters: planLotArea,
        geometryAreaSquareMeters: null,
        planLotAreaSquareMeters: planLotArea,
        areaSource: planLotArea !== null ? 'attribute' : 'unknown',
        lotPlan,
        lotClassSubtype,
        lotType: inferLotType(lotClassSubtype, {}),
        centroidLatitude: undefined,
        centroidLongitude: undefined
      };
    }

    const firstRing = rings[0];
    const mercatorPoints = firstRing.map(([lon, lat]) => toWebMercator(lon, lat));
    const areaSquareMeters = computePolygonArea(mercatorPoints);
    const centroid = polygonCentroid(rings);

    const geocodePoint = toWebMercator(longitude, latitude);
    const boundaryMetrics = computeBoundaryMetrics(mercatorPoints, geocodePoint);

    const geometryAreaSquareMeters = isFiniteNumber(areaSquareMeters) ? areaSquareMeters : null;
    const areaSquareMetersBest = geometryAreaSquareMeters ?? planLotArea ?? null;
    const areaSource =
      geometryAreaSquareMeters !== null ? 'geometry' : planLotArea !== null ? 'attribute' : 'unknown';
    const lotType = inferLotType(lotClassSubtype, boundaryMetrics);

    return {
      frontageMeters: boundaryMetrics.streetFrontageMeters,
      depthMeters: boundaryMetrics.depthMeters,
      streetFrontageMeters: boundaryMetrics.streetFrontageMeters,
      rearBoundaryMeters: boundaryMetrics.rearBoundaryMeters,
      leftBoundaryMeters: boundaryMetrics.leftBoundaryMeters,
      rightBoundaryMeters: boundaryMetrics.rightBoundaryMeters,
      areaSquareMeters: areaSquareMetersBest,
      geometryAreaSquareMeters,
      planLotAreaSquareMeters: planLotArea,
      areaSource,
      lotPlan,
      lotClassSubtype,
      lotType,
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
    let legacyPlan = resolveLegacyPlan(address);
    if (zoningInfo?.epiName) {
      const epiName = zoningInfo.epiName.toLowerCase();
      if (epiName.includes('manly')) {
        legacyPlan = LEGACY_PLANS.manly;
      } else if (epiName.includes('pittwater')) {
        legacyPlan = LEGACY_PLANS.pittwater;
      } else if (epiName.includes('warringah')) {
        legacyPlan = LEGACY_PLANS.warringah;
      }
    }
    const lepUrl = (fragment?: string) => `${legacyPlan.lepBaseUrl}${fragment ?? ''}`;
    const zoneDisplayName = zoningInfo?.label
      ? zoningInfo.className
        ? `${zoningInfo.className} (${zoningInfo.label})`
        : zoningInfo.label
      : 'Low Density Residential (R2)';

    const metrics: Array<{
      id: string;
      label: string;
      value: string;
      linkLabel: string;
      linkUrl: string;
    }> = [];
    const geometryFallback = 'N/A (insufficient parcel geometry)';
    const frontageValue =
      parcelSummary?.streetFrontageMeters ?? parcelSummary?.frontageMeters ?? null;
    const depthValue = parcelSummary?.depthMeters ?? null;
    const rearBoundaryValue = parcelSummary?.rearBoundaryMeters ?? null;
    const leftBoundaryValue = parcelSummary?.leftBoundaryMeters ?? null;
    const rightBoundaryValue = parcelSummary?.rightBoundaryMeters ?? null;

    const controlLatitude = parcelLatitude ?? lookupLatitude;
    const controlLongitude = parcelLongitude ?? lookupLongitude;

    const [floorSpaceRatioValue, heightOfBuildingsValue, minLotSizeValue] = await Promise.all([
      fetchFsrAtPoint(controlLatitude, controlLongitude),
      fetchHeightAtPoint(controlLatitude, controlLongitude),
      fetchLotSizeAtPoint(controlLatitude, controlLongitude)
    ]);

    metrics.push(
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
        value: heightOfBuildingsValue ?? 'Not mapped',
        linkLabel: `NSW Planning Portal - Height of Buildings (Layer ${PLANNING_LAYER_HOB})`,
        linkUrl: `${PLANNING_PORTAL_MAPSERVER}/${PLANNING_LAYER_HOB}`
      },
      {
        id: 'fsr',
        label: 'Floor Space Ratio (FSR)',
        value: floorSpaceRatioValue ?? 'Not mapped',
        linkLabel: `NSW Planning Portal - Floor Space Ratio (Layer ${PLANNING_LAYER_FSR})`,
        linkUrl: `${PLANNING_PORTAL_MAPSERVER}/${PLANNING_LAYER_FSR}`
      },
      {
        id: 'lot',
        label: 'Minimum Lot Size',
        value: minLotSizeValue ?? 'Not mapped',
        linkLabel: `NSW Planning Portal - Minimum Lot Size (Layer ${PLANNING_LAYER_MLS})`,
        linkUrl: `${PLANNING_PORTAL_MAPSERVER}/${PLANNING_LAYER_MLS}`
      }
    );

    if (parcelSummary) {
      metrics.push(
        {
          id: 'street-frontage',
          label: 'Approx. Street Frontage',
          value: formatMeters(frontageValue, geometryFallback),
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        },
        {
          id: 'parcel-depth',
          label: 'Approx. Parcel Depth',
          value: formatMeters(depthValue, geometryFallback),
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        },
        {
          id: 'rear-width',
          label: 'Approx. Rear Boundary Width',
          value: formatMeters(rearBoundaryValue, geometryFallback),
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        },
        {
          id: 'left-boundary',
          label: 'Approx. Left Boundary Length',
          value: formatMeters(leftBoundaryValue, geometryFallback),
          linkLabel: 'NSW LotSearch (Common/LotSearch)',
          linkUrl: LOT_SEARCH_DATASHEET
        },
        {
          id: 'right-boundary',
          label: 'Approx. Right Boundary Length',
          value: formatMeters(rightBoundaryValue, geometryFallback),
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
      if (parcelSummary.lotType) {
        metrics.push({
          id: 'lot-type',
          label: 'Lot Type',
          value: parcelSummary.lotType,
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
        label: 'State Environmental Planning Policy (Housing) 2021 - Chapter 6',
        url: 'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0643#pt.2-div.6'
      }
    ];

    const generatedAt = new Date().toISOString();

    const capabilities = {
      geocode: geocodeLatitude !== undefined && geocodeLongitude !== undefined,
      parcel: parcelSummary !== null,
      zoning: zoningInfo !== null,
      todInsights: locationalInsights !== null,
      streetView: streetViewAvailable,
      fsr: floorSpaceRatioValue !== null,
      height: heightOfBuildingsValue !== null,
      lotSize: minLotSizeValue !== null
    };

    const responseData = {
      site: {
        address,
        lotPlan: parcelSummary?.lotPlan ?? null,
        localGovernmentArea: 'Northern Beaches Council',
        zoning: zoneDisplayName,
        floorSpaceRatio: floorSpaceRatioValue,
        heightOfBuildings: heightOfBuildingsValue,
        minLotSize: minLotSizeValue,
        latitude: mapLatitude,
        longitude: mapLongitude,
        mapPreviewUrl: siteMapPreviewUrl,
        streetViewAvailable,
        streetView: {
          latitude: streetViewLatitude,
          longitude: streetViewLongitude
        },
        streetFrontageMeters: frontageValue,
        depthMeters: depthValue,
        rearBoundaryMeters: rearBoundaryValue,
        leftBoundaryMeters: leftBoundaryValue,
        rightBoundaryMeters: rightBoundaryValue,
        lotType: parcelSummary?.lotType ?? null,
        generatedAt,
        metrics,
        dataSources,
        locationalInsights,
        guidelineLinks
      },
      capabilities
    };

    return NextResponse.json({ ok: true, data: responseData }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
