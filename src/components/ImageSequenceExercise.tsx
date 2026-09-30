import React, { useCallback, useEffect, useRef, useState } from 'react';
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

interface ImageSequenceExerciseProps {
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

const EMPTY_IMAGES = ['', '', ''];
const EMPTY_NOTES = ['', '', ''];
const INITIAL_ZOOM_SCALES = [1, 1, 1];
const createInitialPanOffsets = () => [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 }
];

export const ImageSequenceExercise: React.FC<ImageSequenceExerciseProps> = ({
  onBack,
  onSaveEntry,
  onUpdateEntry,
  initialEditEntry,
  onInitialEditEntryConsumed
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'he') as 'he' | 'en';
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const imageFrameRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, imageX: 0, imageY: 0 });

  const [images, setImages] = useState<string[]>(EMPTY_IMAGES);
  const [notes, setNotes] = useState<string[]>(EMPTY_NOTES);
  const [storyText, setStoryText] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [zoomScales, setZoomScales] = useState<number[]>(INITIAL_ZOOM_SCALES);
  const [panOffsets, setPanOffsets] = useState(createInitialPanOffsets);
  const [panningIndex, setPanningIndex] = useState<number | null>(null);

  const resetImageView = (index: number) => {
    setZoomScales(prev => {
      const next = [...prev];
      next[index] = 1;
      return next;
    });
    setPanOffsets(prev => {
      const next = [...prev];
      next[index] = { x: 0, y: 0 };
      return next;
    });
    setPanningIndex(null);
  };

  const clampPanOffset = useCallback((index: number, offset: { x: number; y: number }, scale = zoomScales[index]) => {
    const frame = imageFrameRefs.current[index];
    if (!frame || scale <= 1) return { x: 0, y: 0 };

    const frameRect = frame.getBoundingClientRect();
    const maxX = Math.max(0, (frameRect.width * (scale - 1)) / 2);
    const maxY = Math.max(0, (frameRect.height * (scale - 1)) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y))
    };
  }, [zoomScales]);

  const updateZoomScale = (index: number, getNextScale: (prev: number) => number) => {
    setZoomScales(prev => {
      const next = [...prev];
      const nextScale = getNextScale(prev[index]);
      next[index] = nextScale;

      setPanOffsets(prevOffsets => {
        const nextOffsets = [...prevOffsets];
        nextOffsets[index] = nextScale <= 1 ? { x: 0, y: 0 } : clampPanOffset(index, nextOffsets[index], nextScale);
        return nextOffsets;
      });

      if (nextScale <= 1) {
        setPanningIndex(null);
      }

      return next;
    });
  };

  useEffect(() => {
    if (!initialEditEntry) return;

    const loadedImages = initialEditEntry.sequenceImages?.slice(0, 3) || EMPTY_IMAGES;
    const loadedNotes = initialEditEntry.sequenceNotes?.slice(0, 3) || EMPTY_NOTES;

    setImages([...loadedImages, ...EMPTY_IMAGES].slice(0, 3));
    setNotes([...loadedNotes, ...EMPTY_NOTES].slice(0, 3));
    setStoryText(initialEditEntry.text);
    setEditingEntryId(initialEditEntry.id);
    setIsSaved(false);
    setZoomScales(INITIAL_ZOOM_SCALES);
    setPanOffsets(createInitialPanOffsets());
    setPanningIndex(null);
    onInitialEditEntryConsumed?.();
  }, [initialEditEntry, onInitialEditEntryConsumed]);

  const handleImageChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImages(prev => {
        const next = [...prev];
        next[index] = String(reader.result || '');
        return next;
      });
      resetImageView(index);
    };
    reader.readAsDataURL(file);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length || isSaved) return;

    setImages(prev => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setNotes(prev => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setZoomScales(prev => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setPanOffsets(prev => {
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setPanningIndex(null);
  };

  const updateNote = (index: number, value: string) => {
    setNotes(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const resetExercise = () => {
    setImages(EMPTY_IMAGES);
    setNotes(EMPTY_NOTES);
    setStoryText('');
    setEditingEntryId(null);
    setIsSaved(false);
    setZoomScales(INITIAL_ZOOM_SCALES);
    setPanOffsets(createInitialPanOffsets());
    setPanningIndex(null);
    fileInputRefs.current.forEach(input => {
      if (input) input.value = '';
    });
  };

  const updatePanFromClientPoint = useCallback((clientX: number, clientY: number) => {
    if (panningIndex === null || zoomScales[panningIndex] <= 1) return;

    const deltaX = clientX - dragStartRef.current.pointerX;
    const deltaY = clientY - dragStartRef.current.pointerY;

    setPanOffsets(prev => {
      const next = [...prev];
      next[panningIndex] = clampPanOffset(panningIndex, {
        x: dragStartRef.current.imageX + deltaX,
        y: dragStartRef.current.imageY + deltaY
      });
      return next;
    });
  }, [clampPanOffset, panningIndex, zoomScales]);

  const startPan = useCallback((index: number, clientX: number, clientY: number) => {
    if (zoomScales[index] <= 1) return;

    dragStartRef.current = {
      pointerX: clientX,
      pointerY: clientY,
      imageX: panOffsets[index].x,
      imageY: panOffsets[index].y
    };
    setPanningIndex(index);
  }, [panOffsets, zoomScales]);

  useEffect(() => {
    if (panningIndex === null || zoomScales[panningIndex] <= 1) return;

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

    const stopPan = () => setPanningIndex(null);

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
  }, [panningIndex, updatePanFromClientPoint, zoomScales]);

  const handlePointerDown = (index: number, event: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScales[index] <= 1) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    startPan(index, event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panningIndex === null) return;
    event.preventDefault();
    updatePanFromClientPoint(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPanningIndex(null);
  };

  const handleMouseDown = (index: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScales[index] <= 1) return;
    event.preventDefault();
    event.stopPropagation();
    startPan(index, event.clientX, event.clientY);
  };

  const handleTouchStart = (index: number, event: React.TouchEvent<HTMLDivElement>) => {
    if (zoomScales[index] <= 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopPropagation();
    startPan(index, touch.clientX, touch.clientY);
  };

  const hasAllImages = images.every(Boolean);
  const canSave = hasAllImages && storyText.trim().length > 0;
  const question = t('imageSequenceJournalQuestion');
  const earlierDirection = -1;
  const laterDirection = 1;
  const earlierArrow = currentLang === 'he' ? '→' : '←';
  const laterArrow = currentLang === 'he' ? '←' : '→';

  const handleSave = () => {
    if (!canSave) return;

    const updates: Partial<JournalEntry> = {
      imagePath: images[0],
      exerciseType: 'imageSequence',
      sequenceImages: images,
      sequenceNotes: notes
    };

    if (editingEntryId) {
      onUpdateEntry(editingEntryId, storyText, question, [], updates);
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
      cardId: `image-sequence-${Date.now()}`,
      imagePath: images[0],
      question,
      text: storyText,
      emotions: [],
      exerciseType: 'imageSequence',
      sequenceImages: images,
      sequenceNotes: notes
    });
    setIsSaved(true);
  };

  return (
    <div className="exercise-workspace" style={{ width: '100%' }}>
      <div className="glass-panel" style={{ width: '100%' }}>
        <div className="page-header">
          <h2>{t('imageSequenceTitle')}</h2>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={18} className="back-icon" />
            {t('backToHome')}
          </button>
        </div>

        <p>{t('imageSequenceIntro')}</p>

        <div className="sequence-board">
          {images.map((image, index) => (
            <article className="sequence-card" key={index}>
              <div className="sequence-card-topline">
                <h3>{t('sequenceImageLabel', { number: index + 1 })}</h3>
                <div className="sequence-order-controls" aria-label={t('sequenceOrderLabel')}>
                  <button
                    className="btn btn-icon sequence-order-btn"
                    onClick={() => moveImage(index, earlierDirection)}
                    disabled={index === 0 || isSaved}
                    title={t('moveEarlier')}
                    tabIndex={-1}
                  >
                    <span className="sequence-order-arrow" aria-hidden="true">{earlierArrow}</span>
                  </button>
                  <button
                    className="btn btn-icon sequence-order-btn"
                    onClick={() => moveImage(index, laterDirection)}
                    disabled={index === images.length - 1 || isSaved}
                    title={t('moveLater')}
                    tabIndex={-1}
                  >
                    <span className="sequence-order-arrow" aria-hidden="true">{laterArrow}</span>
                  </button>
                </div>
              </div>

              <input
                ref={(element) => {
                  fileInputRefs.current[index] = element;
                }}
                type="file"
                accept="image/*"
                className="visually-hidden"
                disabled={isSaved}
                onChange={(event) => handleImageChange(index, event)}
              />

              <button
                className="btn btn-secondary sequence-upload-button"
                onClick={() => fileInputRefs.current[index]?.click()}
                disabled={isSaved}
              >
                <ImagePlus size={18} />
                {image ? t('replacePhoto') : t('choosePhoto')}
              </button>

              {image && (
                <div
                  className="zoom-controls-overlay sequence-zoom-controls"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="zoom-btn"
                    onClick={() => updateZoomScale(index, prev => Math.min(prev + 0.25, 3))}
                    title={currentLang === 'he' ? 'הגדלה' : 'Zoom In'}
                  >
                    +
                  </button>
                  <button
                    className="zoom-btn"
                    onClick={() => updateZoomScale(index, prev => Math.max(prev - 0.25, 1))}
                    title={currentLang === 'he' ? 'הקטנה' : 'Zoom Out'}
                  >
                    -
                  </button>
                  <button
                    className="zoom-btn"
                    onClick={() => resetImageView(index)}
                    title={currentLang === 'he' ? 'התאמה למסך' : 'Reset / Fit'}
                    style={{ fontSize: '1rem', fontWeight: 'bold' }}
                  >
                    Fit
                  </button>
                </div>
              )}

              <div
                ref={(element) => {
                  imageFrameRefs.current[index] = element;
                }}
                className="sequence-image-frame"
              >
                {image ? (
                  <>
                    <img
                      src={image}
                      alt={t('sequenceImageAlt', { number: index + 1 })}
                      draggable={false}
                      style={{
                        transform: `translate3d(${panOffsets[index].x}px, ${panOffsets[index].y}px, 0px) scale(${zoomScales[index]})`,
                        transformOrigin: 'center center',
                        willChange: 'transform'
                      }}
                    />
                    <div
                      className="sequence-pan-surface"
                      onPointerDown={(event) => handlePointerDown(index, event)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onMouseDown={(event) => handleMouseDown(index, event)}
                      onTouchStart={(event) => handleTouchStart(index, event)}
                      style={{
                        cursor: zoomScales[index] > 1 ? (panningIndex === index ? 'grabbing' : 'grab') : 'default',
                        touchAction: zoomScales[index] > 1 ? 'none' : 'auto'
                      }}
                    />
                  </>
                ) : (
                  <div className="sequence-empty-image">
                    <ImagePlus size={34} />
                    <span>{t('sequenceImageEmpty')}</span>
                  </div>
                )}
              </div>

              <label className="sequence-note-label" htmlFor={`sequence-note-${index}`}>
                {t(`sequencePrompt${index + 1}`)}
              </label>
              <textarea
                id={`sequence-note-${index}`}
                className="journal-textarea sequence-note-textarea"
                value={notes[index]}
                onChange={(event) => updateNote(index, event.target.value)}
                placeholder={t('sequenceNotePlaceholder')}
                disabled={isSaved || !image}
                dir={currentLang === 'he' ? 'rtl' : 'ltr'}
              />
            </article>
          ))}
        </div>

        <section className="sequence-story-panel">
          <label className="feeling-photo-label" htmlFor="sequence-story">
            {t('sequenceStoryLabel')}
          </label>
          <textarea
            id="sequence-story"
            className="journal-textarea"
            value={storyText}
            onChange={(event) => setStoryText(event.target.value)}
            placeholder={hasAllImages ? t('sequenceStoryPlaceholder') : t('sequenceChooseAllImagesFirst')}
            disabled={isSaved || !hasAllImages}
            dir={currentLang === 'he' ? 'rtl' : 'ltr'}
          />
          <div className="textarea-footer">
            <span>{countWords(storyText)} {t('wordCount')}</span>
            <span>{storyText.length} {t('characterCount')}</span>
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
                {t('newImageSequence')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ImageSequenceExercise;
