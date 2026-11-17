import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Play, Star, Clock, Calendar, Users, PlayCircle,
  Copy, Loader2, AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import EpisodeSelector from '../components/EpisodeSelector';
import {
  buildStreamHeaders, canPlayStream, cleanBaseUrl,
  extractStreams, normalizeStream, sortStreamsForWebPlay,
  EMBED_SERVERS, getEmbedStream,
} from '../utils/streamUtils';

const CATALOG_BASE = 'https://v3-cinemeta.strem.io';

export default function TitlePage() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    config, auth, canWatch, setShowAccessModal, isDiscordConfigured, error: globalError,
  } = useApp();

  const mediaType = type === 'series' ? 'series' : 'movie';
  const [season, setSeason] = useState(searchParams.get('s') || '1');
  const [episode, setEpisode] = useState(searchParams.get('e') || '1');
  const [meta, setMeta] = useState(null);
  const [streams, setStreams] = useState([]);
  const [streamLoading, setStreamLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [copiedId, setCopiedId] = useState('');
  const [localError, setLocalError] = useState('');
  const [selectedServer, setSelectedServer] = useState('vidlink');

  const mediaId = useMemo(
    () => (mediaType === 'series' ? `${id}:${season}:${episode}` : id),
    [id, mediaType, season, episode],
  );

  const selectedEpisodeTitle = useMemo(() => {
    if (mediaType !== 'series' || !Array.isArray(meta?.videos)) return '';
    const match = meta.videos.find((video) => (
      Number(video.season) === Number(season)
      && Number(video.episode || video.number) === Number(episode)
    ));
    return match?.name || `Season ${season}, Episode ${episode}`;
  }, [episode, mediaType, meta, season]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPageLoading(true);
      setLocalError('');
      try {
        const response = await axios.get(`${CATALOG_BASE}/meta/${mediaType}/${id}.json`);
        if (!cancelled) setMeta(response.data.meta);
      } catch {
        if (!cancelled) setLocalError('Could not load title details.');
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, mediaType]);

  useEffect(() => {
    const s = searchParams.get('s');
    const e = searchParams.get('e');
    if (s) setSeason(s);
    if (e) setEpisode(e);
  }, [searchParams]);

  const handleFindSources = async () => {
    if (isDiscordConfigured() && (!auth || !canWatch)) {
      setShowAccessModal(true);
      return;
    }

    setStreamLoading(true);
    setLocalError('');
    setStreams([]);

    try {
      let results = [];
      const hasCustomBackend = config.baseUrl && !config.baseUrl.includes('ninjasparkzz-watch-backend');

      // 1. Try custom backend if provided
      if (hasCustomBackend) {
        try {
          const response = await axios.get(`${cleanBaseUrl(config.baseUrl)}/api/v1/search`, {
            params: {
              type: mediaType,
              id: mediaId,
              user: config.uuid,
              password: config.password,
            },
            headers: buildStreamHeaders(config),
            timeout: 10000,
          });

          if (response.data && typeof response.data === 'object') {
            results = extractStreams(response.data).map(normalizeStream);
          }
        } catch (backendErr) {
          console.warn('Custom backend error:', backendErr.message);
        }
      }

      // 2. Query Torrentio for rich P2P streams
      if (!results.length) {
        try {
          const torrentioUrl = `https://torrentio.strem.fun/stream/${mediaType}/${mediaId}.json`;
          const response = await axios.get(torrentioUrl, { timeout: 12000 });
          if (response.data && typeof response.data === 'object') {
            results = extractStreams(response.data).map(normalizeStream);
          }
        } catch (torrentioErr) {
          console.warn('Torrentio error:', torrentioErr.message);
        }
      }

      const normalized = sortStreamsForWebPlay(results);
      setStreams(normalized);
      if (!normalized.length) {
        setLocalError('No torrent sources found. Click "Watch Online" above to play directly via web stream.');
      }
    } catch (err) {
      const detail = err.response?.data?.error?.message
        || err.response?.data?.detail
        || err.message;
      setLocalError(detail || 'Could not fetch sources. Please click "Watch Online" above to stream directly.');
    } finally {
      setStreamLoading(false);
    }
  };

  const playStream = (stream) => {
    if (!canPlayStream(stream)) return;
    const finalTitle = mediaType === 'series'
      ? `${meta?.name || id} - Season ${season}, Episode ${episode}`
      : (meta?.name || id);
    navigate(`/watch/${mediaType}/${id}/play`, {
      state: {
        stream,
        title: finalTitle,
        season,
        episode,
        videos: meta?.videos || [],
        moviedb_id: meta?.moviedb_id || null,
        meta: {
          name: meta?.name || id,
          poster: meta?.poster || '',
          background: meta?.background || '',
          season: mediaType === 'series' ? season : undefined,
          episode: mediaType === 'series' ? episode : undefined,
        }
      },
    });
  };

  const handleWatchDirect = (serverId = selectedServer) => {
    const stream = getEmbedStream(serverId, meta, id, season, episode, mediaType);
    const finalTitle = mediaType === 'series'
      ? `${meta?.name || id} - Season ${season}, Episode ${episode}`
      : (meta?.name || id);

    navigate(`/watch/${mediaType}/${id}/play`, {
      state: {
        stream,
        title: finalTitle,
        season,
        episode,
        videos: meta?.videos || [],
        moviedb_id: meta?.moviedb_id || id,
        serverId: stream.serverId,
        meta: {
          name: meta?.name || id,
          poster: meta?.poster || '',
          background: meta?.background || '',
          season: mediaType === 'series' ? season : undefined,
          episode: mediaType === 'series' ? episode : undefined,
        }
      },
    });
  };

  const copyStreamUrl = async (stream) => {
    const text = stream.url || (stream.infoHash ? `magnet:?xt=urn:btih:${stream.infoHash}` : '');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(stream.id);
    window.setTimeout(() => setCopiedId(''), 1200);
  };

  if (pageLoading) {
    return (
      <main className="title-page">
        <div className="loading-state">
          <Loader2 className="spin" size={28} />
          <span>Loading…</span>
        </div>
      </main>
    );
  }

  const displayError = localError || globalError;

  return (
    <main className="title-page animate-fade-in">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} />
        Back to browse
      </Link>

      <section
        className="media-hero title-hero"
        style={{ backgroundImage: `url(${meta?.background || meta?.poster || ''})` }}
      >
        <div className="hero-overlay" />
        <div className="hero-content">
          {meta?.poster && <img className="hero-poster" src={meta.poster} alt="" />}
          <div className="hero-info">
            <div className="hero-meta">
              {meta?.imdbRating && (
                <span className="meta-badge rating"><Star size={14} fill="currentColor" /> {meta.imdbRating}</span>
              )}
              {meta?.runtime && <span className="meta-badge"><Clock size={14} /> {meta.runtime}</span>}
              {(meta?.year || meta?.releaseInfo) && (
                <span className="meta-badge"><Calendar size={14} /> {meta.year || meta.releaseInfo}</span>
              )}
            </div>
            <h1>{meta?.name || id}</h1>
            <p className="description">{meta?.description || 'No description available.'}</p>

            {Array.isArray(meta?.cast) && meta.cast.length > 0 && (
              <div className="cast-list">
                <Users size={16} />
                <span>
                  {meta.cast.slice(0, 5).map((c) => (typeof c === 'string' ? c : c.name || c)).filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {mediaType === 'series' && (
              <div className="hero-selected-episode">
                <span className="section-kicker">Selected episode</span>
                <strong>{selectedEpisodeTitle}</strong>
              </div>
            )}

            <div className="hero-actions">
              <button className="primary-button direct-play-btn" type="button" onClick={() => handleWatchDirect(selectedServer)}>
                <PlayCircle size={18} /> Watch Online
              </button>

              <button className="secondary-button" type="button" onClick={handleFindSources} disabled={streamLoading}>
                {streamLoading ? (
                  <><Loader2 className="spin" size={18} /> Finding sources…</>
                ) : (
                  <><Play size={18} fill="currentColor" /> Find torrents</>
                )}
              </button>
            </div>

            <div className="server-selector-row">
              <span className="server-label">Server:</span>
              {EMBED_SERVERS.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  className={`server-pill ${selectedServer === server.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedServer(server.id)}
                >
                  {server.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {mediaType === 'series' && Array.isArray(meta?.videos) && meta.videos.length > 0 && (
        <section className="browse-section episode-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Episodes</span>
              <h2>Choose an episode</h2>
            </div>
          </div>
          <EpisodeSelector
            videos={meta.videos}
            selectedSeason={season}
            selectedEpisode={episode}
            onSelect={(nextSeason, nextEpisode) => {
              setSeason(String(nextSeason));
              setEpisode(String(nextEpisode));
              setStreams([]);
              setLocalError('');
            }}
          />
        </section>
      )}

      {displayError && (
        <div className="notice" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Heads up</strong>
            <span>{displayError}</span>
          </div>
        </div>
      )}

      {streams.length > 0 && (
        <section className="browse-section sources-section-page">
          <h3>Available streams</h3>
          <p className="sources-hint">
            Sources are sorted for browser playback (1080p first). 4K remux torrents often hang — use 1080p/720p, or enable debrid on AIOStreams for instant play.
          </p>
          <div className="sources-grid">
            {streams.map((stream) => (
              <div key={stream.id} className="source-card">
                <div className="source-main">
                  <div className="source-icon"><PlayCircle size={24} /></div>
                  <div className="source-details">
                    <span className="source-name">{stream.provider}</span>
                    <span className="source-title">{stream.title}</span>
                    {stream.quality && <span className="source-quality">{stream.quality}</span>}
                    {stream.seeders != null && <span className="source-quality">{stream.seeders} seeders</span>}
                  </div>
                </div>
                <div className="source-actions">
                  <button className="watch-btn" type="button" onClick={() => playStream(stream)} disabled={!canPlayStream(stream)}>
                    Play now
                  </button>
                  <button className="copy-btn" type="button" onClick={() => copyStreamUrl(stream)} disabled={!canPlayStream(stream)} aria-label="Copy link">
                    <Copy size={16} />
                    {copiedId === stream.id ? 'Copied' : ''}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
