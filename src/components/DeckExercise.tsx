import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Save, CheckCircle, RefreshCw, Check, BookOpen, Trash2, Edit3, X, Play, Pause } from 'lucide-react';
import { phototherapyCards, type Card } from '../data/cards';

interface JournalEntry {
  id: string;
  date: string;
  cardId: string;
  imagePath: string;
  question: string;
  text: string;
  emotions?: string[];
  exerciseType?: 'deck' | 'feelingPhoto' | 'imageSequence';
  initialFeeling?: string;
  sequenceImages?: string[];
  sequenceNotes?: string[];
}

interface DeckExerciseProps {
  onBack: () => void;
  onSaveEntry: (entry: {
    id: string;
    date: string;
    cardId: string;
    imagePath: string;
    question: string;
    text: string;
    emotions?: string[];
    exerciseType?: 'deck' | 'feelingPhoto' | 'imageSequence';
    initialFeeling?: string;
    sequenceImages?: string[];
    sequenceNotes?: string[];
  }) => void;
  journalEntries: JournalEntry[];
  onUpdateEntry: (id: string, newText: string, newQuestion?: string, newEmotions?: string[]) => void;
  onDeleteEntry: (id: string) => void;
  initialEditEntry?: JournalEntry | null;
  onInitialEditEntryConsumed?: () => void;
}

const EMOTIONS_LIST = {
  he: ['תקווה', 'פחד', 'בדידות', 'שקט', 'בלבול', 'כוח', 'עצב', 'שמחה', 'געגוע', 'הקלה'],
  en: ['Hope', 'Fear', 'Loneliness', 'Calm', 'Confusion', 'Strength', 'Sadness', 'Joy', 'Longing', 'Relief']
};

