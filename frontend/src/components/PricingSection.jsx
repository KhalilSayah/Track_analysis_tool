import React from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Check, X, Zap, Database, Brain, Calendar, Banknote, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const PricingSection = () => {
  const plans = [
    {
      id: "free",
      name: "Starter",
      price: "Free",
      description: "Perfect for weekend warriors getting started with data analysis.",
      features: [
        { name: "5 Sessions / Month Storage", included: true, icon: <Database size={16} /> },
        { name: "Basic Track Analysis", included: true },
        { name: "Calendar Management", included: true, icon: <Calendar size={16} /> },
        { name: "3 AI Coach Insights / Month", included: true, icon: <Brain size={16} /> },
        { name: "CSV Upload Support", included: true },
        { name: "Binding Investigation", included: false },
        { name: "Budget Monitoring", included: false },
        { name: "Team Roles & Management", included: false }
      ],
      cta: "Start Free",
      popular: false
    },
    {
      id: "pro",
      name: "Pro Racer",
      price: "€14.99",
      period: "/month",
      description: "For serious drivers who want unlimited access to performance data.",
      features: [
        { name: "Unlimited Session Storage", included: true, icon: <Database size={16} /> },
        { name: "Advanced Track Analysis", included: true },
        { name: "Calendar & Schedule", included: true, icon: <Calendar size={16} /> },
        { name: "Unlimited AI Coach", included: true, icon: <Brain size={16} /> },
        { name: "Budget Management AI", included: true, icon: <Banknote size={16} /> },
        { name: "Binding Investigation", included: true, icon: <Zap size={16} /> },
        { name: "Team Roles & Permissions", included: true, icon: <Users size={16} /> },
        { name: "Lap Comparison Tools", included: true }
      ],
      cta: "Get Access",
      popular: true,
      highlight: "Pay for access, then free forever updates"
    }
  ];

  return (
    <div className="w-full bg-black py-24 px-4 sm:px-8 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
            Simple <span className="text-[#e8fe41]">Pricing</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Start for free with our quota-based tier, or upgrade for unlimited access to AI and advanced analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
              whileHover={{ y: -8 }}
            >
            <Card 
              className={`border ${plan.popular ? 'border-[#e8fe41] bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950'} relative h-full`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 p-4 z-10">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Chip className="bg-[#e8fe41] text-black font-bold shadow-[0_0_10px_rgba(232,254,65,0.4)]">MOST POPULAR</Chip>
                  </motion.div>
                </div>
              )}
              
              <CardHeader className="flex flex-col items-start gap-4 p-8 pb-0">
                <div>
                  <h3 className={`text-xl font-bold ${plan.popular ? 'text-white' : 'text-zinc-300'}`}>{plan.name}</h3>
                  <p className="text-zinc-500 text-sm mt-2 h-10">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-[#e8fe41]' : 'text-white'}`}>{plan.price}</span>
                  {plan.period && <span className="text-zinc-500">{plan.period}</span>}
                </div>
              </CardHeader>

              <CardBody className="p-8">
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <motion.div 
                      key={idx} 
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + (idx * 0.05) }}
                    >
                      <div className={`flex-shrink-0 ${feature.included ? (plan.popular ? 'text-[#e8fe41]' : 'text-white') : 'text-zinc-700'}`}>
                        {feature.included ? <Check size={18} /> : <X size={18} />}
                      </div>
                      <span className={`text-sm flex items-center gap-2 ${feature.included ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {feature.name}
                        {feature.icon && <span className={plan.popular ? "text-[#e8fe41]" : "text-zinc-500"}>{feature.icon}</span>}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    size="lg" 
                    className={`w-full font-bold ${
                      plan.popular 
                        ? 'bg-[#e8fe41] text-black shadow-[0_0_20px_rgba(232,254,65,0.2)]' 
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
                
                {plan.highlight && (
                    <p className="text-center text-xs text-zinc-500 mt-4">{plan.highlight}</p>
                )}
              </CardBody>
            </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
