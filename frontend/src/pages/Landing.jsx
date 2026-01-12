import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@heroui/react";
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import InteractiveDemo from '../components/InteractiveDemo';
import FeatureShowcase from '../components/FeatureShowcase';
import PricingSection from '../components/PricingSection';
import TrustedBy from '../components/TrustedBy';
import Footer from '../components/Footer';

const Landing = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { currentUser } = useAuth();

  useEffect(() => {
    document.title = "Karting Analysis Platform";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate position relative to center of screen, normalized -1 to 1
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="w-full bg-black">
      {/* Hero Section */}
      <div id="home" className="relative w-full h-screen overflow-hidden">
        {/* Background Hero */}
        <motion.div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ 
              backgroundImage: "url('/hero.jpg')",
          }}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </motion.div>

        {/* Floating Birds with Parallax */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            transform: `translate(${mousePosition.x * -40}px, ${mousePosition.y * -40}px)`, 
            transition: 'transform 0.1s ease-out'
          }}
        >
          {/* Inner image has the floating animation */}
          <img 
              src="/birds.png" 
              alt="Birds" 
              className="w-full h-full object-cover animate-float" 
          />
        </div>

        {/* Header */}
        <nav className="absolute top-0 left-0 w-full z-30 flex justify-between items-center p-8 text-white">
          <motion.div 
            className="font-bold text-xl tracking-wider cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => scrollToSection('home')}
          >
            Birds
          </motion.div>
          <motion.div 
            className="flex gap-8 text-sm font-medium tracking-wide"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
              <button onClick={() => scrollToSection('home')} className="hover:text-[#e8fe41] transition-colors uppercase">HOME</button>
              <button onClick={() => scrollToSection('features')} className="hover:text-[#e8fe41] transition-colors uppercase">FEATURES</button>
              <button onClick={() => scrollToSection('pricing')} className="hover:text-[#e8fe41] transition-colors uppercase">PRICING</button>
              <button onClick={() => scrollToSection('about')} className="hover:text-[#e8fe41] transition-colors uppercase">ABOUT</button>
          </motion.div>
        </nav>

        {/* Content */}
        <div className="absolute bottom-24 left-0 w-full z-20 flex flex-col items-center gap-8">
          <Link to={currentUser ? "/dashboard" : "/login"}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Button 
                size="md" 
                className="flex items-center justify-center font-bold text-sm bg-[#e8fe41] text-black px-8 py-4 rounded-full shadow-[0_0_20px_rgba(232,254,65,0.3)] hover:shadow-[0_0_30px_rgba(232,254,65,0.5)] hover:scale-105 transition-all border-none uppercase tracking-wider"
              >
                {currentUser ? "Go to Dashboard" : "Start Engine"}
              </Button>
            </motion.div>
          </Link>

          {/* Floating Scroll Indicator */}
          <motion.div 
            className="animate-bounce text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            <ChevronDown size={32} />
          </motion.div>
        </div>
      </div>

      {/* Intro Title Section */}
      <motion.div 
        className="w-full bg-black pt-20 pb-10 px-4 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 font-display">
          Analyze. Optimize. <span className="text-[#e8fe41]">Win.</span>
        </h2>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Turn your telemetry data into faster lap times with our advanced analytics platform.
        </p>
      </motion.div>

      {/* Trusted By Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <TrustedBy />
      </motion.div>

      {/* Interactive Demo Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <InteractiveDemo />
      </motion.div>
      
      {/* Features Section */}
      <motion.div
        id="features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <FeatureShowcase />
      </motion.div>

      {/* Pricing Section */}
      <motion.div
        id="pricing"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <PricingSection />
      </motion.div>

      {/* Footer Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Footer />
      </motion.div>
    </div>
  );
};

export default Landing;
