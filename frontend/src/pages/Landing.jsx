import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardHeader, CardBody } from "@heroui/react";
import { ChevronDown, Activity, Database, ClipboardList, Settings, Sparkles, AlertTriangle, Zap, Calendar, ArrowRightLeft, Home, Banknote, Mail, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_MODULES } from '../contexts/ConfigContext';
import logo from '../assets/logo.png';
import InteractiveDemo from '../components/InteractiveDemo';
import PricingSection from '../components/PricingSection';
import TrustedBy from '../components/TrustedBy';
import Footer from '../components/Footer';

const Landing = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { currentUser } = useAuth();

  const getIcon = (iconName) => {
    switch (iconName) {
        case 'Home': return <Home size={24} />;
        case 'Sparkles': return <Sparkles size={24} />;
        case 'Database': return <Database size={24} />;
        case 'ClipboardList': return <ClipboardList size={24} />;
        case 'Activity': return <Activity size={24} />;
        case 'Settings': return <Settings size={24} />;
        case 'Zap': return <Zap size={24} />;
        case 'Calendar': return <Calendar size={24} />;
        case 'ArrowRightLeft': return <ArrowRightLeft size={24} />;
        case 'Banknote': return <Banknote size={24} />;
        default: return <Settings size={24} />;
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

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
      <div id="home" className="relative w-full min-h-screen overflow-hidden bg-dot-pattern flex flex-col">
        {/* Header */}
        <nav className="w-full z-30 flex justify-between items-center p-8 text-white">
          <motion.div 
            className="cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => scrollToSection('home')}
          >
            <img src={logo} alt="Birds Logo" className="h-20 w-auto" />
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

        {/* Main Content Split */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pb-20">
            {/* Left Column: Text */}
            <div className="flex flex-col items-start gap-8 z-20">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-5xl md:text-7xl font-bold text-white font-display leading-tight">
                        Enhance Your Karting Team. <span className="text-[#e8fe41]">Race Like Pros.</span>
                    </h1>
                </motion.div>
                
                <motion.p 
                    className="text-zinc-400 text-lg md:text-xl max-w-xl leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    Unlock driver potential with data-driven insights. Analyze telemetry, manage budgets, and optimize performance.
                </motion.p>

                <Link to={currentUser ? "/dashboard" : "/login"}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        <Button 
                            size="lg" 
                            className="font-bold text-base bg-[#e8fe41] text-black px-10 py-6 rounded-full shadow-[0_0_20px_rgba(232,254,65,0.3)] hover:shadow-[0_0_30px_rgba(232,254,65,0.5)] hover:scale-105 transition-all border-none uppercase tracking-wider"
                        >
                            {currentUser ? "Go to Dashboard" : "Start Engine"}
                        </Button>
                    </motion.div>
                </Link>
            </div>

            {/* Right Column: Image */}
            <motion.div 
                className="relative z-10 w-full h-full flex items-center justify-center lg:justify-end"
                initial={{ opacity: 0, scale: 0.9, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#e8fe41]/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <img 
                    src="/web-mokup.png" 
                    alt="Platform Mockup" 
                    className="relative w-full max-w-[800px] object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500"
                />
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
        className="w-full bg-zinc-950 py-24 px-4 sm:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
              Powerful <span className="text-[#e8fe41]">Features</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Analyze driving, improve setup, and cut lap times.
            </p>
          </div>
          
          <motion.div 
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
              {DEFAULT_MODULES.filter(m => m.id !== 'home' && m.id !== 'setup-guide').map((module) => (
                  <motion.div 
                      key={module.id} 
                      variants={item}
                      whileHover={{ scale: 1.02 }}
                      className="h-full"
                  >
                      <Card 
                          className="h-full w-full bg-black border border-zinc-800 transition-all duration-300 hover:border-[#e8fe41] hover:shadow-[0_0_20px_rgba(232,254,65,0.3)] group rounded-[32px]"
                      >
                          <CardHeader className="flex gap-4 px-6 pt-6 flex-shrink-0">
                              <div className="p-3 rounded-2xl bg-zinc-800 text-white group-hover:bg-[#e8fe41] group-hover:text-black transition-colors duration-300">
                                  {getIcon(module.iconName)}
                              </div>
                              <div className="flex flex-col">
                                  <p className="text-lg font-bold text-white group-hover:text-[#e8fe41] transition-colors">{module.name}</p>
                                  {module.beta && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8fe41] text-black w-fit">
                                          BETA
                                      </span>
                                  )}
                              </div>
                          </CardHeader>
                          <CardBody className="px-6 pb-6 pt-2">
                              <p className="text-zinc-400 text-sm leading-relaxed">
                                  {module.description}
                              </p>
                          </CardBody>
                      </Card>
                  </motion.div>
              ))}
          </motion.div>
        </div>
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

      {/* Contact Section */}
      <motion.div
        className="w-full py-20 px-4 bg-black"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto text-center bg-zinc-900/50 rounded-[40px] border border-zinc-800 p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e8fe41] to-transparent opacity-50"></div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-display">
            Ready to <span className="text-[#e8fe41]">Start?</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
            Get in touch with us to request free access to the demo version and experience the power of professional telemetry analysis.
          </p>
          
          <a href="mailto:contact@birdsracing.com">
            <Button 
              size="lg" 
              className="font-bold text-black bg-[#e8fe41] px-8 py-6 rounded-full text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(232,254,65,0.2)]"
              startContent={<Mail className="mr-2" />}
            >
              Contact for Free Demo
            </Button>
          </a>
        </div>
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
