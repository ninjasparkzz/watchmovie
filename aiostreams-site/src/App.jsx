import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  Clapperboard,
  Copy,
  Crown,
  ExternalLink,
  Film,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  UserRound,
  X,
} from 'lucide-react';
import { accessConfig } from './accessConfig';

const STREAM_CONFIG_KEY = 'watchtv_stream_config';
const AUTH_KEY = 'watchtv_discord_auth';
const CATALOG_BASE = 'https://v3-cinemeta.strem.io';

const mediaTypes = [
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'series', label: 'Shows', icon: Tv },
  { id: 'anime', label: 'Anime', icon: Sparkles },
];

const defaultConfig = {
  baseUrl: 'https://ninjasparkzz-watch-backend.hf.space',
  uuid: 'ce8fac10-5faa-4811-bc4f-ef4a71c220b3',
  password: 'eyJpIjoieDNZUm5zS09XZVJqZ3MwZkN1bC9NZz09IiwiZSI6ImdmdmxPMUxSc0ZVTTlJdU1PRWYvbWVsTVRIb0p5bFlWd0QyYWdsbCt5bVE9IiwidCI6ImEifQ',
};



const featuredFallback = [
  { id: 'tt15398776', type: 'movie', name: 'Oppenheimer', poster: 'https://images.metahub.space/poster/medium/tt15398776/img', releaseInfo: '2023', imdbRating: '8.3' },
  { id: 'tt0944947', type: 'series', name: 'Game of Thrones', poster: 'https://images.metahub.space/poster/medium/tt0944947/img', releaseInfo: '2011-2019', imdbRating: '9.2' },
  { id: 'tt0903747', type: 'series', name: 'Breaking Bad', poster: 'https://images.metahub.space/poster/medium/tt0903747/img', releaseInfo: '2008-2013', imdbRating: '9.5' },
  { id: 'tt1375666', type: 'movie', name: 'Inception', poster: 'https://images.metahub.space/poster/medium/tt1375666/img', releaseInfo: '2010', imdbRating: '8.8' },
];

function cleanBaseUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

