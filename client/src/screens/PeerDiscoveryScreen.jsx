import React, { useState } from 'react';

const MOCK_PEERS = [
  { id: '1', name: 'Field Unit — Ravi\'s Device', ip: '10.52.17.50', signal: 'Strong' },
  { id: '2', name: 'Base Camp Tablet', ip: '10.52.17.50', signal: 'Medium' },
  { id: '3', name: 'Search Team B Phone', ip: '10.52.17.50', signal: 'Weak' },
];

export function PeerDiscoveryScreen({ onPeerSelected, onBack }) {
  const [isScanning, setIsScanning] = useState(false);
  const [peers, setPeers] = useState([]);

  const handleScan = () => {
    setIsScanning(true);
    setPeers([]);
    
    // Simulate 2 second scan delay
    setTimeout(() => {
      setPeers(MOCK_PEERS);
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>&larr; Back</button>
        <h2 style={styles.title}>Scan for Peers</h2>
        <div style={{ width: '60px' }}></div> {/* Spacer for centering */}
      </header>

      <div style={styles.content}>
        <p style={styles.subtitle}>
          Find nearby devices on the same local network to sync reports.
        </p>
        
        <button 
          onClick={handleScan} 
          disabled={isScanning}
          style={{
            ...styles.scanButton,
            background: isScanning ? '#7f8c8d' : '#3498db',
            cursor: isScanning ? 'not-allowed' : 'pointer'
          }}
        >
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </button>

        {isScanning && (
          <div style={styles.loadingContainer}>
            <div style={styles.pulseContainer}>
              <div style={styles.pulseRing}></div>
              <span style={{ fontSize: '2rem', position: 'relative', zIndex: 10 }}>📶</span>
            </div>
            <p style={styles.loadingText}>Searching for devices...</p>
          </div>
        )}

        {!isScanning && peers.length > 0 && (
          <div style={styles.list}>
            {peers.map((peer) => (
              <div key={peer.id} style={styles.card}>
                <div style={styles.cardContent}>
                  <div style={styles.iconContainer}>
                    <span style={styles.icon}>📶</span>
                  </div>
                  <div style={styles.infoContainer}>
                    <h4 style={styles.deviceName}>{peer.name}</h4>
                    <p style={styles.signal}>
                      Signal: <strong style={{ color: peer.signal === 'Strong' ? '#2ecc71' : peer.signal === 'Medium' ? '#f39c12' : '#e74c3c' }}>{peer.signal}</strong>
                    </p>
                  </div>
                  <button 
                    onClick={() => onPeerSelected(peer.ip)}
                    style={styles.connectButton}
                  >
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!isScanning && peers.length === 0 && (
          <div style={styles.emptyContainer}>
            <p style={styles.emptyText}>No devices found yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mimicking React Native's StyleSheet with standard JS objects
const styles = {
  pulseContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '3px solid #3498db',
    borderRadius: '50%',
    animation: 'pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
  },
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: 'var(--surface-color)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    color: 'white',
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#3498db',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  content: {
    padding: '1.5rem',
    flex: 1,
  },
  subtitle: {
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: '2rem',
    fontSize: '0.95rem',
    lineHeight: '1.4',
  },
  scanButton: {
    width: '100%',
    padding: '1rem',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    border: 'none',
    marginBottom: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '2rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#bdc3c7',
    marginTop: '1rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    borderRadius: '10px',
    padding: '1rem',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: '1rem',
  },
  icon: {
    fontSize: '1.5rem',
  },
  infoContainer: {
    flex: 1,
  },
  deviceName: {
    margin: 0,
    fontSize: '1rem',
    color: 'white',
    marginBottom: '0.2rem',
  },
  signal: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#95a5a6',
  },
  connectButton: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  emptyContainer: {
    textAlign: 'center',
    marginTop: '2rem',
  },
  emptyText: {
    color: '#7f8c8d',
  }
};

// Add the spinner keyframes directly to the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulseRing {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  `;
  document.head.appendChild(styleSheet);
}
