import { useState } from 'react';
import { Link } from 'react-router';
import { MODES, SAFETY_TEXT, suggestedMode } from '../domain/modes';
import { useProfiles } from '../state/useProfiles';

export default function Home() {
  const { loaded, profiles, active } = useProfiles();
  const [today] = useState(() => new Date());

  if (!loaded) {
    return (
      <>
        <p>Loading...</p>
        <p className="safety">{SAFETY_TEXT}</p>
      </>
    );
  }

  const suggestion = active ? MODES.find((m) => m.id === suggestedMode(active, today)) : undefined;

  return (
    <>
      <h1>FlexNext</h1>
      {profiles.length === 0 ? (
        <p>
          <Link to="/profiles">Create a profile</Link> to get started.
        </p>
      ) : !active ? (
        <p>
          No active profile. <Link to="/profiles">Select one</Link>.
        </p>
      ) : (
        <section className="card">
          <p className="label">Active profile</p>
          <p className="big-text">{active.name}</p>
          {suggestion && (
            <p>
              Suggested today: <Link to="/modes">{suggestion.name}</Link>
            </p>
          )}
        </section>
      )}
      <p className="safety">{SAFETY_TEXT}</p>
    </>
  );
}
