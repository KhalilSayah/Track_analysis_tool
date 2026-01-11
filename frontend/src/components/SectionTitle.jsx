import React from 'react';

const SectionTitle = ({ icon: Icon, children }) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-zinc-800 text-[#e8fe41]">
        {Icon && <Icon size={20} />}
      </div>
      <h3 className="text-lg font-bold text-white">{children}</h3>
    </div>
  );
};

export default SectionTitle;
