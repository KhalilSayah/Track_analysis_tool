import React from 'react';
import { motion } from 'framer-motion';

const brands = [
  "ROTAX",
  "IAME",
  "TONY KART",
  "BIREL ART",
  "CRG",
  "SODI",
  "SPARCO",
  "OMP",
  "ALPINESTARS",
  "VORTEX",
  "TM RACING",
  "KOSMIC"
];

const TrustedBy = () => {
  return (
    <div className="w-full bg-black py-8 border-b border-zinc-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-6 text-center">
        <span className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase">
          Trusted by teams & drivers using
        </span>
      </div>
      
      <div className="relative flex overflow-hidden mask-linear-fade">
        {/* Gradient Masks for smooth fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10"></div>

        <motion.div 
          className="flex gap-16 items-center whitespace-nowrap"
          animate={{ x: [0, -1000] }}
          transition={{ 
            repeat: Infinity, 
            ease: "linear", 
            duration: 20 
          }}
        >
          {[...brands, ...brands, ...brands].map((brand, index) => (
            <div key={index} className="flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-zinc-800 hover:text-[#e8fe41] transition-colors cursor-default select-none font-display">
                {brand}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default TrustedBy;