function buildStreamHeaders(config) {
  const headers = {};
  
  // We send it in multiple ways to bypass different proxy restrictions
  if (config.uuid) {
    headers['X-User-UUID'] = config.uuid;
  }
  if (config.password) {
    headers['X-User-Password'] = config.password;
  }
  
  // Some versions of AIOStreams still need Basic Auth
  if (config.uuid && config.password) {
    headers['Authorization'] = `Basic ${btoa(`${config.uuid}:${config.password}`)}`;
  } else if (config.uuid) {
    // If no password, send uuid with empty password
    headers['Authorization'] = `Basic ${btoa(`${config.uuid}:`)}`;
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

function normalizeStream(stream, index) {
  const title =
    getNestedValue(stream, ['title', 'name', 'stream.name', 'meta.title']) ||
    `Source ${index + 1}`;
  const provider =
    getNestedValue(stream, ['addon', 'addonName', 'provider', 'source', 'behaviorHints.bingeGroup']) ||
    'Source';
  const quality =
    getNestedValue(stream, ['resolution', 'quality', 'videoQuality', 'tag', 'behaviorHints.videoSize']) ||
    inferQuality(`${title} ${stream.description || ''}`);
  const size = getNestedValue(stream, ['size', 'fileSize', 'behaviorHints.videoSize']);
  const seeders = getNestedValue(stream, ['seeds', 'seeders', 'stats.seeders']);
  const url = getNestedValue(stream, ['url', 'externalUrl', 'stream.url']);
  const description = getNestedValue(stream, ['description', 'summary', 'info']) || '';

  return {
    id: stream.infoHash || stream.url || `${title}-${index}`,
    title,
    provider,
    quality,
    size,
    seeders,
    url,
    description,
  };
}

function inferQuality(value) {
  const match = String(value).match(/\b(2160p|4k|1080p|720p|480p|hdr|dolby vision)\b/i);
  return match ? match[0].toUpperCase() : 'Stream';
}

function extractStreams(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.streams)) return payload.streams;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.streams)) return payload.data.streams;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function normalizeCatalogItem(item, fallbackType = 'movie') {
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

async function fetchCatalog(type, query = '') {
  const catalogType = type === 'anime' ? 'series' : type;
  const searchPart = query.trim() ? `/search=${encodeURIComponent(query.trim())}` : '';
  const url = `${CATALOG_BASE}/catalog/${catalogType}/top${searchPart}.json`;
  const response = await axios.get(url, { timeout: 12000 });
  return (response.data?.metas || []).map((item) => normalizeCatalogItem(item, catalogType));
}

function buildMediaId(item, season, episode) {
  if (!item) return '';
  if (item.type !== 'series') return item.id;
  return `${item.id}:${season || 1}:${episode || 1}`;
}

function hasAllowedRole(auth) {
  if (!accessConfig.allowedRoleIds.length) return true;
  return auth.roles.some((roleId) => accessConfig.allowedRoleIds.includes(roleId));
}

function buildDiscordLoginUrl() {
  if (!accessConfig.discordClientId || !accessConfig.discordGuildIds.length) return '';
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams({
    client_id: accessConfig.discordClientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'identify guilds.members.read',
    prompt: 'none',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}


const App = () => {
  const [config, setConfig] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STREAM_CONFIG_KEY) || '{}');
      // Force reset if the saved config is using the old localhost
      if (saved.baseUrl && saved.baseUrl.includes('localhost')) {
        localStorage.removeItem(STREAM_CONFIG_KEY);
        return defaultConfig;
      }
      return { ...defaultConfig, ...saved };
    } catch {
      return defaultConfig;
    }
  });

  const [draftConfig, setDraftConfig] = useState(config);
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [mediaType, setMediaType] = useState('movie');
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState(featuredFallback);
  const [catalogTitle, setCatalogTitle] = useState('Recommended tonight');
  const [selectedItem, setSelectedItem] = useState(featuredFallback[0]);
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [streams, setStreams] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [streamLoading, setStreamLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const canWatch = Boolean(auth && hasAllowedRole(auth));
  const loginUrl = useMemo(() => buildDiscordLoginUrl(), []);
  const selectedMediaId = useMemo(
    () => buildMediaId(selectedItem, season, episode),
    [selectedItem, season, episode],
  );

  const hydrateDiscordSession = async (token) => {
    setError('');
    try {
      // First, get the user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {

        headers: { Authorization: `Bearer ${token}` },
      });

      // Then, try to find which guild they are in
      let memberData = null;
      for (const guildId of accessConfig.discordGuildIds) {
        try {
          const response = await axios.get(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data) {
            memberData = response.data;
            break; // Found the guild!
          }
        } catch {
          // Not in this guild, keep looking
          continue;
        }
      }

      if (!memberData && accessConfig.discordGuildIds.length > 0) {
        throw new Error('Not a member of allowed servers');
      }

      setAuth({
        token,
        user: userResponse.data,
        roles: memberData?.roles || [],
      });
      setShowAccessModal(false);
    } catch (err) {
      setError(err.message === 'Not a member of allowed servers' 
        ? 'You are not a member of the required Discord servers.' 
        : 'Discord login worked, but we could not verify your membership.');
    }
  };


  const loadRecommendations = async (type) => {
    setCatalogLoading(true);
    setError('');
    setStreams([]);

    try {
      const items = await fetchCatalog(type);
      setCatalog(items.length ? items : featuredFallback);
      setSelectedItem(items[0] || featuredFallback[0]);
      setCatalogTitle(type === 'movie' ? 'Recommended movies' : type === 'series' ? 'Recommended shows' : 'Recommended anime');
    } catch {
      setCatalog(featuredFallback);
      setSelectedItem(featuredFallback[0]);
      setCatalogTitle('Recommended tonight');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(STREAM_CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    else localStorage.removeItem(AUTH_KEY);
  }, [auth]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('access_token');
    if (!token || !accessConfig.discordGuildIds.length) return;

    window.history.replaceState({}, document.title, window.location.pathname);
    Promise.resolve().then(() => hydrateDiscordSession(token));
  }, []);


  const handleCatalogSearch = async (event) => {
    event?.preventDefault();
    if (!query.trim()) {
      loadRecommendations(mediaType);
      return;
    }

    setCatalogLoading(true);
    setError('');
    setStreams([]);

    try {
      const items = await fetchCatalog(mediaType, query);
      setCatalog(items);
      setSelectedItem(items[0] || null);
      setCatalogTitle(items.length ? `Results for "${query.trim()}"` : 'No matches found');
    } catch {
      setError('Search is unavailable right now. Try again in a moment.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setStreams([]);
    setError('');
    if (item.type !== 'series') {
      setSeason('1');
      setEpisode('1');
    }
  };

  const handleWatch = async () => {
    if (!selectedItem) return;
    if (!auth || !canWatch) {
      setShowAccessModal(true);
      return;
    }

    setStreamLoading(true);
    setError('');
    setStreams([]);

    try {
      const response = await axios.get(`${cleanBaseUrl(config.baseUrl)}/api/v1/search`, {
        params: {
          type: selectedItem.type === 'series' ? 'series' : 'movie',
          id: selectedMediaId,
          // Also sending credentials in the URL parameters as a fallback
          user: config.uuid,
          password: config.password
        },
        headers: buildStreamHeaders(config),
        timeout: 20000,
      });

      const normalized = extractStreams(response.data).map(normalizeStream);
      setStreams(normalized);
      if (!normalized.length) setError('No playable sources were found for this title.');
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setError(detail || 'The stream service could not be reached.');
    } finally {
      setStreamLoading(false);
    }
  };

  const handleSaveSettings = () => {
    setConfig({
      baseUrl: cleanBaseUrl(draftConfig.baseUrl),
      uuid: draftConfig.uuid.trim(),
      password: draftConfig.password,
    });
    setShowSettings(false);
  };

  const handleLogout = () => {
    setAuth(null);
    setStreams([]);
  };

  const copyStreamUrl = async (stream) => {
    if (!stream.url) return;
    await navigator.clipboard.writeText(stream.url);
    setCopiedId(stream.id);
    window.setTimeout(() => setCopiedId(''), 1200);
  };

  const activeType = mediaTypes.find((type) => type.id === mediaType);
  const ActiveIcon = activeType.icon;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="WatchTV home">
          <span className="brand-mark"><Clapperboard size={22} /></span>
          <span>WatchTV</span>
        </a>

        <div className="topbar-actions">
          {auth ? (
            <button className={`member-pill ${canWatch ? 'is-allowed' : 'is-blocked'}`} type="button" onClick={() => setShowAccessModal(true)}>
              {canWatch ? <Crown size={16} /> : <Lock size={16} />}
              {auth.user?.global_name || auth.user?.username || 'Member'}
            </button>
          ) : (
            <button className="member-pill" type="button" onClick={() => setShowAccessModal(true)}>
              <LogIn size={16} />
              Sign in
            </button>
          )}
        </div>
      </header>



      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><ShieldCheck size={16} /> Members only</span>
            <h1>Movies and shows, ready when you are.</h1>
            <p>Search by title, pick something worth watching, and unlock playback with your community access.</p>
          </div>

          <form className="search-panel" onSubmit={handleCatalogSearch}>
            <div className="segmented-control" aria-label="Media type">
              {mediaTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    className={mediaType === type.id ? 'is-active' : ''}
                    type="button"
                    onClick={() => {
                      setMediaType(type.id);
                      loadRecommendations(type.id);
                    }}
                    aria-pressed={mediaType === type.id}
                  >
                    <Icon size={17} />
                    {type.label}
                  </button>
                );
              })}
            </div>

            <label className="input-label" htmlFor="catalog-search">
              Search the library
            </label>
            <div className="search-row">
              <ActiveIcon size={22} />
              <input
                id="catalog-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try The Last of Us, Dune, The Bear..."
                autoComplete="off"
              />
              <button className="primary-button" type="submit" disabled={catalogLoading}>
                {catalogLoading ? <Loader2 className="spin" size={19} /> : <Search size={19} />}
                Search
              </button>
            </div>
          </form>
        </section>

        <section className="browse-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Browse</span>
              <h2>{catalogTitle}</h2>
            </div>
            {catalogLoading && <span className="quiet-pill"><Loader2 className="spin" size={15} /> Loading</span>}
          </div>

          <div className="poster-grid">
            {catalog.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                className={`poster-card ${selectedItem?.id === item.id ? 'is-selected' : ''}`}
                type="button"
                onClick={() => handleSelectItem(item)}
              >
                <div className="poster-frame">
                  {item.poster ? <img src={item.poster} alt="" loading="lazy" /> : <div className="poster-fallback"><Film size={28} /></div>}
                  <span>{item.type === 'series' ? 'Show' : 'Movie'}</span>
                </div>
                <strong>{item.name}</strong>
                <small>
                  {item.releaseInfo && <><Calendar size={13} /> {item.releaseInfo}</>}
                  {item.imdbRating && <><Star size={13} /> {item.imdbRating}</>}
                </small>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-header">
            <div>
              <span className="section-kicker">Watch</span>
              <h2>{selectedItem ? selectedItem.name : 'Choose a title'}</h2>
            </div>
            <button className="primary-button" type="button" onClick={handleWatch} disabled={!selectedItem || streamLoading}>
              {streamLoading ? <Loader2 className="spin" size={18} /> : canWatch ? <Play size={18} /> : <Lock size={18} />}
              {canWatch ? 'Find sources' : 'Unlock'}
            </button>
          </div>

          {selectedItem?.type === 'series' && (
            <div className="episode-grid compact">
              <label>
                Season
                <input type="number" min="1" value={season} onChange={(event) => setSeason(event.target.value)} />
              </label>
              <label>
                Episode
                <input type="number" min="1" value={episode} onChange={(event) => setEpisode(event.target.value)} />
              </label>
            </div>
          )}

          {error && (
            <div className="notice" role="alert">
              <AlertTriangle size={20} />
              <div>
                <strong>Heads up</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!streams.length && !streamLoading && (
            <div className="empty-state">
              {canWatch ? <Play size={34} /> : <Lock size={34} />}
              <h3>{canWatch ? 'Ready to check sources.' : 'Members can unlock playback.'}</h3>
              <p>{canWatch ? 'Pick a title above, then find available sources.' : 'Sign in with Discord and make sure your account has an allowed role.'}</p>
            </div>
          )}

          {streamLoading && (
            <div className="loading-state">
              <Loader2 className="spin" size={28} />
              Checking available sources...
            </div>
          )}

          <div className="stream-list">
            <AnimatePresence>
              {streams.map((stream, index) => (
                <motion.article
                  className="stream-card"
                  key={stream.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <div className="quality-chip">{stream.quality}</div>
                  <div className="stream-body">
                    <span>{stream.provider}</span>
                    <h3>{stream.title}</h3>
                    {stream.description && <p>{stream.description}</p>}
                    <dl>
                      <div>
                        <dt>Size</dt>
                        <dd>{stream.size || 'Unknown'}</dd>
                      </div>
                      <div>
                        <dt>Seeders</dt>
                        <dd>{stream.seeders ?? 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="stream-actions">
                    <button type="button" onClick={() => copyStreamUrl(stream)} disabled={!stream.url}>
                      <Copy size={17} />
                      {copiedId === stream.id ? 'Copied' : 'Copy URL'}
                    </button>
                    <button type="button" onClick={() => stream.url && window.open(stream.url, '_blank')} disabled={!stream.url}>
                      <ExternalLink size={17} />
                      Open
                    </button>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showAccessModal && (
          <Modal onClose={() => setShowAccessModal(false)}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">Access</span>
                <h2>Discord membership</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setShowAccessModal(false)} aria-label="Close access">
                <X size={20} />
              </button>
            </div>

            {auth ? (
              <div className="access-card">
                <UserRound size={22} />
                <div>
                  <strong>{auth.user?.global_name || auth.user?.username}</strong>
                  <span>{canWatch ? 'Playback is unlocked for this account.' : 'This account is signed in, but does not have an allowed role.'}</span>
                </div>
              </div>
            ) : (
              <div className="access-card">
                <Lock size={22} />
                <div>
                  <strong>Sign in to watch</strong>
                  <span>Only approved Discord roles can open playback sources.</span>
                </div>
              </div>
            )}

            {!accessConfig.discordClientId || !accessConfig.discordGuildIds.length ? (
              <div className="notice">
                <AlertTriangle size={20} />
                <div>
                  <strong>Discord is not configured</strong>
                  <span>Add your client id, guild id, and allowed role ids in src/accessConfig.js.</span>
                </div>
              </div>
            ) : auth ? (
              <button className="secondary-button full-width" type="button" onClick={handleLogout}>
                <LogOut size={18} />
                Sign out
              </button>
            ) : (
              <a className="primary-link full-width" href={loginUrl}>
                <LogIn size={18} />
                Continue with Discord
              </a>
            )}

          </Modal>
        )}

        {showSettings && (
          <Modal onClose={() => setShowSettings(false)}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">Service</span>
                <h2>Source settings</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setShowSettings(false)} aria-label="Close settings">
                <X size={20} />
              </button>
            </div>

            <label className="field">
              <span><Globe2 size={16} /> Source URL</span>
              <input
                value={draftConfig.baseUrl}
                onChange={(event) => setDraftConfig({ ...draftConfig, baseUrl: event.target.value })}
                placeholder="https://stream.example.com"
              />
            </label>

            <div className="settings-grid">
              <label className="field">
                <span><UserRound size={16} /> User</span>
                <input
                  value={draftConfig.uuid}
                  onChange={(event) => setDraftConfig({ ...draftConfig, uuid: event.target.value })}
                  placeholder="Optional"
                />
              </label>

              <label className="field">
                <span><KeyRound size={16} /> Key</span>
                <input
                  type="password"
                  value={draftConfig.password}
                  onChange={(event) => setDraftConfig({ ...draftConfig, password: event.target.value })}
                  placeholder="Optional"
                />
              </label>
            </div>

            <button className="primary-button full-width" type="button" onClick={handleSaveSettings}>
              Save settings
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

function Modal({ children, onClose }) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.section
        className="settings-modal"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </motion.section>
    </motion.div>
  );
}

export default App;
