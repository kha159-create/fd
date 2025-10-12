import React from 'react';

const Shimmer: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-200/80 to-transparent ${className}`}></div>
);

const SkeletonCard: React.FC = () => (
    <div className="glass-card p-6 h-96 relative overflow-hidden">
        <div className="h-6 w-1/2 bg-slate-200 rounded mb-6"></div>
        <div className="space-y-4">
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
        </div>
        <Shimmer />
    </div>
);

const SkeletonDashboard: React.FC = () => {
    return (
        <div className="container mx-auto px-2 sm:px-4 max-w-7xl mt-8 mb-20">
            {/* Header placeholder */}
             <div className="h-16 mb-3"></div>
            <div className="flex flex-wrap justify-center mb-8 bg-slate-100 rounded-xl p-2 h-14"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    );
};

export default SkeletonDashboard;