export const DeckExercise: React.FC<DeckExerciseProps> = ({ 
  onBack, 
  onSaveEntry,
  journalEntries,
  onUpdateEntry,
  onDeleteEntry,
  initialEditEntry,
  onInitialEditEntryConsumed
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'he') as 'he' | 'en';

  const [step, setStep] = useState<'grounding' | 'selection' | 'reflection'>('grounding');
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [reflectionText, setReflectionText] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [allCardsCompleted, setAllCardsCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Breathing cycle state
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');

  // Main screen editing state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Interactive Zoom and Pan States for in-place card view
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  // Stores initial pointer coordinates and offsets when drag begins
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, imageX: 0, imageY: 0 });

  // DOM ref for the image container
  const containerRef = useRef<HTMLDivElement>(null);

  const clampPanOffset = useCallback((offset: { x: number; y: number }, scale = zoomScale) => {
    const container = containerRef.current;
    if (!container || scale <= 1) return { x: 0, y: 0 };

    const containerRect = container.getBoundingClientRect();
    const maxX = Math.max(0, (containerRect.width * (scale - 1)) / 2);
    const maxY = Math.max(0, (containerRect.height * (scale - 1)) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y))
    };
  }, [zoomScale]);

  const updateZoomScale = (getNextScale: (prev: number) => number) => {
    setZoomScale(prevScale => {
      const nextScale = getNextScale(prevScale);
      setPanOffset(prevOffset => clampPanOffset(prevOffset, nextScale));
      return nextScale;
    });
  };

  // Shuffle deck on entry (but show all 5 cards at all times)
  useEffect(() => {
    if (step !== 'grounding' && step !== 'selection') return;
    
    const cards = [...phototherapyCards].sort(() => Math.random() - 0.5);
    setShuffledCards(cards);

    const uniqueReflectedCardIds = new Set(journalEntries.map(e => e.cardId));
    setAllCardsCompleted(uniqueReflectedCardIds.size >= phototherapyCards.length);
  }, [journalEntries, step]);

  // Breathing loop timer (4 seconds per phase: Inhale -> Hold -> Exhale -> Rest)
  useEffect(() => {
    if (step !== 'grounding' || !isBreathingActive) return;

    const phases: ('inhale' | 'hold' | 'exhale' | 'rest')[] = ['inhale', 'hold', 'exhale', 'rest'];
    let currentIdx = 0;
    setBreathPhase('inhale');

    const interval = setInterval(() => {
      currentIdx = (currentIdx + 1) % phases.length;
      setBreathPhase(phases[currentIdx]);
    }, 4000);

    return () => clearInterval(interval);
  }, [step, isBreathingActive]);

  const findPromptIndexForEntry = useCallback((card: Card, entryQuestion: string) => {
    const currentLanguagePromptIndex = card.prompts[currentLang].findIndex(p => p === entryQuestion);
    if (currentLanguagePromptIndex !== -1) return currentLanguagePromptIndex;

    for (const lang of ['he', 'en'] as const) {
      const promptIndexInLanguage = card.prompts[lang].findIndex(p => p === entryQuestion);
      if (promptIndexInLanguage !== -1) return promptIndexInLanguage;
    }

    return 0;
  }, [currentLang]);

  const loadEntryForImageEdit = useCallback((entry: JournalEntry) => {
    const card = phototherapyCards.find(c => c.id === entry.cardId);
    if (!card) return;

    setSelectedCard(card);
    setPromptIndex(findPromptIndexForEntry(card, entry.question));
    setStep('reflection');
    setReflectionText(entry.text);
    setSelectedEmotions(entry.emotions || []);
    setEditingEntryId(entry.id);
    setIsSaved(false);
    setIsModalOpen(false);
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsFlipped(true);
  }, [findPromptIndexForEntry]);

  useEffect(() => {
    if (!initialEditEntry) return;
    loadEntryForImageEdit(initialEditEntry);
    onInitialEditEntryConsumed?.();
  }, [initialEditEntry, loadEntryForImageEdit, onInitialEditEntryConsumed]);

  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
    setPromptIndex(Math.floor(Math.random() * 3));
    setStep('reflection');
    setSelectedEmotions([]);
    setIsModalOpen(false);
    setEditingEntryId(null);
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    // Trigger flip animation shortly after transition
    setTimeout(() => {
      setIsFlipped(true);
    }, 300);
  };

  const handleToggleEmotion = (emotion: string) => {
    if (isSaved) return;
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleSave = () => {
    if (!selectedCard || !reflectionText.trim()) return;

    const question = selectedCard.prompts[currentLang][promptIndex];
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString(currentLang === 'he' ? 'he-IL' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      cardId: selectedCard.id,
      imagePath: selectedCard.imagePath,
      question,
      text: reflectionText,
      emotions: selectedEmotions,
      exerciseType: 'deck' as const
    };

    onSaveEntry(newEntry);
    setIsSaved(true);
  };

  const handleUpdateSave = () => {
    if (!editingEntryId || !selectedCard || !reflectionText.trim()) return;
    
    const question = selectedCard.prompts[currentLang][promptIndex];
    onUpdateEntry(editingEntryId, reflectionText, question, selectedEmotions);
    setIsSaved(true);
    setEditingEntryId(null);
  };

  const handleCancelMainEdit = () => {
    setEditingEntryId(null);
    setReflectionText('');
    setSelectedEmotions([]);
    setPromptIndex(0);
  };

  const handleReset = () => {
    setStep('selection');
    setSelectedCard(null);
    setIsFlipped(false);
    setReflectionText('');
    setSelectedEmotions([]);
    setIsSaved(false);
    setIsModalOpen(false);
    setEditingEntryId(null);
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const updatePanFromClientPoint = useCallback((clientX: number, clientY: number) => {
    if (zoomScale <= 1) return;

    const deltaX = clientX - dragStartRef.current.pointerX;
    const deltaY = clientY - dragStartRef.current.pointerY;

    const targetX = dragStartRef.current.imageX + deltaX;
    const targetY = dragStartRef.current.imageY + deltaY;

    setPanOffset(clampPanOffset({ x: targetX, y: targetY }));
  }, [clampPanOffset, zoomScale]);

  const startPan = useCallback((clientX: number, clientY: number) => {
    if (zoomScale <= 1) return;

    dragStartRef.current = {
      pointerX: clientX,
      pointerY: clientY,
      imageX: panOffset.x,
      imageY: panOffset.y
    };
    setIsPanning(true);
  }, [panOffset.x, panOffset.y, zoomScale]);

  useEffect(() => {
    if (!isPanning || zoomScale <= 1) return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      updatePanFromClientPoint(event.clientX, event.clientY);
    };

    const handleWindowTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      updatePanFromClientPoint(touch.clientX, touch.clientY);
    };

    const stopPan = () => setIsPanning(false);

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', stopPan);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', stopPan);
    window.addEventListener('touchcancel', stopPan);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', stopPan);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', stopPan);
      window.removeEventListener('touchcancel', stopPan);
    };
  }, [isPanning, updatePanFromClientPoint, zoomScale]);

  // Pointer events are the preferred path; mouse/touch handlers below are a fallback.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    startPan(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || zoomScale <= 1) return;
    e.preventDefault();
    updatePanFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsPanning(false);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    startPan(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    e.stopPropagation();
    startPan(touch.clientX, touch.clientY);
  };

  const handleLoadPastReflectionForEdit = (ref: JournalEntry) => {
    loadEntryForImageEdit(ref);
  };

  // Find previous reflections for this specific card
  const pastReflections = selectedCard 
    ? journalEntries.filter(entry => entry.cardId === selectedCard.id)
    : [];

  return (
    <div className="exercise-workspace" style={{ width: '100%' }}>
      {/* Grounding Step */}
      {step === 'grounding' && (
        <div className="glass-panel welcome-screen">
          <div className="page-header">
            <h2>{t('groundingTitle')}</h2>
            <button className="btn btn-secondary" onClick={onBack}>
              <ArrowLeft size={18} className="back-icon" />
              {t('backToHome')}
            </button>
          </div>
          
          <p>{t('groundingPrompt')}</p>

          <div className="breathing-container">
            {!isBreathingActive ? (
              <div 
                className="breathing-circle-dynamic static" 
                onClick={() => setIsBreathingActive(true)}
                title={t('startBreathing')}
              >
                <Play size={28} className="play-icon-pulse" style={{ color: 'var(--accent-color)', marginBottom: '8px' }} />
                <span style={{ fontSize: '1.12rem', fontWeight: 'bold' }}>{t('tapToBreathe')}</span>
              </div>
            ) : (
              <div className={`breathing-circle-dynamic ${breathPhase}`}>
                <span style={{ fontSize: '1.75rem', fontWeight: '800' }}>{t(breathPhase)}</span>
                <span style={{ fontSize: '1.08rem', fontWeight: 'normal', marginTop: '6px', opacity: 0.9 }}>
                  {t(`${breathPhase}Desc`)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '280px', margin: '20px auto 0' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsBreathingActive(!isBreathingActive)}
              style={{ width: '100%', gap: '8px' }}
            >
              {isBreathingActive ? <Pause size={16} /> : <Play size={16} />}
              {isBreathingActive ? t('pauseBreathing') : t('startBreathing')}
            </button>

            <button className="btn btn-primary" onClick={() => setStep('selection')} style={{ width: '100%' }}>
              {t('startExercise')}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Card Selection Step */}
      {step === 'selection' && (
        <div className="glass-panel" style={{ width: '100%' }}>
          <div className="page-header">
            <h2>{t('deckTitle')}</h2>
            <button className="btn btn-secondary" onClick={() => setStep('grounding')}>
              <ArrowLeft size={18} className="back-icon" />
              {t('backToBreathing')}
            </button>
          </div>
          
          <p className="text-center">{t('deckSubtitle')}</p>

          {allCardsCompleted && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="badge-reshuffled">
                ✨ {t('allCardsUsedBadge')}
              </div>
            </div>
          )}

          <div className="cards-grid">
            {shuffledCards.map((card, idx) => {
              const isUsed = journalEntries.some(entry => entry.cardId === card.id);
              
              return (
                <div 
                  key={card.id + idx} 
                  className="card-scene"
                  onClick={() => handleSelectCard(card)}
                >
                  <div className="card-inner">
                    {/* Card Back */}
                    <div className="card-face card-face-back">
                      <div className="card-pattern-overlay"></div>
                      
                      {isUsed && (
                        <div className="card-completed-indicator" title={t('completedCardBadge')}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      <div className="card-logo">✨</div>
                      <div className="card-back-text">
                        {currentLang === 'he' ? 'קלף השלכה' : 'Projective'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reflection Step */}
      {step === 'reflection' && selectedCard && (
        <div className="glass-panel" style={{ width: '100%' }}>
          <div className="page-header">
            <h2>{t('deckTitle')}</h2>
            <button className="btn btn-secondary" onClick={handleReset}>
              <ArrowLeft size={18} className="back-icon" />
              {t('backToSelection')}
            </button>
          </div>

          <div className="reflection-container-split">
            {/* Left Column: Protected Card View & Past Reflections Modal Button */}
            <div className="reflection-left-image">
              
              {/* View previous insights button (Placed ABOVE the card image) */}
              {pastReflections.length > 0 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(true)}
                  style={{ width: '100%', gap: '8px', padding: '12px', marginBottom: '16px' }}
                >
                  <BookOpen size={16} />
                  {t('viewPastReflectionsBtn', { count: pastReflections.length })}
                </button>
              )}

              <div 
                className={`card-scene ${isFlipped ? 'is-flipped' : ''}`}
                onContextMenu={preventContextMenu}
                style={{ marginBottom: '16px', position: 'relative' }}
              >
                {/* Interactive Zoom Controls Overlay */}
                {isFlipped && (
                  <div 
                    className="zoom-controls-overlay" 
                    style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 30, direction: 'ltr' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="zoom-btn"
                      onClick={() => updateZoomScale(prev => Math.min(prev + 0.25, 3.0))}
                      title={currentLang === 'he' ? 'זום אין' : 'Zoom In'}
                    >
                      +
                    </button>
                    <button 
                      className="zoom-btn"
                      onClick={() => updateZoomScale(prev => Math.max(prev - 0.25, 1.0))}
                      title={currentLang === 'he' ? 'זום אאוט' : 'Zoom Out'}
                    >
                      -
                    </button>
                    <button 
                      className="zoom-btn"
                      onClick={() => {
                        setZoomScale(1.0);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      title={currentLang === 'he' ? 'התאמה למסך' : 'Reset / Fit'}
                      style={{ fontSize: '1rem', fontWeight: 'bold' }}
                    >
                      Fit
                    </button>
                  </div>
                )}

                <div className="card-inner">
                  {/* Back side of card */}
                  <div className="card-face card-face-back">
                    <div className="card-pattern-overlay"></div>
                    <div className="card-logo">✨</div>
                  </div>
                  {/* Front side (Protected Image with Drag-to-Pan) */}
                  <div className="card-face card-face-front">
                    <div 
                      className="protected-image-container" 
                      ref={containerRef}
                      onContextMenu={preventContextMenu}
                      style={{
                        touchAction: zoomScale > 1 ? 'none' : 'auto',
                        cursor: zoomScale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                      }}
                    >
                      <img 
                        src={selectedCard.imagePath} 
                        alt="Projective card image front" 
                        className="protected-image"
                        draggable={false}
                        style={{
                          transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoomScale})`,
                          transformOrigin: 'center center',
                          willChange: 'transform',
                          userSelect: 'none'
                        }}
                      />
                      <div
                        className="image-shield"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        onContextMenu={preventContextMenu}
                        title={t('imageOverlayTip')}
                        style={{
                          cursor: zoomScale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                          touchAction: zoomScale > 1 ? 'none' : 'auto'
                        }}
                      />
                      <div className="image-watermark">
                        {t('protected')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Reflections Form & Emotion Tags */}
            <div className="reflection-right-controls">
              {/* Editing Banner */}
              {editingEntryId && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(109, 93, 252, 0.15)',
                  border: '1px solid rgba(109, 93, 252, 0.3)',
                  color: 'var(--accent-color)',
                  fontSize: '1.08rem',
                  fontWeight: '600',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Edit3 size={14} />
                  <span>{t('editingReflection')}</span>
                </div>
              )}

              <label className="text-muted" style={{ fontSize: '1.08rem' }}>
                {t('cardFlipPrompt')}
              </label>
              
              {/* Prompt Display & Toggle */}
              <div className="reflection-question glass-panel" style={{ padding: '16px', marginBottom: '4px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.2rem', lineHeight: '1.5' }}>{selectedCard.prompts[currentLang][promptIndex]}</strong>
              </div>

              <div>
                <label htmlFor="prompt-select" className="prompt-select-label">
                  {t('promptSelect')}
                </label>
                <select 
                  id="prompt-select"
                  className="prompt-selector"
                  value={promptIndex}
                  onChange={(e) => setPromptIndex(Number(e.target.value))}
                  disabled={isSaved}
                >
                  {selectedCard.prompts[currentLang].map((p, idx) => (
                    <option key={idx} value={idx}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Therapeutic Element: Emotion Tag Selector */}
              <div>
                <label className="text-muted" style={{ fontSize: '1.08rem', display: 'block', marginBottom: '4px' }}>
                  {t('selectEmotions')}
                </label>
                <div className="emotions-container">
                  {EMOTIONS_LIST[currentLang].map((emotion) => {
                    const isSelected = selectedEmotions.includes(emotion);
                    return (
                      <span 
                        key={emotion}
                        className={`emotion-tag ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleEmotion(emotion)}
                      >
                        {emotion}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Reflection Text Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <textarea
                  className="journal-textarea"
                  placeholder={t('writeReflection')}
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  disabled={isSaved}
                  dir="auto"
                />
                
                <div className="textarea-footer">
                  <span>{countWords(reflectionText)} {t('wordCount')}</span>
                  <span>{reflectionText.length} {t('characterCount')}</span>
                </div>
              </div>

              {/* Save / Update Button */}
              {!isSaved ? (
                editingEntryId ? (
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleUpdateSave}
                      disabled={!reflectionText.trim()}
                      style={{ flex: 2, padding: '14px' }}
                    >
                      <Save size={18} />
                      {t('updateReflectionBtn')}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleCancelMainEdit}
                      style={{ flex: 1, padding: '14px' }}
                    >
                      <X size={18} />
                      {t('cancelEditBtn')}
                    </button>
                  </div>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    disabled={!reflectionText.trim()}
                    style={{ width: '100%', padding: '14px' }}
                  >
                    <Save size={18} />
                    {t('save')}
                  </button>
                )
              ) : (
                <div className="text-center" style={{ animation: 'fadeIn 0.5s ease', marginTop: '12px' }}>
                  <div className="flex-row flex-center gap-12" style={{ color: 'var(--success-color)', fontWeight: '600', marginBottom: '16px' }}>
                    <CheckCircle size={24} />
                    <span>{t('journalSaved')}</span>
                  </div>
                  <div className="flex-row flex-center gap-12">
                    <button className="btn btn-secondary" onClick={handleReset} style={{ width: '100%' }}>
                      <RefreshCw size={18} />
                      {currentLang === 'he' ? 'קלף נוסף' : 'Draw another'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup overlay for past card reflections */}
      {isModalOpen && selectedCard && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Top Right Corner X Close Button */}
            <button 
              className="modal-close-x" 
              onClick={() => setIsModalOpen(false)}
              title={t('close')}
            >
              <X size={18} />
            </button>

            <h3 style={{ borderBottom: '2px solid var(--panel-border)', paddingBottom: '14px', marginBottom: '8px', fontSize: '1.35rem', paddingLeft: currentLang === 'he' ? '52px' : '0', paddingRight: currentLang === 'he' ? '0' : '52px' }}>
              {t('pastReflectionsTitle')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '55vh', overflowY: 'auto', paddingRight: currentLang === 'he' ? '0' : '8px', paddingLeft: currentLang === 'he' ? '8px' : '0' }}>
              {pastReflections.map((ref) => (
                <div key={ref.id} className="journal-group-item">
                  
                  {/* Item Header with Load for Edit & Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div className="flex-row" style={{ color: 'var(--text-muted)', fontSize: '1rem' }} title={t('createdDate')}>
                      <BookOpen size={12} />
                      <span>{ref.date}</span>
                    </div>
                    
                    <div className="flex-row gap-12">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '9px 14px', fontSize: '1.05rem', gap: '6px' }}
                        onClick={() => handleLoadPastReflectionForEdit(ref)}
                        title={t('editReflection')}
                      >
                        <Edit3 size={14} />
                        {t('editReflection')}
                      </button>
                      <button 
                        className="btn btn-icon" 
                        style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--danger-color)' }}
                        onClick={() => {
                          if (window.confirm(t('deleteConfirm'))) {
                            onDeleteEntry(ref.id);
                          }
                        }}
                        title={t('deleteEntry')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  <p style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)', fontSize: '1.2rem' }}>
                    "{ref.question}"
                  </p>

                  {/* Reflection Text */}
                  <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '1.2rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {ref.text}
                  </p>

                  {ref.emotions && ref.emotions.length > 0 && (
                    <div className="journal-item-emotions" style={{ marginTop: '8px' }}>
                      {ref.emotions.map((emo, eIdx) => (
                        <span key={eIdx} className="journal-emotion-badge">
                          {emo}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button 
              className="btn btn-secondary mt-12" 
              onClick={() => setIsModalOpen(false)}
              style={{ alignSelf: 'center', minWidth: '120px' }}
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default DeckExercise;
