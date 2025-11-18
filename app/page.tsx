import Image from 'next/image';

import johinkeLogo from '../Johinke Logo.png';

import AddressSearch from '../components/AddressSearch';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        background:
          'radial-gradient(circle at top, #0f172a, #020617 45%, #111827 100%)'
      }}
    >
      <section
        style={{
          width: 'min(1440px, 92vw)',
          display: 'grid',
          gap: '2.25rem',
          padding: '2.75rem 2.25rem',
          borderRadius: '26px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)'
        }}
      >
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <Image
            src={johinkeLogo}
            alt="Johinke Development logo"
            priority
            style={{
              width: 'min(220px, 60vw)',
              height: 'auto'
            }}
          />
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: '#475569'
            }}
          >
            Northern Beaches Planning Intelligence
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: '2.6rem',
              lineHeight: 1.08,
              color: '#0f172a'
            }}
          >
            Project Site Analysis Tool
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#4b5563'
            }}
          >
            Analyse any New South Wales (NSW) property in seconds — unlock zoning,
            overlays, planning pathways, comparable evidence, and feasibility without
            jumping between systems. Free tier covers Housing State Environmental Planning Policies infill checks.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              backgroundColor: '#e0f2fe',
              color: '#1d4ed8',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <span>Includes clause hyperlinks and acronym expansions.</span>
          </div>
        </div>
        <AddressSearch />
      </section>
    </main>
  );
}
