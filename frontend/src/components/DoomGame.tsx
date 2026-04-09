// src/components/DoomGame.tsx
import { useEffect, useRef} from 'react';
import { X} from 'lucide-react';
import { Button} from './ui/button';

interface DoomGameProps {
 onClose: () => void;
}

export default function DoomGame({ onClose}: DoomGameProps) {
 const iframeRef = useRef<HTMLIFrameElement>(null);

 useEffect(() => {
 // Prevent scrolling when game is open
 document.body.style.overflow = 'hidden';
 
 return () => {
 document.body.style.overflow = '';
};
}, []);

 return (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
 <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
 {/* Header */}
 <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
 <div className="text-white">
 <h2 className="text-[24px] font-bold tracking-[-0.025em] leading-tight text-macos-red">Contra</h2>
 <p className="text-sm text-tertiary">Easter Egg Activated! 🎮</p>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={onClose}
 className="bg-red-600 hover:bg-red-700 text-white border-red-500"
 >
 <X className="h-5 w-5 mr-2"/>
 Close Game
 </Button>
 </div>

 {/* Game iframe */}
 <iframe
 ref={iframeRef}
 src="https://www.retrogames.cz/play_022-NES.php"
 className="w-full h-full border-0"
 title="Contra Game"
 allowFullScreen
 allow="autoplay; fullscreen"
 />
 </div>
 </div>
 );
}
