import React from 'react';
import { Check } from 'lucide-react';

export type LaunchStep = 1 | 2 | 3 | 4 | 5;

interface StepDef {
  num: LaunchStep;
  label: string;
  subtitle: string;
}

const STEPS: StepDef[] = [
  { num: 1, label: 'UPLOAD',     subtitle: 'Audio file' },
  { num: 2, label: 'METADATA',   subtitle: 'Token info' },
  { num: 3, label: 'TOKENOMICS', subtitle: 'Ticker & config' },
  { num: 4, label: 'REVIEW',     subtitle: 'Check details' },
  { num: 5, label: 'LAUNCH',     subtitle: 'Go live' },
];

interface LaunchStepIndicatorProps {
  currentStep: LaunchStep;
  onStepClick: (step: LaunchStep) => void;
  maxReached: LaunchStep;
}

// ─── Vertical Sidebar Version (default export) ────────────────────────────────

const LaunchStepIndicator: React.FC<LaunchStepIndicatorProps> = ({ currentStep, onStepClick, maxReached }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {STEPS.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        const isClickable = step.num <= maxReached;

        return (
          <div key={step.num} style={{ position: 'relative' }}>
            {/* Active left bar */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              borderRadius: '0 2px 2px 0',
              background: isActive ? '#00FF66' : 'transparent',
              boxShadow: isActive ? '0 0 8px rgba(0,255,102,0.6)' : 'none',
              transition: 'background 200ms ease',
            }} />

            <button
              type="button"
              onClick={() => isClickable ? onStepClick(step.num) : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '11px 12px 11px 16px',
                cursor: isClickable ? 'pointer' : 'default',
                background: isActive ? 'rgba(0,255,102,0.05)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                transition: 'background 200ms ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (isClickable && !isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Number circle */}
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 200ms ease',
                background: isActive
                  ? '#00FF66'
                  : isCompleted
                  ? '#00CC4D'
                  : '#1a1a1a',
                border: isActive ? 'none' : isCompleted ? 'none' : '1px solid #2a2a2a',
                boxShadow: isActive ? '0 0 14px rgba(0,255,102,0.5)' : 'none',
              }}>
                {isCompleted ? (
                  <Check size={13} style={{ color: '#000' }} />
                ) : (
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isActive ? '#000' : '#555',
                    letterSpacing: '0.02em',
                  }}>
                    {step.num}
                  </span>
                )}
              </div>

              {/* Label + subtitle */}
              <div>
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isActive ? '#FFFFFF' : isCompleted ? '#888' : '#444',
                  transition: 'color 200ms ease',
                  marginBottom: '2px',
                }}>
                  {step.label}
                </div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '10px',
                  color: isActive ? '#A1A1AA' : '#333',
                  transition: 'color 200ms ease',
                }}>
                  {step.subtitle}
                </div>
              </div>
            </button>

            {/* Dashed connecting line between steps */}
            {idx < STEPS.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '27px',
                bottom: '-13px',
                width: '1px',
                height: '13px',
                borderLeft: `1px dashed ${isCompleted ? 'rgba(0,204,77,0.4)' : '#2a2a2a'}`,
                zIndex: 1,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LaunchStepIndicator;

// ─── Horizontal Tracker Version ────────────────────────────────────────────────

interface LaunchStepTrackerHorizontalProps {
  currentStep: LaunchStep;
  maxReached: LaunchStep;
  onStepClick?: (step: LaunchStep) => void;
}

export const LaunchStepTrackerHorizontal: React.FC<LaunchStepTrackerHorizontalProps> = ({
  currentStep,
  maxReached,
  onStepClick,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEPS.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        const isClickable = onStepClick && step.num <= maxReached;

        return (
          <React.Fragment key={step.num}>
            <button
              type="button"
              onClick={() => isClickable ? onStepClick!(step.num) : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px',
                cursor: isClickable ? 'pointer' : 'default',
                background: 'none',
                border: 'none',
                padding: '0 4px',
                minWidth: '52px',
              }}
            >
              {/* Circle */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
                background: isActive
                  ? '#00FF66'
                  : isCompleted
                  ? '#00CC4D'
                  : '#1a1a1a',
                border: isActive || isCompleted ? 'none' : '1px solid #2a2a2a',
                boxShadow: isActive ? '0 0 12px rgba(0,255,102,0.6)' : 'none',
                flexShrink: 0,
              }}>
                {isCompleted ? (
                  <Check size={12} style={{ color: '#000' }} />
                ) : (
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isActive ? '#000' : '#555',
                  }}>
                    {step.num}
                  </span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '7px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: isActive ? '#00FF66' : isCompleted ? '#00CC4D' : '#444',
                transition: 'color 200ms ease',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div style={{
                flex: '1 1 12px',
                height: '1px',
                marginBottom: '20px',
                borderTop: `1px dashed ${isCompleted ? 'rgba(0,204,77,0.5)' : '#2a2a2a'}`,
                minWidth: '8px',
                maxWidth: '32px',
                transition: 'border-color 300ms ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
