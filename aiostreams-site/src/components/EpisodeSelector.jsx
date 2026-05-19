import React, { useMemo } from 'react';
import { Play } from 'lucide-react';

export default function EpisodeSelector({ videos, selectedSeason, selectedEpisode, onSelect }) {
  // Extract unique seasons and sort them
  const seasons = useMemo(() => {
    if (!videos || !videos.length) return [];
    return [...new Set(videos.map((v) => v.season))].sort((a, b) => a - b);
  }, [videos]);

  // Get episodes for the currently selected season
  const currentEpisodes = useMemo(() => {
    if (!videos || !videos.length) return [];
    return videos
      .filter((v) => v.season === Number(selectedSeason))
      .sort((a, b) => a.episode - b.episode);
  }, [videos, selectedSeason]);

  // Check if an episode is "NEW" (released within the last 14 days)
  const isNewEpisode = (releasedDate) => {
    if (!releasedDate) return false;
    const releaseTime = new Date(releasedDate).getTime();
    const now = Date.now();
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
              // Automatically select the first episode when switching seasons
              onSelect(seasonNum, 1);
            }}
          >
            Season {seasonNum}
          </button>
        ))}
      </div>

      <div className="episode-list-wrapper">
        <div className="episode-list">
          {currentEpisodes.map((ep) => {
            const isActive = Number(selectedEpisode) === ep.episode;
            const isNew = isNewEpisode(ep.released || ep.firstAired);

            return (
              <button
                key={ep.id}
                className={`episode-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(ep.season, ep.episode)}
              >
                <div className="episode-thumbnail-wrap">
                  {ep.thumbnail ? (
                    <img className="episode-thumbnail" src={ep.thumbnail} alt={`Episode ${ep.episode}`} loading="lazy" />
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
                    <span className="episode-number">{ep.episode}.</span>
                    <span className="episode-title">{ep.name || `Episode ${ep.episode}`}</span>
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
