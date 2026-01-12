import React from 'react';
import { motion } from 'framer-motion';

const NeoParticles = () => {
    // Generate random particles
    const particles = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 2, // 2-6px
        x: Math.random() * 100, // 0-100%
        y: Math.random() * 100, // 0-100%
        duration: Math.random() * 10 + 10, // 10-20s
        delay: Math.random() * 5
    }));

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full bg-[#e8fe41]/30 blur-[1px]"
                    style={{
                        width: particle.size,
                        height: particle.size,
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                    }}
                    animate={{
                        y: [0, -100, 0],
                        x: [0, Math.random() * 50 - 25, 0],
                        opacity: [0, 0.8, 0],
                        scale: [1, 1.5, 1]
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: particle.delay
                    }}
                />
            ))}
        </div>
    );
};

export default NeoParticles;
