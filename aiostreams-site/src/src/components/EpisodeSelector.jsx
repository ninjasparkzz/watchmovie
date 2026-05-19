import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';

export default function EpisodeSelector({ videos, selectedSeason, selectedEpisode, onSelect }) {
  const [now] = useState(() => Date.now());

  // Extract unique seasons and sort them
  const seasons = useMemo(() => {
    if (!videos || !videos.length) return [];
    return [...new Set(videos.map((v) => Number(v.season)).filter(Boolean))].sort((a, b) => a - b);
  }, [videos]);

  const episodesBySeason = useMemo(() => {
    if (!videos || !videos.length) return [];
    return seasons.reduce((grouped, season) => ({
      ...grouped,
      [season]: videos
        .filter((v) => Number(v.season) === season)
        .sort((a, b) => Number(a.episode || a.number) - Number(b.episode || b.number)),
    }), {});
  }, [seasons, videos]);

  // Get episodes for the currently selected season
  const currentEpisodes = episodesBySeason[Number(selectedSeason)] || [];

  // Check if an episode is "NEW" (released within the last 14 days)
  const isNewEpisode = (releasedDate) => {
    if (!releasedDate) return false;
    const releaseTime = new Date(releasedDate).getTime();
    const diffDays = (now - releaseTime) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 14;
  };

  if (!seasons.length) return null;

  return (
    <div className="episode-selector-container">
      <div className="season-tabs">
        {seasons.map((seasonNum) => (
          <button
            key={seasonNum}
            className={`season-tab ${Number(selectedSeason) === seasonNum ? 'active' : ''}`}
            onClick={() => {
              const firstEpisode = episodesBySeason[seasonNum]?.[0];
              onSelect(seasonNum, firstEpisode?.episode || firstEpisode?.number || 1);
            }}
          >
            Season {seasonNum}
          </button>
        ))}
      </div>

      <div className="episode-list-wrapper">
        <div className="episode-list">
          {currentEpisodes.map((ep) => {
            const episodeNumber = Number(ep.episode || ep.number);
            const isActive = Number(selectedEpisode) === episodeNumber;
            const isNew = isNewEpisode(ep.released || ep.firstAired);

            return (
              <button
                key={ep.id || `${ep.season}-${episodeNumber}`}
                className={`episode-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(ep.season, episodeNumber)}
              >
                <div className="episode-thumbnail-wrap">
                  {ep.thumbnail ? (
                    <img className="episode-thumbnail" src={ep.thumbnail} alt={`Episode ${episodeNumber}`} loading="lazy" />
                  ) : (
                    <div className="episode-thumbnail fallback-thumb">
                      <Play size={24} opacity={0.3} />
                    </div>
                  )}
                  {isActive && (
                    <div className="episode-active-overlay">
                      <Play size={32} fill="currentColor" />
                    </div>
                  )}
                  {isNew && <span className="new-badge">NEW</span>}
                </div>
                
                <div className="episode-info">
                  <div className="episode-title-row">
                    <span className="episode-number">E{episodeNumber}</span>
                    <span className="episode-title">{ep.name || `Episode ${episodeNumber}`}</span>
                  </div>
                  <p className="episode-desc">
                    {ep.description || ep.overview || 'No description available.'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
