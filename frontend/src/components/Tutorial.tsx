/**
 * Tutorial Component
 * 
 * Interactive tutorial using react-joyride that guides users through the application.
 * Supports click simulation to showcase dropdown menus.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { getTutorialSteps, TutorialStep, markTutorialAsShown } from '../services/tutorial';

interface TutorialProps {
  autoStart?: boolean;
  onComplete?: () => void;
}

export function Tutorial({ autoStart = false, onComplete }: TutorialProps) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([]);
  const currentStepIndexRef = useRef<number>(0);

  // Convert tutorial steps to react-joyride format
  useEffect(() => {
    const stepsData = getTutorialSteps();
    setTutorialSteps(stepsData);
    const joyrideSteps: Step[] = stepsData.map((step) => ({
      target: step.target,
      content: (
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
            {step.content.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5' }}>
            {step.content.body}
          </p>
        </div>
      ),
      placement: step.placement || 'auto',
      disableBeacon: step.disableBeacon || false,
      disableOverlayClose: step.disableOverlayClose !== false,
    }));
    setSteps(joyrideSteps);
  }, []);

  // Auto-start tutorial if requested
  useEffect(() => {
    if (autoStart && steps.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setRun(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, steps.length]);

  // Handle click simulation for dropdowns
  const simulateClick = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      // Create and dispatch a click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      element.dispatchEvent(clickEvent);
    }
  }, []);


  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type, index } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        currentStepIndexRef.current = 0;
        markTutorialAsShown();
        onComplete?.();
      } else if (type === 'step:before' && typeof index === 'number') {
        // Update ref when entering a step (before it's shown)
        // This is used for dropdown click simulation
        currentStepIndexRef.current = index;
        
        // Trigger dropdown logic by using a small delay
        // We can't use useEffect with the ref, so we handle it here
        setTimeout(() => {
          const currentStep = tutorialSteps[index];
          if (currentStep?.openDropdown) {
            simulateClick(currentStep.openDropdown);
          }
          
          // Close previous dropdown if needed
          if (index > 0) {
            const previousStep = tutorialSteps[index - 1];
            if (previousStep?.openDropdown && !currentStep?.openDropdown) {
              setTimeout(() => {
                simulateClick(previousStep.openDropdown!);
              }, 100);
            }
          }
        }, 300);
      }
    },
    [onComplete, tutorialSteps, simulateClick]
  );

  // Expose start function for manual triggering
  const startTutorial = useCallback(() => {
    currentStepIndexRef.current = 0;
    setRun(true);
  }, []);

  // Store start function on window for future menu item access
  useEffect(() => {
    (window as any).startTutorial = startTutorial;
    return () => {
      delete (window as any).startTutorial;
    };
  }, [startTutorial]);

  if (steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'var(--accent-color)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px var(--shadow-lg)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          color: 'var(--text-primary)',
        },
        tooltipContent: {
          padding: '1rem',
          color: 'var(--text-primary)',
        },
        buttonNext: {
          backgroundColor: 'var(--accent-color)',
          color: 'white',
          borderRadius: '4px',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
        },
        buttonBack: {
          color: 'var(--text-primary)',
          marginRight: '0.5rem',
          fontSize: '0.875rem',
        },
        buttonSkip: {
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: '4px',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}

