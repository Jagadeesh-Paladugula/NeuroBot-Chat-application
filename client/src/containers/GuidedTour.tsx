import { useEffect, useMemo, useRef, useState } from 'react';
import Joyride, { STATUS, EVENTS, CallBackProps, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const AI_STEP_SELECTOR = '[data-tour-id="tour-ai-bot"]';
const THEME_TOGGLE_SELECTOR = '[data-tour-id="tour-theme-toggle"]';
const GROUPS_ICON_SELECTOR = '[data-tour-id="tour-groups-icon"]';
const SUMMARY_SELECTOR = '[data-tour-id="tour-ai-summary"]';
const SUMMARY_FALLBACK_SELECTOR = '[data-tour-id="tour-summary-fallback"]';

const normalizeId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'object' && value !== null) {
    if ('_id' in value) return String(value._id);
    if ('id' in value) return String(value.id);
  }
  return String(value);
};

type TourPhase = 'idle' | 'ai' | 'theme' | 'groups' | 'summarySetup' | 'summary' | 'complete';

const GuidedTour = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [tourPhase, setTourPhase] = useState<TourPhase>('idle');
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupConversationId, setGroupConversationId] = useState('');
  const [forceFallback, setForceFallback] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [tourInstanceId, setTourInstanceId] = useState(0);

  const summaryAttemptsRef = useRef(0);
  const summaryCheckerRef = useRef<number | null>(null);
  const hasNavigatedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const processedPhasesRef = useRef<Set<string>>(new Set());
  const activeStepRef = useRef<string | null>(null);
  const callbackTimeoutRef = useRef<number | null>(null);
  const lastCallbackTimeRef = useRef<number>(0);
  const isStepActiveRef = useRef<boolean>(false);
  const lastProcessedCallbackRef = useRef<string>('');

  const userId = user?.id || user?._id;

  useEffect(() => {
    // Reset any pending timers when the component unmounts
    return () => {
      if (summaryCheckerRef.current !== null) {
        window.clearTimeout(summaryCheckerRef.current);
        summaryCheckerRef.current = null;
      }
      if (callbackTimeoutRef.current !== null) {
        window.clearTimeout(callbackTimeoutRef.current);
        callbackTimeoutRef.current = null;
      }
    };
  }, []);

  const tourStartedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setTourPhase('idle');
      setGroupsLoaded(false);
      setGroupConversationId('');
      setForceFallback(false);
      tourStartedRef.current = false;
      return;
    }

    // Only start tour if we're on a page with MainSidebar (chats pages)
    // Don't interfere with profile page or other routes
    if (!location.pathname.startsWith('/chats')) {
      // Don't navigate away from profile or other non-chat pages
      return;
    }

    // Don't restart the tour if it's already in progress or completed
    if (tourStartedRef.current && tourPhase !== 'idle' && tourPhase !== 'complete') {
      return;
    }

    // Only start the tour once per user session
    if (tourStartedRef.current) {
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      tourStartedRef.current = true;
      summaryAttemptsRef.current = 0;
      processedPhasesRef.current.clear();
      isTransitioningRef.current = false;
      setIsTransitioning(false);
      activeStepRef.current = null;
      isStepActiveRef.current = false;
      lastCallbackTimeRef.current = 0;
      lastProcessedCallbackRef.current = '';
      if (callbackTimeoutRef.current !== null) {
        window.clearTimeout(callbackTimeoutRef.current);
        callbackTimeoutRef.current = null;
      }
      setTourInstanceId(prev => prev + 1);
      setTourPhase('ai');
      setForceFallback(false);
      setGroupsLoaded(false);
      setGroupConversationId('');
      hasNavigatedRef.current = false;
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, location.pathname]);

  useEffect(() => {
    if (!userId || tourPhase === 'complete' || groupsLoaded) {
      return;
    }

    let cancelled = false;

    const fetchGroups = async () => {
      try {
        const response = await api.get<{ conversations?: Array<{ type?: string; id?: string; _id?: string }> }>('/conversations');
        if (cancelled) return;

        const rawConversations = Array.isArray(response.data?.conversations)
          ? response.data.conversations
          : [];

        const groupConversation = rawConversations.find(
          (conversation) => conversation?.type === 'group'
        );

        setGroupConversationId(groupConversation ? normalizeId(groupConversation.id || groupConversation._id) : '');
      } catch (error) {
        console.error('Failed to load group conversations for guided tour:', error);
        if (!cancelled) {
          setGroupConversationId('');
        }
      } finally {
        if (!cancelled) {
          setGroupsLoaded(true);
        }
      }
    };

    fetchGroups();

    return () => {
      cancelled = true;
    };
  }, [userId, tourPhase, groupsLoaded]);

  useEffect(() => {
    if (tourPhase !== 'summarySetup' || !groupsLoaded) {
      return undefined;
    }

    const targetConversationId = groupConversationId;

    if (targetConversationId) {
      const targetPath = `/chats/${targetConversationId}`;
      if (!location.pathname.startsWith(targetPath)) {
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate(targetPath);
        }
        return undefined;
      }

      const observeSummaryButton = () => {
        const summaryButton = document.querySelector(SUMMARY_SELECTOR);
        if (summaryButton) {
          summaryAttemptsRef.current = 0;
          setTourPhase('summary');
          return;
        }

        if (summaryAttemptsRef.current >= 20) {
          setForceFallback(true);
          setTourPhase('summary');
          return;
        }

        summaryAttemptsRef.current += 1;
        summaryCheckerRef.current = window.setTimeout(observeSummaryButton, 200);
      };

      observeSummaryButton();

      return () => {
        if (summaryCheckerRef.current !== null) {
          window.clearTimeout(summaryCheckerRef.current);
          summaryCheckerRef.current = null;
        }
      };
    }

    // No group chats available; fallback to explaining the summary feature
    if (!location.pathname.startsWith('/chats')) {
      navigate('/chats');
      return undefined;
    }

    setForceFallback(true);
    setTourPhase('summary');
    return undefined;
  }, [tourPhase, groupsLoaded, groupConversationId, location.pathname, navigate]);

  const finishTour = () => {
    setTourPhase('complete');
    setForceFallback(false);
    hasNavigatedRef.current = false;
    tourStartedRef.current = false; // Allow tour to restart on next login
  };

  const scrollToBottomOfChat = () => {
    // Find the messages container and scroll to bottom
    const messagesContainer = document.querySelector('[data-messages-container]') as HTMLElement;
    const messagesEnd = document.querySelector('[data-messages-end]') as HTMLElement;
    
    if (messagesEnd) {
      // Scroll to the end marker with smooth animation
      setTimeout(() => {
        messagesEnd.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    } else if (messagesContainer) {
      // Fallback: scroll the container itself
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 300);
    }
  };

  const waitForElement = (selector: string, maxAttempts = 50): Promise<Element | null> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkElement, 100);
        } else {
          resolve(null);
        }
      };
      checkElement();
    });
  };

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, type, action } = data;

    if (status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    // Only handle STEP_AFTER with 'next' action for the first 3 steps
    if (type === EVENTS.STEP_AFTER && action === 'next') {
      // Create a unique callback identifier to prevent duplicate processing
      const callbackId = `${type}-${action}-${tourPhase}-${tourInstanceId}`;
      const phaseKey = `${tourPhase}-${tourInstanceId}`;
      
      // Multiple checks to prevent duplicate processing
      if (lastProcessedCallbackRef.current === callbackId) {
        return;
      }
      
      if (processedPhasesRef.current.has(phaseKey)) {
        return;
      }

      if (isTransitioningRef.current) {
        return;
      }

      // Mark this callback and phase as processed IMMEDIATELY before any async operations
      lastProcessedCallbackRef.current = callbackId;
      processedPhasesRef.current.add(phaseKey);
      isTransitioningRef.current = true;
      setIsTransitioning(true);

      if (tourPhase === 'ai') {
        // Small delay to ensure smooth transition
        setTimeout(async () => {
          await waitForElement(THEME_TOGGLE_SELECTOR, 30);
          // Clear callback ref for next phase
          lastProcessedCallbackRef.current = '';
          isTransitioningRef.current = false;
          setIsTransitioning(false);
          setTourPhase('theme');
        }, 300);
        return;
      }

      if (tourPhase === 'theme') {
        // Small delay to ensure smooth transition
        setTimeout(async () => {
          await waitForElement(GROUPS_ICON_SELECTOR, 30);
          // Clear callback ref for next phase
          lastProcessedCallbackRef.current = '';
          isTransitioningRef.current = false;
          setIsTransitioning(false);
          setTourPhase('groups');
        }, 300);
        return;
      }

      if (tourPhase === 'groups') {
        // Clear callback ref for next phase
        lastProcessedCallbackRef.current = '';
        hasNavigatedRef.current = false;
        summaryAttemptsRef.current = 0;
        isTransitioningRef.current = false;
        setIsTransitioning(false);
        setTourPhase('summarySetup');
        return;
      }
    }

    // Handle the final step completion separately
    if (status === STATUS.FINISHED && tourPhase === 'summary' && action === 'next') {
      const summaryKey = `summary-${tourInstanceId}`;
      const summaryCallbackId = `${status}-${action}-${tourPhase}-${tourInstanceId}`;
      
      // Prevent duplicate processing
      if (processedPhasesRef.current.has(summaryKey) || lastProcessedCallbackRef.current === summaryCallbackId) {
        return;
      }

      lastProcessedCallbackRef.current = summaryCallbackId;
      processedPhasesRef.current.add(summaryKey);
      scrollToBottomOfChat();
      finishTour();
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      // If target not found, wait a bit and try to proceed
      if (tourPhase === 'ai' || tourPhase === 'theme' || tourPhase === 'groups') {
        // Wait for element and retry
        setTimeout(async () => {
          const selector = 
            tourPhase === 'ai' ? AI_STEP_SELECTOR :
            tourPhase === 'theme' ? THEME_TOGGLE_SELECTOR :
            GROUPS_ICON_SELECTOR;
          const element = await waitForElement(selector, 30);
          if (!element) {
            // Skip to next phase if element still not found
            if (tourPhase === 'ai') {
              setTourPhase('theme');
            } else if (tourPhase === 'theme') {
              setTourPhase('groups');
            } else if (tourPhase === 'groups') {
              setTourPhase('summarySetup');
            }
          }
        }, 500);
      } else if (tourPhase === 'summary') {
        setForceFallback(true);
      }
    }
  };

  const steps = useMemo((): Step[] => {

    if (tourPhase === 'ai') {
      return [
        {
          target: AI_STEP_SELECTOR,
          content: 'Chat with your AI assistant anytime for help or smart replies.',
          placement: 'right',
          disableBeacon: true,
        },
      ];
    }

    if (tourPhase === 'theme') {
      return [
        {
          target: THEME_TOGGLE_SELECTOR,
          content: 'Toggle between light and dark mode to customize your experience.',
          placement: 'right',
          disableBeacon: true,
        },
      ];
    }

    if (tourPhase === 'groups') {
      return [
        {
          target: GROUPS_ICON_SELECTOR,
          content: 'Access your group conversations and collaborate with multiple people.',
          placement: 'right',
          disableBeacon: true,
        },
      ];
    }

    if (tourPhase === 'summary') {
      const useSummaryButton = Boolean(groupConversationId) && !forceFallback;
      return [
        {
          target: useSummaryButton ? SUMMARY_SELECTOR : SUMMARY_FALLBACK_SELECTOR,
          content: 'Get quick summaries of group conversations with one click.',
          placement: useSummaryButton ? 'bottom' : 'right',
          disableBeacon: true,
        },
      ];
    }

    return [];
  }, [tourPhase, groupConversationId, forceFallback]);

  // Check if this phase has already been processed for this tour instance
  const currentPhaseKey = `${tourPhase}-${tourInstanceId}`;
  const phaseProcessed = processedPhasesRef.current.has(currentPhaseKey);
  
  const shouldRun = (tourPhase === 'ai' || tourPhase === 'theme' || tourPhase === 'groups' || tourPhase === 'summary') 
    && !isTransitioning
    && !phaseProcessed;

  if (!userId || steps.length === 0 || tourPhase === 'complete') {
    return null;
  }

  return (
    <Joyride
      key={`tour-${tourPhase}-${tourInstanceId}-${phaseProcessed ? 'processed' : 'active'}`}
      steps={steps}
      run={shouldRun}
      continuous
      showProgress
      showSkipButton={false}
      disableScrollParentFix
      scrollToFirstStep
      scrollOffset={20}
      spotlightClicks
      callback={handleJoyrideCallback}
      hideCloseButton={true}
      styles={{
        options: {
          primaryColor: '#4F46E5',
          textColor: '#111827',
          zIndex: 10000,
          arrowColor: '#4F46E5',
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContent: {
          textAlign: 'left',
          padding: 0,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          outline: 'none',
        },
        buttonBack: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '14px',
          marginRight: 10,
          outline: 'none',
        },
        buttonSkip: {
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '14px',
          outline: 'none',
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Next',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};

export default GuidedTour;

