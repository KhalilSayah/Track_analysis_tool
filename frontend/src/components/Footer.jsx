import React from 'react';
import { Twitter, Instagram, Linkedin, Github, Heart } from 'lucide-react';
import { Button } from "@heroui/react";
import logo from '../assets/logo.png';

const Footer = () => {
  return (
    <footer className="w-full bg-black border-t border-zinc-900 pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <img src={logo} alt="Birds Logo" className="h-16 w-auto" />
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Advanced telemetry analysis for karting enthusiasts. 
              Turn your data into faster lap times with AI-powered insights.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Features</a></li>
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Pricing</a></li>
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Integrations</a></li>
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Documentation</a></li>
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">API Reference</a></li>
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Community</a></li>
              <li><a href="#" className="text-zinc-400 hover:text-[#e8fe41] transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold mb-6">Stay Updated</h4>
            <p className="text-zinc-400 mb-4 text-sm">
              Subscribe to our newsletter for the latest updates and driving tips.
            </p>
            <div className="flex flex-col space-y-3">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#e8fe41] transition-colors"
              />
              <Button className="bg-[#e8fe41] text-black font-bold hover:bg-[#d4e830] w-full">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} Birds. All rights reserved.
          </p>
          <div className="flex items-center space-x-1 text-zinc-500 text-sm">
            <span>Made with</span>
            <Heart size={16} className="text-red-500 fill-red-500" />
            <span>for racers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
