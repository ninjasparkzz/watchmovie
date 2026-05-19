import { Link } from 'react-router-dom';
import { ArrowLeft, Megaphone, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useCommunity } from '../context/useCommunity';

export default function AdminPage() {
  const {
    adminSettings, setAdminSettings, picks, setPicks, addActivity, member,
  } = useCommunity();

  const clearPicks = () => {
    setPicks([]);
    addActivity('cleared', 'community picks', member.name);
  };

  return (
    <main className="admin-page animate-fade-in">
      <Link className="back-link" to="/community">
        <ArrowLeft size={18} />
        Back to community
      </Link>

      <section className="browse-section">
        <div className="section-header">
          <div>
            <span className="section-kicker">Discord admin</span>
            <h2>Community dashboard</h2>
          </div>
          <ShieldCheck size={24} />
        </div>

        <label className="field">
          <span><Megaphone size={16} /> Featured title</span>
          <input
            value={adminSettings.featuredTitle}
            onChange={(event) => setAdminSettings({ ...adminSettings, featuredTitle: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Announcement</span>
          <input
            value={adminSettings.announcement}
            onChange={(event) => setAdminSettings({ ...adminSettings, announcement: event.target.value })}
          />
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={adminSettings.allowMemberParties}
            onChange={(event) => setAdminSettings({ ...adminSettings, allowMemberParties: event.target.checked })}
          />
          <span>Allow members to create watch parties</span>
        </label>

        <button className="primary-button full-width" type="button" onClick={() => addActivity('updated', 'community settings', member.name)}>
          <Save size={18} />
          Save dashboard
        </button>
      </section>

      <section className="browse-section">
        <div className="section-header">
          <div>
            <span className="section-kicker">Voting</span>
            <h2>Manage picks</h2>
          </div>
          <button className="secondary-button" type="button" onClick={clearPicks}>
            <Trash2 size={17} />
            Clear
          </button>
        </div>
        <div className="stack-list">
          {picks.map((pick) => (
            <div key={pick.id} className="stack-card">
              <strong>{pick.name}</strong>
              <span>{pick.votes || 0} votes</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
