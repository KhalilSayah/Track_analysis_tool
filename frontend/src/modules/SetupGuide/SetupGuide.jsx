import React, { useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { Switch, Card, CardBody, Button } from "@heroui/react";
import { GripVertical, Lock } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle';

const SetupGuide = () => {
  useEffect(() => {
    document.title = "Setup Guide | Karting Analysis";
  }, []);

  const { modules, toggleModule, reorderModules, getIcon } = useConfig();

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (draggedIndex !== index) {
      reorderModules(draggedIndex, index);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display mb-2">Setup Guide</h1>
        <p className="text-zinc-400">Customize your workspace by enabling features and reordering the navigation menu.</p>
      </div>

      <div className="space-y-6">
        <SectionTitle icon={getIcon('Settings').type}>Module Management</SectionTitle>
        
        <div className="grid gap-4">
          {modules.map((module, index) => (
            <div 
              key={module.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                group bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between transition-all
                ${!module.enabled ? 'opacity-50 grayscale' : 'hover:border-zinc-700'}
              `}
            >
              <div className="flex items-center gap-4">
                <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white p-2">
                  <GripVertical size={20} />
                </div>
                <div className={`p-2 rounded-lg ${module.enabled ? 'bg-zinc-800 text-[#e8fe41]' : 'bg-zinc-800 text-zinc-500'}`}>
                  {getIcon(module.iconName)}
                </div>
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    {module.name}
                    {module.beta && <span className="text-[10px] bg-[#e8fe41] text-black px-1.5 py-0.5 rounded font-bold">BETA</span>}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {module.locked ? 'Core System Module' : `path: ${module.path}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {module.locked ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs px-3 py-1 bg-zinc-800/50 rounded-full">
                    <Lock size={12} />
                    <span>Required</span>
                  </div>
                ) : (
                  <Switch 
                    isSelected={module.enabled} 
                    onValueChange={() => toggleModule(module.id)}
                    color="success"
                    classNames={{
                        wrapper: "group-data-[selected=true]:bg-[#e8fe41]",
                        thumb: "group-data-[selected=true]:bg-black"
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
           <p><strong>Tip:</strong> Drag and drop the items using the handle icon (⋮⋮) to change their order in the sidebar.</p>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide;
