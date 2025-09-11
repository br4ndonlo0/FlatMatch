
export default function HomePage() {
	return (
		<div style={{
			minHeight: '100vh',
			background: 'linear-gradient(135deg, #e53935 0%, #1e3a8a 100%)',
			color: 'white',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
		}}>
			<h1 style={{ color: '#e53935', background: 'white', padding: '0.5em 1em', borderRadius: '8px', boxShadow: '0 2px 8px rgba(30,58,138,0.1)' }}>
				Welcome to HDB Finder
			</h1>
			<p style={{ color: '#1e3a8a', background: 'white', padding: '0.5em 1em', borderRadius: '8px', marginTop: '1em', boxShadow: '0 2px 8px rgba(229,57,53,0.1)' }}>
				Find your dream HDB with our red, blue, and white themed app!
			</p>
		</div>
	);
}
