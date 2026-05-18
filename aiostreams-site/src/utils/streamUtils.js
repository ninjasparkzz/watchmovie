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

const WEBTORRENT_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.files.fm:7073/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker-udp.gbitt.info:80/announce',
];

export function getTorrentTrackers() {
  return WEBTORRENT_TRACKERS;
}

export function buildMagnetUri(stream) {
  if (!stream.infoHash) return null;
  const hash = String(stream.infoHash).toLowerCase();
  const parts = [`magnet:?xt=urn:btih:${hash}`];
  if (stream.title) parts.push(`dn=${encodeURIComponent(stream.title)}`);
  WEBTORRENT_TRACKERS.forEach((tracker) => {
    parts.push(`tr=${encodeURIComponent(tracker)}`);
  });
  return parts.join('&');
}

/** Prefer smaller / fewer-seeder-friendly streams for in-browser torrent play */
export function sortStreamsForWebPlay(streams) {
  return [...streams].sort((a, b) => {
    const score = (s) => {
      let n = 0;
      const res = (s.quality || s.title || '').toLowerCase();
      if (res.includes('2160') || res.includes('4k')) n += 1000;
      if (res.includes('remux')) n += 500;
      if (res.includes('1080')) n -= 100;
      if (res.includes('720')) n -= 200;
      if (s.size) n += s.size / 1e11;
      if (s.url) n -= 5000;
      return n;
    };
    return score(a) - score(b);
  });
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
