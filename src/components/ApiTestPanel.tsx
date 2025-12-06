import React, { useState } from 'react';
import { useCrunchyrollData } from '../contexts/CrunchyrollDataContext';

/**
 * Composant de test pour l'API Crunchyroll
 * Permet de tester les différents endpoints directement depuis l'UI
 */
const ApiTestPanel: React.FC = () => {
    const { fetchAPIDirect } = useCrunchyrollData();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async (method: string, ...args: any[]) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await fetchAPIDirect(method as any, ...args);
            setResult(data);
            console.log(`✅ ${method} résultat:`, data);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
            setError(errorMsg);
            console.error(`❌ ${method} erreur:`, err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 9999,
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold' }}>
                🧪 API Test Panel
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                <button
                    onClick={() => handleTest('getContinueWatching', 10)}
                    disabled={loading}
                    style={buttonStyle}
                >
                    📺 Continue Watching
                </button>

                <button
                    onClick={() => handleTest('getWatchlist', 10)}
                    disabled={loading}
                    style={buttonStyle}
                >
                    ⭐ Watchlist
                </button>

                <button
                    onClick={() => handleTest('getRecommendations')}
                    disabled={loading}
                    style={buttonStyle}
                >
                    🎯 Recommendations
                </button>

                <button
                    onClick={() => handleTest('getUpNext', 'G0XHWM1JP')}
                    disabled={loading}
                    style={buttonStyle}
                >
                    ▶️ Up Next (SPY x FAMILY)
                </button>

                <button
                    onClick={() => handleTest('search', 'naruto', 5)}
                    disabled={loading}
                    style={buttonStyle}
                >
                    🔍 Search "naruto"
                </button>
            </div>

            {loading && (
                <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', marginBottom: '10px' }}>
                    ⏳ Chargement...
                </div>
            )}

            {error && (
                <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', marginBottom: '10px', color: '#fca5a5' }}>
                    ❌ {error}
                </div>
            )}

            {result && (
                <div style={{ marginTop: '10px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#4ade80' }}>
                        ✅ Résultat:
                    </div>
                    <pre style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '10px',
                        borderRadius: '6px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontSize: '10px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                    }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>

                    {result.data && (
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px' }}>
                            📊 {result.data.length || 0} items
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
    textAlign: 'left'
};

export default ApiTestPanel;
