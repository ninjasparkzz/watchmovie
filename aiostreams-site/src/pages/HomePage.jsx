import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Film, Tv, Sparkles, ShieldCheck, Star, Calendar, Loader2, Download,
} from 'lucide-react';
import { fetchCatalog } from '../utils/streamUtils';

const mediaTypes = [
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'series', label: 'Shows', icon: Tv },
  { id: 'anime', label: 'Anime', icon: Sparkles },
];

const featuredFallback = [
  { id: 'tt15398776', type: 'movie', name: 'Oppenheimer', poster: 'https://images.metahub.space/poster/medium/tt15398776/img', releaseInfo: '2023', imdbRating: '8.3' },
  { id: 'tt0944947', type: 'series', name: 'Game of Thrones', poster: 'https://images.metahub.space/poster/medium/tt0944947/img', releaseInfo: '2011-2019', imdbRating: '9.2' },
  { id: 'tt0903747', type: 'series', name: 'Breaking Bad', poster: 'https://images.metahub.space/poster/medium/tt0903747/img', releaseInfo: '2008-2013', imdbRating: '9.5' },
  { id: 'tt1375666', type: 'movie', name: 'Inception', poster: 'https://images.metahub.space/poster/medium/tt1375666/img', releaseInfo: '2010', imdbRating: '8.8' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const isElectron = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && window.navigator.userAgent.toLowerCase().includes('electron');
  const [mediaType, setMediaType] = useState('movie');
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState(featuredFallback);
  const [catalogTitle, setCatalogTitle] = useState('Recommended tonight');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState('');

  const activeType = mediaTypes.find((type) => type.id === mediaType);
  const ActiveIcon = activeType?.icon || Film;

  const loadRecommendations = async (type) => {
    setCatalogLoading(true);
    setError('');
    try {
      const items = await fetchCatalog(type);
      setCatalog(items.length ? items : featuredFallback);
      setCatalogTitle(
        type === 'movie' ? 'Recommended movies' : type === 'series' ? 'Recommended shows' : 'Recommended anime',
      );
    } catch {
      setCatalog(featuredFallback);
      setCatalogTitle('Recommended tonight');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const items = await fetchCatalog('movie');
        if (cancelled) return;
        setCatalog(items.length ? items : featuredFallback);
        setCatalogTitle(items.length ? 'Recommended movies' : 'Recommended tonight');
      } catch {
        if (!cancelled) {
          setCatalog(featuredFallback);
          setCatalogTitle('Recommended tonight');
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      loadRecommendations(mediaType);
      return;
    }
    setCatalogLoading(true);
    setError('');
    try {
      const items = await fetchCatalog(mediaType, query);
      setCatalog(items);
      setCatalogTitle(items.length ? `Results for "${query.trim()}"` : 'No matches found');
    } catch {
      setError('Search is unavailable right now.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const openTitle = (item) => {
    const type = item.type === 'series' ? 'series' : 'movie';
    navigate(`/watch/${type}/${item.id}`);
  };

  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow"><ShieldCheck size={16} /> Members only</span>
          <h1>Movies and shows, ready when you are.</h1>
          <p>Search by title, pick something worth watching, and unlock playback with your community access.</p>
        </div>

        <form className="search-panel" onSubmit={handleSearch}>
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

          <label className="input-label" htmlFor="catalog-search">Search the library</label>
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

      {error && (
        <div className="notice browse-section" role="alert">
          <span>{error}</span>
        </div>
      )}

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
              className="poster-card"
              type="button"
              onClick={() => openTitle(item)}
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

      {!isElectron && (
        <section className="download-banner">
          <div className="download-content">
            <span className="section-kicker">Desktop Experience</span>
            <h2>Get the WatchTV Desktop App</h2>
            <p>
              Experience faster playback with built-in ad-blocking, custom keyboard shortcuts (F11 Fullscreen, Ctrl+T Always-on-Top), system tray minimization, and hardware-accelerated streams.
            </p>
            <div className="download-buttons">
              <a href="https://github.com/ninjasparkzz/watchmovie/releases/download/v1.0.0/WatchTV.Setup.0.0.0.exe" download className="primary-button download-btn" style={{ textDecoration: 'none' }}>
                <Download size={19} />
                Download for Windows
              </a>
              <span className="download-meta">WatchTV Setup 0.0.0 (x64)</span>
            </div>
          </div>
          <div className="download-preview" aria-hidden="true">
            <div className="preview-window">
              <div className="window-header">
                <div className="window-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="window-address">WatchTV.exe</div>
              </div>
              <div className="preview-body">
                <div className="preview-hero"></div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
