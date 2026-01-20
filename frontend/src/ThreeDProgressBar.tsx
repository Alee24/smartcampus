
import React from 'react'

interface ProgressBarProps {
    progress: number;
    colorClass?: string;
}

export default function ThreeDProgressBar({ progress, colorClass = 'bg-blue-500' }: ProgressBarProps) {
    // Extract basic color name for shades (e.g., "bg-purple-500" -> "purple")
    const getColorName = (cls: string) => {
        const match = cls.match(/bg-([a-z]+)-/)
        return match ? match[1] : 'blue'
    }

    const baseColor = getColorName(colorClass)

    // Dynamic Tailwind classes for 3D faces
    // We use style for precise control over the 3D 'pop' which is hard with just utility classes
    const colors = {
        front: `bg-${baseColor}-500`,
        top: `bg-${baseColor}-400`,
        side: `bg-${baseColor}-600`,
        back: `bg-${baseColor}-700`
    }

    return (
        <div className="w-full py-8" style={{ perspective: '1000px' }}>
            {/* 3D Bar Container */}
            <div
                className="relative w-full h-6 bg-gray-200 dark:bg-gray-800 rounded-sm"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(-30deg) rotateY(0deg)'
                }}
            >
                {/* Empty Track Shadow/Depth */}
                <div className="absolute inset-0 bg-black/10 shadow-inner rounded-sm translate-z-[-10px]"></div>

                {/* The Filling Bar */}
                <div
                    className="absolute top-0 left-0 h-full transition-all duration-300 ease-out"
                    style={{
                        width: `${progress}%`,
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* Front Face */}
                    <div
                        className={`absolute inset-0 ${colors.front} shadow-md`}
                        style={{ transform: 'translateZ(10px)' }}
                    ></div>

                    {/* Top Face */}
                    <div
                        className={`absolute top-0 left-0 w-full h-[20px] ${colors.top} origin-bottom`}
                        style={{
                            transform: 'rotateX(90deg) translateY(-20px) translateZ(10px)',
                            height: '20px'
                        }}
                    ></div>

                    {/* Bottom Face */}
                    <div
                        className={`absolute bottom-0 left-0 w-full h-[20px] ${colors.back} origin-top`}
                        style={{
                            transform: 'rotateX(-90deg) translateY(20px) translateZ(10px)',
                            height: '20px'
                        }}
                    ></div>

                    {/* Right Face (The Leading Edge) */}
                    <div
                        className={`absolute top-0 right-0 h-full w-[20px] ${colors.side} origin-left`}
                        style={{
                            transform: 'rotateY(90deg) translateZ(0px)',
                            width: '20px'
                        }}
                    ></div>

                    {/* Glow Effect */}
                    <div className={`absolute top-0 right-0 w-8 h-full bg-white/30 blur-md`} style={{ transform: 'translateZ(12px)' }}></div>
                </div>
            </div>

            {/* Reflection/Floor */}
            <div className="relative mt-8 mx-auto w-[98%] h-2 bg-black/20 blur-xl rounded-full"></div>
        </div>
    )
}
