import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Save, UserRound } from 'lucide-react';
import { useCommunity } from '../context/useCommunity';

export default function ProfilePage() {
  const {
    member, profile, setProfile, picks, activity,
  } = useCommunity();

  return (
    <main className="profile-page animate-fade-in">
      <Link className="back-link" to="/community">
        <ArrowLeft size={18} />
        Back to community
      </Link>

      <section className="profile-hero browse-section">
        <div className="profile-avatar">
          {member.avatar ? <img src={member.avatar} alt="" /> : <UserRound size={42} />}
        </div>
        <div>
          <span className="section-kicker">Discord profile</span>
          <h1>{member.name}</h1>
          <p>{member.isSignedIn ? `@${member.username}` : 'Sign in with Discord to personalize this profile.'}</p>
        </div>
        <span className={`quiet-pill ${member.isSignedIn ? 'is-allowed' : ''}`}>
          <BadgeCheck size={15} />
          {member.isSignedIn ? 'Verified' : 'Guest'}
        </span>
      </section>

      <section className="browse-section">
        <div className="section-header">
          <div>
            <span className="section-kicker">Preferences</span>
            <h2>Member settings</h2>
          </div>
        </div>

        <label className="field">
          <span>Status</span>
          <input
            value={profile.status}
            onChange={(event) => setProfile({ ...profile, status: event.target.value })}
            placeholder="Ready for movie night"
          />
        </label>

        <label className="field">
          <span>Favorite genres</span>
          <input
            value={(profile.favoriteGenres || []).join(', ')}
            onChange={(event) => setProfile({
              ...profile,
              favoriteGenres: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
            })}
            placeholder="Action, Sci-Fi, Thriller"
          />
        </label>

        <button className="primary-button full-width" type="button">
          <Save size={18} />
          Saved automatically
        </button>
      </section>

      <section className="browse-section">
        <div className="profile-stats">
          <div>
            <strong>{picks.length}</strong>
            <span>community picks</span>
          </div>
          <div>
            <strong>{activity.filter((item) => item.actor === member.name).length}</strong>
            <span>your actions</span>
          </div>
          <div>
            <strong>{profile.favoriteGenres?.length || 0}</strong>
            <span>favorite genres</span>
          </div>
        </div>
      </section>
    </main>
  );
}
