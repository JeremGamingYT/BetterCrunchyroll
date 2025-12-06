import Navbar from '../components/Navbar';
import '../styles/GridPage.scss';

interface ComingSoonProps {
    pageName: string;
}

const ComingSoon = ({ pageName }: ComingSoonProps) => {
    return (
        <div className="grid-page">
            <Navbar />
            <div className="bc-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    background: 'linear-gradient(to right, #fff, #a0a0a0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '1rem'
                }}>
                    Prochainement
                </h1>
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '1.2rem'
                }}>
                    La page {pageName} sera bientôt disponible.
                </p>
            </div>
        </div>
    );
};

export default ComingSoon;
