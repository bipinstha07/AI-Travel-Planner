import type { ReactNode } from 'react';

interface LiveBackgroundProps {
  children: ReactNode;
  fixed?: boolean;
}

const LiveBackground = ({ children, fixed = false }: LiveBackgroundProps) => {
  // Generate random stars
  const stars = Array.from({ length: 70 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 70}%`, // Only in the top 70% (sky part)
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 3 + 2,
  }));

  // Generate random shooting stars
  const shootingStars = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 40}%`, 
    left: `${Math.random() * 40}%`, // Start mostly from left side
    delay: Math.random() * 8,
    duration: Math.random() * 2 + 3,
  }));

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed Background Layer - This stays in place while content scrolls */}
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-linear-to-b from-[#051e3e] via-[#1e3a5f] to-[#e8a685] pointer-events-none z-0">
        {/* Stars Layer */}
        <div className="absolute inset-0">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute bg-white rounded-full animate-twinkle"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>

        {/* Shooting Stars Layer */}
        <div className="absolute inset-0">
          {shootingStars.map((star) => (
            <div
              key={star.id}
              className="absolute w-[2px] h-[100px] bg-linear-to-b from-transparent via-white/50 to-white rounded-full animate-shooting-star opacity-0 origin-top"
              style={{
                top: star.top,
                left: star.left,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </div>
        
        {/* Horizon Glow Effect at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-linear-to-t from-[#ff9a5b]/30 to-transparent z-10"></div>
      </div>

      {/* Content Layer - Flows normally with document scroll or fixed for app-like feel */}
      <div className={`relative z-10 flex flex-col ${fixed ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        {children}
      </div>
    </div>
  );
};

export default LiveBackground;
