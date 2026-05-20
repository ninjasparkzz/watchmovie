import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X, ChevronRight } from 'lucide-react';
import StreamPlayer from '../components/StreamPlayer';

export default function PlayerPage() {
  const { type, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { stream, title } = location.state || {};

  const isElectron = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && window.navigator.userAgent.toLowerCase().includes('electron');

  // --- Continue Watching Logic ---
  useEffect(() => {
    if (!stream) return;

    let items = [];
    try {
      items = JSON.parse(localStorage.getItem('watchtv_continue_watching')) || [];
    } catch {
      items = [];
    }

    // Remove existing entry for the same media ID
    items = items.filter((item) => item.id !== id);

    const newItem = {
      id,
      type,
      title: location.state?.meta?.name || title.split(' - ')[0] || id,
      poster: location.state?.meta?.poster || '',
      background: location.state?.meta?.background || '',
      season: location.state?.season || null,
      episode: location.state?.episode || null,
      timestamp: Date.now(),
      stream,
    };

    items.unshift(newItem);
    // Keep top 10 items
    items = items.slice(0, 10);
    localStorage.setItem('watchtv_continue_watching', JSON.stringify(items));
  }, [id, type, stream, title, location.state]);

  // --- Discord Rich Presence (RPC) ---
  useEffect(() => {
    if (!stream) return;
    if (isElectron && window.electronAPI && typeof window.electronAPI.updatePresence === 'function') {
      const presenceDetails = type === 'series'
        ? {
            details: `Watching ${location.state?.meta?.name || title.split(' - ')[0]}`,
            state: `Season ${location.state?.season}, Episode ${location.state?.episode}`,
            startTime: Date.now(),
          }
        : {
            details: `Watching ${title}`,
            state: `Cinema Mode`,
            startTime: Date.now(),
          };
      window.electronAPI.updatePresence(presenceDetails);

      // Clear presence on unmount
      return () => {
        window.electronAPI.updatePresence(null);
      };
    }
  }, [isElectron, stream, type, title, location.state]);

  // --- Next Episode Identification ---
  const nextVideo = useMemo(() => {
    if (type !== 'series' || !Array.isArray(location.state?.videos)) return null;
    const curSeason = Number(location.state?.season || 1);
    const curEpisode = Number(location.state?.episode || 1);

    // Find next episode in the same season
    const sameSeasonNext = location.state.videos.find(
      (v) => Number(v.season) === curSeason && Number(v.episode || v.number) === curEpisode + 1
    );
    if (sameSeasonNext) return sameSeasonNext;

    // Or first episode of next season
    const nextSeasonFirst = location.state.videos.find(
      (v) => Number(v.season) === curSeason + 1 && Number(v.episode || v.number) === 1
    );
    return nextSeasonFirst;
  }, [type, location.state]);

  const handlePlayNext = () => {
    if (!nextVideo) return;
    const nextS = String(nextVideo.season);
    const nextE = String(nextVideo.episode || nextVideo.number);
    const tmdbId = location.state?.moviedb_id || id;
    const nextUrl = `https://www.vidking.net/embed/tv/${tmdbId}/${nextS}/${nextE}`;

    const newStream = {
      id: `vidking-${tmdbId}`,
      title: 'Vidking Direct',
      provider: 'Vidking',
      quality: '1080P',
      url: nextUrl,
    };

    const baseTitle = location.state?.meta?.name || title.split(' - ')[0] || id;

    navigate(`/watch/${type}/${id}/play`, {
      replace: true,
      state: {
        stream: newStream,
        title: `${baseTitle} - Season ${nextS}, Episode ${nextE}`,
        season: nextS,
        episode: nextE,
        videos: location.state?.videos,
        moviedb_id: tmdbId,
        meta: location.state?.meta,
      },
    });
  };

  if (!stream) {
    return (
      <main className="title-page">
        <p className="sources-hint">No stream selected.</p>
        <Link className="back-link" to={`/watch/${type}/${id}`}>
          <ArrowLeft size={18} />
          Back to title
        </Link>
      </main>
    );
  }

  return (
    <main className="player-page animate-fade-in">
      <div className="player-page-bar">
        <button
          className="back-link as-button"
          type="button"
          onClick={() => navigate(`/watch/${type}/${id}`)}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h1>{title}</h1>
        
        <div className="player-bar-right">
          {nextVideo && (
            <button
              className="primary-button next-episode-bar-btn"
              type="button"
              onClick={handlePlayNext}
            >
              <span>Next Episode</span>
              <ChevronRight size={18} />
            </button>
          )}
          <button
            className="icon-button"
            type="button"
            onClick={() => navigate(`/watch/${type}/${id}`)}
            aria-label="Close player"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      <section className="player-content player-content-page">
        <StreamPlayer stream={stream} title={title} />
        <div className="player-footer">
          <p>
            {stream.streamType === 'p2p' && (
              <>Streaming via WebTorrent — this can take a minute for large files. </>
            )}
            <Link to={`/watch/${type}/${id}`}>Pick another source</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
