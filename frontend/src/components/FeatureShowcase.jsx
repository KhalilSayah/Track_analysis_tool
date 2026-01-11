import React from 'react';
import { Tabs, Tab, Card, CardBody, CardHeader } from "@heroui/react";
import { Activity, Brain, Map, Database, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureShowcase = () => {
  const features = [
    {
      id: "logging",
      label: "Session Logging",
      icon: <Database size={20} />,
      title: "Centralized Data Hub",
      description: <>Seamlessly upload and organize your <span className="text-white font-bold">karting sessions</span>. Store your telemetry files securely in the cloud and access them from anywhere.</>,
      details: [
        { label: "File Support", value: ".csv, .log, .json" },
        { label: "Organization", value: "Track & Date Tagging" },
        { label: "Storage", value: "Secure Cloud Archive" },
        { label: "Access", value: "Instant Retrieval" }
      ]
    },
    {
      id: "track",
      label: "Track Analysis",
      icon: <Activity size={20} />,
      title: "Deep Dive Performance",
      description: <>Compare laps, analyze <span className="text-white font-bold">corner speeds</span>, and visualize <span className="text-white font-bold">racing lines</span>. Identify exactly where you're gaining or losing time.</>,
      details: [
        { label: "Comparison", value: "Multi-Lap Overlay" },
        { label: "Metrics", value: "Speed, RPM, Delta Time" },
        { label: "Segments", value: "Sector Breakdown" },
        { label: "Visuals", value: "Interactive Charts" }
      ]
    },
    {
      id: "binding",
      label: "Binding Investigation",
      icon: <Map size={20} />,
      title: "Chassis Dynamics Analysis",
      description: "Advanced algorithms to detect where your kart is binding. Optimize your chassis setup to free up the kart and carry more speed through corners.",
      details: [
        { label: "Detection", value: "Automated Binding Spots" },
        { label: "Analysis", value: "Lateral G vs Speed" },
        { label: "Tuning", value: "Chassis Flex Insights" },
        { label: "Optimization", value: "Setup Recommendations" }
      ]
    },
    {
      id: "ai",
      label: "AI Interpretation",
      icon: <Brain size={20} />,
      title: "Smart Assistant 'Birds'",
      description: "Get natural language insights on your driving. Our AI interprets complex telemetry data and provides simple, actionable advice to improve.",
      details: [
        { label: "Engine", value: "Birds AI Model" },
        { label: "Feedback", value: "Natural Language" },
        { label: "Focus", value: "Driving Line & Braking" },
        { label: "Format", value: "Automated Reports" }
      ]
    }
  ];

  return (
    <div className="w-full bg-zinc-950 py-24 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
            Powerful <span className="text-[#e8fe41]">Features</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Everything you need to analyze your driving, improve your setup, and cut those tenths off your lap time.
          </p>
        </div>

        <div className="flex flex-col w-full">
          <Tabs 
            aria-label="Features"
            color="primary"
            variant="underlined"
            classNames={{
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-zinc-800 flex justify-center",
              cursor: "w-full bg-[#e8fe41]",
              tab: "max-w-fit px-0 h-12",
              tabContent: "group-data-[selected=true]:text-[#e8fe41] text-zinc-400 text-lg font-medium"
            }}
          >
            {features.map((feature) => (
              <Tab
                key={feature.id}
                title={
                  <div className="flex items-center space-x-2">
                    {feature.icon}
                    <span>{feature.label}</span>
                  </div>
                }
              >
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-none bg-transparent shadow-none mt-8">
                    <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-0">
                      <div className="space-y-6">
                        <h3 className="text-3xl font-bold text-[#e8fe41]">{feature.title}</h3>
                        <p className="text-zinc-400 text-lg leading-relaxed">
                          {feature.description}
                        </p>
                        
                        {/* Feature Details Table */}
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden mt-8">
                          <div className="grid grid-cols-1 divide-y divide-zinc-800">
                            {feature.details.map((detail, idx) => (
                              <motion.div 
                                key={idx} 
                                className="flex flex-col sm:flex-row p-4 hover:bg-zinc-800/30 transition-colors"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * idx, duration: 0.3 }}
                              >
                                <span className="text-zinc-500 font-medium sm:w-1/3">{detail.label}</span>
                                <span className="text-white sm:w-2/3">{detail.value}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Placeholder for feature visual/image */}
                      <div className="relative h-[400px] w-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden group">
                        <motion.div 
                          className="w-full h-full flex items-center justify-center relative"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(232,254,65,0.1),transparent_70%)]" />
                          
                          {/* Abstract Visual Representation */}
                          <motion.div 
                            className="relative z-10 text-zinc-700 group-hover:text-[#e8fe41] transition-colors duration-500"
                            animate={{ 
                              y: [0, -10, 0],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ 
                              duration: 6,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            {React.cloneElement(feature.icon, { size: 120, strokeWidth: 1 })}
                          </motion.div>
                          
                          {/* Decorative elements */}
                          <div className="absolute top-0 right-0 p-8 opacity-20">
                            <div className="w-32 h-32 border-t-2 border-r-2 border-[#e8fe41] rounded-tr-3xl" />
                          </div>
                          <div className="absolute bottom-0 left-0 p-8 opacity-20">
                             <div className="w-32 h-32 border-b-2 border-l-2 border-[#e8fe41] rounded-bl-3xl" />
                          </div>
                        </motion.div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              </Tab>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FeatureShowcase;
