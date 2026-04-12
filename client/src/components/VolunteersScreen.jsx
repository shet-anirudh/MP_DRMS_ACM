import React from 'react';

const DUMMY_VOLUNTEERS = [
  { id: '1', name: 'Alice Chen', initials: 'AC', skill: 'First Aid', lat: 34.05, lon: -118.24, status: 'Available', distanceKm: 0.5 },
  { id: '2', name: 'Bob Smith', initials: 'BS', skill: 'Logistics', lat: 34.06, lon: -118.26, status: 'Busy', distanceKm: 1.2 },
  { id: '3', name: 'Carlos R.', initials: 'CR', skill: 'Medical', lat: 34.04, lon: -118.23, status: 'Available', distanceKm: 2.5 },
  { id: '4', name: 'Diana W.', initials: 'DW', skill: 'Search', lat: 34.07, lon: -118.25, status: 'Available', distanceKm: 0.8 },
  { id: '5', name: 'Evan T.', initials: 'ET', skill: 'Communications', lat: 34.08, lon: -118.27, status: 'Busy', distanceKm: 3.1 },
];

export function VolunteersScreen() {
  // Sort volunteers by distance
  const sortedVolunteers = [...DUMMY_VOLUNTEERS].sort((a, b) => a.distanceKm - b.distanceKm);
  
  // Find closest available volunteer for "Needed" badge (mock logic)
  const closestAvailable = sortedVolunteers.find(v => v.status === 'Available');

  const availableVols = sortedVolunteers.filter(v => v.status === 'Available');
  const busyVols = sortedVolunteers.filter(v => v.status === 'Busy');

  const VolunteerCard = ({ volunteer, isNeeded }) => (
    <div className="card flex-row align-center gap-16" style={{ marginBottom: 12, border: '1px solid rgba(0,0,0,0.05)' }}>
      <div className={`avatar ${volunteer.status.toLowerCase()}`}>
        {volunteer.initials}
      </div>
      <div className="flex-col spacer gap-4">
        <div style={{ fontWeight: 700, fontSize: 16 }}>{volunteer.name}</div>
        <div className="text-muted body-text">{volunteer.skill} • {volunteer.distanceKm} km away</div>
      </div>
      <div className="flex-col align-center gap-8">
        <div className="pill-chip" style={{ 
          padding: '4px 12px', 
          fontSize: 12, 
          backgroundColor: volunteer.status === 'Available' ? 'var(--status-available)' : 'var(--status-busy)',
          color: 'white',
          border: 'none'
        }}>
          {volunteer.status}
        </div>
        {isNeeded && (
          <div style={{ fontSize: 12, color: 'var(--primary-red)', fontWeight: 700 }}>
            Needed
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="screen-content hide-scrollbar" style={{ padding: '24px 16px', overflowY: 'auto' }}>
      <div className="flex-row justify-space-between align-center" style={{ marginBottom: 24 }}>
        <h1 className="heading-lg">Volunteers</h1>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>View all</button>
      </div>

      {/* Top horizontal avatars */}
      <div className="flex-row gap-16 hide-scrollbar" style={{ overflowX: 'auto', marginBottom: 32, paddingBottom: 8 }}>
        {sortedVolunteers.map(v => (
          <div key={`top-${v.id}`} className="flex-col align-center gap-8 text-center" style={{ width: 64 }}>
            <div className={`avatar ${v.status.toLowerCase()}`} style={{ width: 64, height: 64 }}>
              {v.initials}
            </div>
            <div className="body-text" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {v.name.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>

      <h2 className="heading-md" style={{ fontSize: 20, marginBottom: 16 }}>Available</h2>
      {availableVols.map(v => (
        <VolunteerCard key={v.id} volunteer={v} isNeeded={v.id === closestAvailable?.id} />
      ))}

      <h2 className="heading-md" style={{ fontSize: 20, marginBottom: 16, marginTop: 16 }}>Busy</h2>
      {busyVols.map(v => (
        <VolunteerCard key={v.id} volunteer={v} isNeeded={false} />
      ))}
      
      <div style={{ minHeight: 40 }} />
    </div>
  );
}
