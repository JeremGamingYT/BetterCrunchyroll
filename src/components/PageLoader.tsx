import { motion } from 'framer-motion';
import './PageLoader.scss';

const PageLoader = ({ message = "Chargement..." }: { message?: string }) => {
    return (
        <div className="page-loader">
            <div className="loader-content">
                <motion.div
                    className="loader-spinner"
                    animate={{
                        rotate: 360
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    <svg viewBox="0 0 50 50">
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="80, 200"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f47521" />
                                <stop offset="100%" stopColor="#ff8c42" />
                            </linearGradient>
                        </defs>
                    </svg>
                </motion.div>
                <motion.p
                    className="loader-message"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {message}
                </motion.p>
            </div>
        </div>
    );
};

export default PageLoader;
