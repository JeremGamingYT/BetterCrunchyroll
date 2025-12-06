import { motion } from 'framer-motion';
import './LoadingScreen.scss';

interface LoadingScreenProps {
    message?: string;
}

const LoadingScreen = ({ message = 'Chargement...' }: LoadingScreenProps) => {
    return (
        <motion.div
            className="loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="loading-content">
                {/* Simple spinner instead of heavy logo animation */}
                <motion.div
                    className="loading-spinner"
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    <svg viewBox="0 0 50 50" width="60" height="60">
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            fill="none"
                            stroke="url(#loadingGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="80, 200"
                        />
                        <defs>
                            <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f47521" />
                                <stop offset="100%" stopColor="#ff8c42" />
                            </linearGradient>
                        </defs>
                    </svg>
                </motion.div>

                <motion.p
                    className="loading-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {message}
                </motion.p>

                {/* Minimal loading bar */}
                <div className="loading-bar">
                    <motion.div
                        className="loading-bar-fill"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default LoadingScreen;

