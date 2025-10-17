import { Loader, LoaderOptions } from '@googlemaps/js-api-loader';

let loader: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;
let currentLibraries: string[] = [];

export function loadGoogleMapsApi(
  apiKey: string,
  libraries: LoaderOptions['libraries'] = []
): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps API can only be loaded in the browser.'));
  }

  const requestedLibraries = Array.from(
    new Set([...(currentLibraries ?? []), ...((libraries as string[]) ?? [])])
  ).sort();

  const librariesChanged =
    requestedLibraries.length !== currentLibraries.length ||
    requestedLibraries.some((lib, index) => lib !== currentLibraries[index]);

  if (!loader || librariesChanged) {
    currentLibraries = requestedLibraries;
    loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: currentLibraries as LoaderOptions['libraries']
    });
    loadPromise = null;
  }

  if (!loadPromise) {
    loadPromise = loader.load();
  }

  return loadPromise;
}
