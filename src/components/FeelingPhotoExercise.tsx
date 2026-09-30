import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, ImagePlus, RefreshCw, Save, X } from 'lucide-react';

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

interface FeelingPhotoExerciseProps {
  onBack: () => void;
  onSaveEntry: (entry: JournalEntry) => void;
  onUpdateEntry: (
    id: string,
    newText: string,
    newQuestion?: string,
    newEmotions?: string[],
    updates?: Partial<JournalEntry>
  ) => void;
  initialEditEntry?: JournalEntry | null;
  onInitialEditEntryConsumed?: () => void;
}

export const FeelingPhotoExercise: React.FC<FeelingPhotoExerciseProps> = ({
  onBack,
  onSaveEntry,
  onUpdateEntry,
  initialEditEntry,
  onInitialEditEntryConsumed
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'he') as 'he' | 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, imageX: 0, imageY: 0 });

  const prompts = useMemo(() => {
    const translatedPrompts = t('feelingPhotoPrompts', { returnObjects: true });
    return Array.isArray(translatedPrompts) ? translatedPrompts as string[] : [];
  }, [t]);
  const [initialFeeling, setInitialFeeling] = useState('');
  const [imageData, setImageData] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [reflectionText, setReflectionText] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const clampPanOffset = useCallback((offset: { x: number; y: number }, scale = zoomScale) => {
    const frame = imageFrameRef.current;
    if (!frame || scale <= 1) return { x: 0, y: 0 };

    const frameRect = frame.getBoundingClientRect();
    const maxX = Math.max(0, (frameRect.width * (scale - 1)) / 2);
    const maxY = Math.max(0, (frameRect.height * (scale - 1)) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y))
    };
  }, [zoomScale]);

  const updateZoomScale = (getNextScale: (prev: number) => number) => {
    setZoomScale(prevScale => {
      const nextScale = getNextScale(prevScale);
      setPanOffset(prevOffset => nextScale <= 1 ? { x: 0, y: 0 } : clampPanOffset(prevOffset, nextScale));
      if (nextScale <= 1) {
        setIsPanning(false);
      }
      return nextScale;
    });
  };

  useEffect(() => {
    if (!initialEditEntry) return;

    const matchingPromptIndex = prompts.findIndex(prompt => prompt === initialEditEntry.question);
    setInitialFeeling(initialEditEntry.initialFeeling || '');
    setImageData(initialEditEntry.imagePath);
    setPromptIndex(matchingPromptIndex === -1 ? 0 : matchingPromptIndex);
    setReflectionText(initialEditEntry.text);
    setEditingEntryId(initialEditEntry.id);
    setIsSaved(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
    onInitialEditEntryConsumed?.();
  }, [initialEditEntry, onInitialEditEntryConsumed, prompts]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result || ''));
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
    };
    reader.readAsDataURL(file);
  };

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const resetExercise = () => {
    setInitialFeeling('');
    setImageData('');
    setPromptIndex(0);
    setReflectionText('');
    setEditingEntryId(null);
    setIsSaved(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updatePanFromClientPoint = useCallback((clientX: number, clientY: number) => {
    if (zoomScale <= 1) return;

    const deltaX = clientX - dragStartRef.current.pointerX;
    const deltaY = clientY - dragStartRef.current.pointerY;

    setPanOffset(clampPanOffset({
      x: dragStartRef.current.imageX + deltaX,
      y: dragStartRef.current.imageY + deltaY
    }));
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    startPan(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || zoomScale <= 1) return;
    event.preventDefault();
    updatePanFromClientPoint(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    event.preventDefault();
    event.stopPropagation();
    startPan(event.clientX, event.clientY);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopPropagation();
    startPan(touch.clientX, touch.clientY);
  };

  const canSave = Boolean(initialFeeling.trim() && imageData && reflectionText.trim());
  const canAnswerImagePrompt = Boolean(imageData);

  const handleSave = () => {
    if (!canSave) return;

    const question = prompts[promptIndex] || '';

    if (editingEntryId) {
      onUpdateEntry(editingEntryId, reflectionText, question, [], {
        imagePath: imageData,
        initialFeeling,
        exerciseType: 'feelingPhoto'
      });
      setIsSaved(true);
      setEditingEntryId(null);
      return;
    }

    onSaveEntry({
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString(currentLang === 'he' ? 'he-IL' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      cardId: `feeling-photo-${Date.now()}`,
      imagePath: imageData,
      question,
      text: reflectionText,
      emotions: [],
      exerciseType: 'feelingPhoto',
      initialFeeling
    });
    setIsSaved(true);
  };

  return (
    <div className="exercise-workspace" style={{ width: '100%' }}>
      <div className="glass-panel" style={{ width: '100%' }}>
        <div className="page-header">
          <h2>{t('feelingPhotoTitle')}</h2>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={18} className="back-icon" />
            {t('backToHome')}
          </button>
        </div>

        <p>{t('feelingPhotoIntro')}</p>

        <div className="feeling-photo-layout">
          <section className="feeling-photo-preview">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="visually-hidden"
              disabled={isSaved}
            />
            <button
              className="btn btn-secondary feeling-photo-upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaved}
            >
              <ImagePlus size={20} />
              {imageData ? t('replacePhoto') : t('choosePhoto')}
            </button>

            <div
              ref={imageFrameRef}
              className="feeling-photo-image-frame"
            >
              {imageData ? (
                <>
                  <div
                    className="zoom-controls-overlay feeling-photo-zoom-controls"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      className="zoom-btn"
                      onClick={() => updateZoomScale(prev => Math.min(prev + 0.25, 3))}
                      title={currentLang === 'he' ? 'הגדלה' : 'Zoom In'}
                    >
                      +
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={() => updateZoomScale(prev => Math.max(prev - 0.25, 1))}
                      title={currentLang === 'he' ? 'הקטנה' : 'Zoom Out'}
                    >
                      -
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={() => {
                        setZoomScale(1);
                        setPanOffset({ x: 0, y: 0 });
                        setIsPanning(false);
                      }}
                      title={currentLang === 'he' ? 'התאמה למסך' : 'Reset / Fit'}
                      style={{ fontSize: '1rem', fontWeight: 'bold' }}
                    >
                      Fit
                    </button>
                  </div>

                  <img
                    src={imageData}
                    alt={t('selectedPhotoAlt')}
                    draggable={false}
                    style={{
                      transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoomScale})`,
                      transformOrigin: 'center center',
                      willChange: 'transform'
                    }}
                  />
                  <div
                    className="feeling-photo-pan-surface"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    style={{
                      cursor: zoomScale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                      touchAction: zoomScale > 1 ? 'none' : 'auto'
                    }}
                  />
                </>
              ) : (
                <div className="feeling-photo-empty-preview">
                  <ImagePlus size={42} />
                  <span>{t('photoPreviewEmpty')}</span>
                </div>
              )}
            </div>
          </section>

          <section className="feeling-photo-panel">
            <label className="feeling-photo-label" htmlFor="initial-feeling">
              {t('initialFeelingLabel')}
            </label>
            <textarea
              id="initial-feeling"
              className="journal-textarea feeling-photo-small-textarea"
              value={initialFeeling}
              onChange={(event) => setInitialFeeling(event.target.value)}
              placeholder={t('initialFeelingPlaceholder')}
              disabled={isSaved}
              dir="auto"
            />

            <div className={`reflection-question feeling-photo-current-question ${!canAnswerImagePrompt ? 'is-disabled' : ''}`}>
              <strong>{canAnswerImagePrompt ? prompts[promptIndex] || '' : t('choosePhotoBeforeAnswer')}</strong>
            </div>

            <label htmlFor="feeling-photo-prompt" className="prompt-select-label">
              {t('promptSelect')}
            </label>
            <select
              id="feeling-photo-prompt"
              className="prompt-selector"
              value={promptIndex}
              onChange={(event) => setPromptIndex(Number(event.target.value))}
              disabled={isSaved || !canAnswerImagePrompt}
            >
              {prompts.map((prompt, index) => (
                <option key={prompt} value={index}>
                  {prompt}
                </option>
              ))}
            </select>

            <textarea
              className="journal-textarea feeling-photo-reflection-textarea"
              value={reflectionText}
              onChange={(event) => setReflectionText(event.target.value)}
              placeholder={canAnswerImagePrompt ? t('feelingPhotoReflectionPlaceholder') : t('choosePhotoBeforeAnswer')}
              disabled={isSaved || !canAnswerImagePrompt}
              dir="auto"
            />

            <div className="textarea-footer">
              <span>{countWords(reflectionText)} {t('wordCount')}</span>
              <span>{reflectionText.length} {t('characterCount')}</span>
            </div>

            {!isSaved ? (
              <div className="feeling-photo-actions">
                <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
                  <Save size={18} />
                  {editingEntryId ? t('updateReflectionBtn') : t('save')}
                </button>
                {editingEntryId && (
                  <button className="btn btn-secondary" onClick={resetExercise}>
                    <X size={18} />
                    {t('cancelEditBtn')}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center" style={{ marginTop: '16px' }}>
                <div className="flex-row flex-center gap-12" style={{ color: 'var(--success-color)', fontWeight: '700', marginBottom: '16px' }}>
                  <CheckCircle size={24} />
                  <span>{t('journalSaved')}</span>
                </div>
                <button className="btn btn-secondary" onClick={resetExercise}>
                  <RefreshCw size={18} />
                  {t('newFeelingPhoto')}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default FeelingPhotoExercise;
