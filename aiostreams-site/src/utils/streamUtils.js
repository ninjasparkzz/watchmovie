export function cleanBaseUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

export function buildStreamHeaders(config) {
  const headers = {};
  if (config.uuid) headers['X-User-UUID'] = config.uuid;
  if (config.password) headers['X-User-Password'] = config.password;
  if (config.uuid && config.password) {
    headers.Authorization = `Basic ${btoa(`${config.uuid}:${config.password}`)}`;
  } else if (config.uuid) {
    headers.Authorization = `Basic ${btoa(`${config.uuid}:`)}`;
  }
  return headers;
}

function getNestedValue(source, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

export function inferQuality(value) {
  const match = String(value).match(/\b(2160p|4k|1080p|720p|480p|hdr|dolby vision)\b/i);
  return match ? match[0].toUpperCase() : '';
}

export function extractStreams(payload) {
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.streams)) return payload.streams;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.streams)) return payload.data.streams;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function normalizeStream(stream, index) {
  const parsed = stream.parsedFile;
  const qualityParts = [parsed?.resolution, parsed?.quality, parsed?.encode].filter(Boolean);
  const quality = qualityParts.join(' · ') || inferQuality(stream.filename || stream.description || '');

  const title =
    stream.filename ||
    getNestedValue(stream, ['title', 'name', 'stream.name']) ||
    (quality ? `${quality}` : `Source ${index + 1}`);

  const provider =
    stream.addon ||
    getNestedValue(stream, ['addonName', 'provider', 'source']) ||
    'Source';

  const url = getNestedValue(stream, ['url', 'externalUrl', 'stream.url']);
  const infoHash = stream.infoHash || null;
  const fileIdx = stream.fileIdx ?? 0;
  const ytId = stream.ytId || null;
  const streamType = stream.type || (url ? 'http' : infoHash ? 'p2p' : ytId ? 'youtube' : 'unknown');

  return {
    id: infoHash || url || `${provider}-${index}`,
    title,
    provider,
    quality,
    size: stream.size,
    seeders: stream.seeders,
    url,
    infoHash,
    fileIdx,
    ytId,
    streamType,
    description: stream.description || stream.message || '',
  };
}

export function buildMagnetUri(stream) {
  if (!stream.infoHash) return null;
  const hash = String(stream.infoHash).toLowerCase();
  const params = new URLSearchParams();
  params.set('xt', `urn:btih:${hash}`);
  if (stream.title) params.set('dn', stream.title);
  return `magnet:?${params.toString()}`;
}

export function isDirectPlayableUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|mkv|m3u8)(\?|$)/i.test(url) || url.includes('m3u8');
}

export function canPlayStream(stream) {
  return Boolean(stream?.url || stream?.infoHash || stream?.ytId);
}

export function buildMediaId(item, season, episode) {
  if (!item) return '';
  if (item.type !== 'series') return item.id;
  return `${item.id}:${season || 1}:${episode || 1}`;
}

export function normalizeCatalogItem(item, fallbackType = 'movie') {
  return {
    id: item.id,
    type: item.type || fallbackType,
    name: item.name || item.title || 'Untitled',
    poster: item.poster || item.background || '',
    releaseInfo: item.releaseInfo || item.year || '',
    imdbRating: item.imdbRating || item.rating || '',
    description: item.description || '',
  };
}

import axios from 'axios';

export async function fetchCatalog(type, query = '') {
  const CATALOG_BASE = 'https://v3-cinemeta.strem.io';
  const catalogType = type === 'anime' ? 'series' : type;
  const searchPart = query.trim() ? `/search=${encodeURIComponent(query.trim())}` : '';
  const url = `${CATALOG_BASE}/catalog/${catalogType}/top${searchPart}.json`;
  const response = await axios.get(url, { timeout: 12000 });
  return (response.data?.metas || []).map((item) => normalizeCatalogItem(item, catalogType));
}
