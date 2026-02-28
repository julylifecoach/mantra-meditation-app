import React from 'react';

/**
 * ProstrationAnimation - A pure SVG + CSS keyframe animation of
 * Korean Buddhist prostration (큰절).
 * 
 * The figure is built from simple SVG elements:
 * - Circle for head
 * - Lines for torso, upper arms, forearms, thighs, shins
 * 
 * The animation cycles through 5 key poses over ~4 seconds:
 * 1. Standing 합장 (palms together at chest)
 * 2. Kneeling down (both knees bend together)
 * 3. Full prostration (forehead to ground, palms up)
 * 4. Rising (kneeling upright)
 * 5. Standing again (loop)
 */

const ANIM_DURATION = '4s';

// We use a stick-figure approach but with slightly thicker, rounded strokes
// for a clean line art feel. Each body part is a <line> or <circle> animated
// with CSS keyframes via transform-origin tricks on <g> groups.

export default function ProstrationAnimation({ size = 200, color = 'rgba(139, 92, 246, 0.6)' }) {
    const id = 'prost-anim'; // unique prefix for keyframes

    // Keyframes for each body segment
    // We animate groups that pivot around joint points.
    const styles = `
    @keyframes ${id}-torso {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(15deg); }
      30% { transform: rotate(45deg); }
      45% { transform: rotate(85deg); }
      55% { transform: rotate(85deg); }
      70% { transform: rotate(45deg); }
      85% { transform: rotate(15deg); }
    }

    @keyframes ${id}-head {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(5deg); }
      30% { transform: rotate(15deg); }
      45% { transform: rotate(10deg); }
      55% { transform: rotate(10deg); }
      70% { transform: rotate(15deg); }
      85% { transform: rotate(5deg); }
    }

    @keyframes ${id}-upper-arm {
      0%, 100% { transform: rotate(-60deg); }
      15% { transform: rotate(-40deg); }
      30% { transform: rotate(20deg); }
      45% { transform: rotate(70deg); }
      55% { transform: rotate(70deg); }
      70% { transform: rotate(20deg); }
      85% { transform: rotate(-40deg); }
    }

    @keyframes ${id}-forearm {
      0%, 100% { transform: rotate(-50deg); }
      15% { transform: rotate(-30deg); }
      30% { transform: rotate(-10deg); }
      45% { transform: rotate(15deg); }
      55% { transform: rotate(15deg); }
      70% { transform: rotate(-10deg); }
      85% { transform: rotate(-30deg); }
    }

    @keyframes ${id}-thigh {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(-50deg); }
      30% { transform: rotate(-85deg); }
      45% { transform: rotate(-95deg); }
      55% { transform: rotate(-95deg); }
      70% { transform: rotate(-85deg); }
      85% { transform: rotate(-50deg); }
    }

    @keyframes ${id}-shin {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(60deg); }
      30% { transform: rotate(100deg); }
      45% { transform: rotate(95deg); }
      55% { transform: rotate(95deg); }
      70% { transform: rotate(100deg); }
      85% { transform: rotate(60deg); }
    }

    @keyframes ${id}-whole {
      0%, 100% { transform: translateY(0px); }
      15% { transform: translateY(12px); }
      30% { transform: translateY(28px); }
      45% { transform: translateY(38px); }
      55% { transform: translateY(38px); }
      70% { transform: translateY(28px); }
      85% { transform: translateY(12px); }
    }
  `;

    const strokeW = 2.5;
    const lineCap = 'round';

    // Body segment lengths (relative to viewBox 0 0 100 120)
    const torsoLen = 28;
    const thighLen = 22;
    const shinLen = 20;
    const upperArmLen = 16;
    const forearmLen = 14;
    const headR = 6;

    // Hip position (the pivot of the whole figure)
    const hipX = 50;
    const hipY = 50;

    return (
        <div style={{ width: size, height: size, margin: '0 auto', opacity: 0.7 }}>
            <style>{styles}</style>
            <svg viewBox="0 0 100 120" width="100%" height="100%" style={{ overflow: 'visible' }}>
                {/* Whole figure group - handles vertical translation */}
                <g style={{
                    animation: `${id}-whole ${ANIM_DURATION} ease-in-out infinite`,
                }}>

                    {/* === LEGS (pivot from hip) === */}
                    {/* Thigh */}
                    <g style={{
                        transformOrigin: `${hipX}px ${hipY}px`,
                        animation: `${id}-thigh ${ANIM_DURATION} ease-in-out infinite`,
                    }}>
                        <line
                            x1={hipX} y1={hipY}
                            x2={hipX} y2={hipY + thighLen}
                            stroke={color} strokeWidth={strokeW} strokeLinecap={lineCap}
                        />
                        {/* Shin (pivot from knee) */}
                        <g style={{
                            transformOrigin: `${hipX}px ${hipY + thighLen}px`,
                            animation: `${id}-shin ${ANIM_DURATION} ease-in-out infinite`,
                        }}>
                            <line
                                x1={hipX} y1={hipY + thighLen}
                                x2={hipX} y2={hipY + thighLen + shinLen}
                                stroke={color} strokeWidth={strokeW} strokeLinecap={lineCap}
                            />
                            {/* Foot hint */}
                            <line
                                x1={hipX} y1={hipY + thighLen + shinLen}
                                x2={hipX + 5} y2={hipY + thighLen + shinLen}
                                stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap={lineCap}
                            />
                        </g>
                    </g>

                    {/* === TORSO (pivot from hip) === */}
                    <g style={{
                        transformOrigin: `${hipX}px ${hipY}px`,
                        animation: `${id}-torso ${ANIM_DURATION} ease-in-out infinite`,
                    }}>
                        {/* Torso line */}
                        <line
                            x1={hipX} y1={hipY}
                            x2={hipX} y2={hipY - torsoLen}
                            stroke={color} strokeWidth={strokeW} strokeLinecap={lineCap}
                        />

                        {/* Shoulder point */}
                        {/* Head (pivot from neck) */}
                        <g style={{
                            transformOrigin: `${hipX}px ${hipY - torsoLen}px`,
                            animation: `${id}-head ${ANIM_DURATION} ease-in-out infinite`,
                        }}>
                            <circle
                                cx={hipX} cy={hipY - torsoLen - headR}
                                r={headR}
                                fill="none" stroke={color} strokeWidth={strokeW - 0.5}
                            />
                        </g>

                        {/* Upper arm (pivot from shoulder) */}
                        <g style={{
                            transformOrigin: `${hipX}px ${hipY - torsoLen + 3}px`,
                            animation: `${id}-upper-arm ${ANIM_DURATION} ease-in-out infinite`,
                        }}>
                            <line
                                x1={hipX} y1={hipY - torsoLen + 3}
                                x2={hipX} y2={hipY - torsoLen + 3 + upperArmLen}
                                stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap={lineCap}
                            />
                            {/* Forearm (pivot from elbow) */}
                            <g style={{
                                transformOrigin: `${hipX}px ${hipY - torsoLen + 3 + upperArmLen}px`,
                                animation: `${id}-forearm ${ANIM_DURATION} ease-in-out infinite`,
                            }}>
                                <line
                                    x1={hipX} y1={hipY - torsoLen + 3 + upperArmLen}
                                    x2={hipX} y2={hipY - torsoLen + 3 + upperArmLen + forearmLen}
                                    stroke={color} strokeWidth={strokeW - 0.5} strokeLinecap={lineCap}
                                />
                            </g>
                        </g>
                    </g>

                </g>
            </svg>
        </div>
    );
}
