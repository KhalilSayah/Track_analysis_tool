import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../contexts/ConfigContext';
import { motion } from 'framer-motion';
import { Card, CardBody, CardHeader } from "@heroui/react";
import UpcomingEventsSlider from './UpcomingEventsSlider';
import WeeklyCalendarPreview from './WeeklyCalendarPreview';
import NeoParticles from './NeoParticles';

const Home = () => {
    const navigate = useNavigate();
    const { modules, getIcon } = useConfig();
    const enabledModules = modules.filter(m => m.enabled);

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

    return (
        <div className="min-h-full flex flex-col">
            <div className="w-full flex-1 flex flex-col justify-center">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 text-center relative"
                >
                    <NeoParticles />
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-zinc-900 dark:text-white relative z-10">
                        Start Your <span className="text-[#e8fe41]">Journey</span>
                    </h1>
                    <p className="text-xl text-zinc-500 dark:text-zinc-400 relative z-10">
                        Remember, you are not building a car that goes <span className="font-bold text-zinc-900 dark:text-white">fast</span>, but a car that can <span className="font-bold text-[#e8fe41]">fly</span>.
                    </p>
                </motion.div>

                <UpcomingEventsSlider />
                
                <WeeklyCalendarPreview />

                <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white"
            >
                Available Tools
            </motion.h2>

                <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {enabledModules.map((module) => (
                        <motion.div 
                            key={module.id} 
                            variants={item}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Card 
                                isPressable
                                onPress={() => navigate(module.path)}
                                className="h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all duration-300 hover:border-[#e8fe41] hover:shadow-[0_0_20px_rgba(232,254,65,0.3)] group rounded-[32px]"
                            >
                                <CardHeader className="flex gap-4 px-6 pt-6">
                                    <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white group-hover:bg-[#e8fe41] group-hover:text-black transition-colors duration-300">
                                        {getIcon(module.iconName)}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-[#e8fe41] dark:group-hover:text-[#e8fe41] transition-colors">
                                            {module.name}
                                        </h3>
                                        {module.beta && (
                                            <span className="text-[10px] font-bold bg-[#e8fe41] text-black px-2 py-0.5 rounded-full">
                                                BETA
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardBody className="px-6 pb-6 pt-2">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                                        {module.description || "Access this tool to manage your karting data."}
                                    </p>
                                </CardBody>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default Home;
