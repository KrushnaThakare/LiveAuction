import { Component } from 'react';

export default class AuctionDisplayErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Audience Display]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 32,
            background: 'linear-gradient(135deg, #0b1020 0%, #02040b 100%)',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 12 }}>Audience Display Error</h1>
            <p style={{ opacity: 0.8, marginBottom: 20 }}>
              The overlay hit a runtime error. Refresh the page. If it persists, open Broadcast Control and temporarily disable
              record-break animation, countdown, or cinematic intro.
            </p>
            <pre
              style={{
                textAlign: 'left',
                overflow: 'auto',
                padding: 16,
                borderRadius: 12,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 13,
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
