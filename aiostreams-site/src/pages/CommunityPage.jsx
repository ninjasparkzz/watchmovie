import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, CalendarClock, Crown, PartyPopper, Plus, Star, Trophy, Users,
} from 'lucide-react';
import { useCommunity } from '../context/useCommunity';

function formatTime(value) {
  const diff = Math.max(1, Math.round((Date.now() - value) / 60000));
  if (diff < 60) return `${diff}m ago`;
  const hours = Math.round(diff / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const {
    member, picks, activity, parties, createParty, adminSettings,
  } = useCommunity();

  const startOpenParty = () => {
    const party = createParty({ name: adminSettings.featuredTitle || 'Community Night' });
    navigate(`/party/${party.roomId}`);
  };

  return (
    <main className="community-page animate-fade-in">
      <section className="community-hero">
        <div>
          <span className="eyebrow"><Users size={16} /> Discord community</span>
          <h1>{adminSettings.featuredTitle}</h1>
          <p>{adminSettings.announcement}</p>
        </div>
        <div className="community-hero-actions">
          <button className="primary-button" type="button" onClick={startOpenParty}>
            <PartyPopper size={18} />
            Start party
          </button>
          <Link className="secondary-button" to="/profile">
            <Crown size={18} />
            Profile
          </Link>
        </div>
      </section>

      <section className="browse-section">
        <div className="section-header">
          <div>
            <span className="section-kicker">Community picks</span>
            <h2>Top voted this week</h2>
          </div>
          <Link className="quiet-pill" to="/admin">Admin</Link>
        </div>
        <div className="community-pick-grid">
          {picks.map((pick, index) => (
            <Link key={pick.id} className="community-pick-card" to={`/watch/${pick.type === 'series' ? 'series' : 'movie'}/${pick.id}`}>
              <div className="pick-rank"><Trophy size={16} /> #{index + 1}</div>
              {pick.poster ? <img src={pick.poster} alt="" loading="lazy" /> : <div className="pick-poster-fallback"><Star size={26} /></div>}
              <div>
                <strong>{pick.name}</strong>
                <span>{pick.votes || 0} votes</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="community-columns">
        <section className="browse-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Watch parties</span>
              <h2>Open rooms</h2>
            </div>
            <button className="icon-button" type="button" onClick={startOpenParty} aria-label="Create watch party">
              <Plus size={20} />
            </button>
          </div>
          <div className="stack-list">
            {parties.length ? parties.map((party) => (
              <Link key={party.roomId} className="stack-card" to={`/party/${party.roomId}`}>
                <CalendarClock size={20} />
                <div>
                  <strong>{party.title}</strong>
                  <span>{party.members.length} members · hosted by {party.host}</span>
                </div>
              </Link>
            )) : (
              <div className="workspace-empty">
                <PartyPopper size={28} />
                <p>No rooms yet. Start one for {member.name}.</p>
              </div>
            )}
          </div>
        </section>

        <section className="browse-section">
          <div className="section-header">
            <div>
              <span className="section-kicker">Activity</span>
              <h2>Server pulse</h2>
            </div>
            <Activity size={22} />
          </div>
          <div className="activity-feed">
            {activity.slice(0, 8).map((item) => (
              <div key={item.id} className="activity-item">
                <span />
                <div>
                  <strong>{item.actor}</strong>
                  <p>{item.action} {item.detail}</p>
                  <small>{formatTime(item.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
