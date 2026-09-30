import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Calendar, FileText, ArrowLeft, Edit3 } from 'lucide-react';
import { phototherapyCards } from '../data/cards';

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

interface JournalHistoryProps {
  entries: JournalEntry[];
  onBack: () => void;
  onDeleteEntry: (id: string) => void;
  onClearJournal: () => void;
  onUpdateEntry: (id: string, newText: string) => void;
  onEditEntryWithImage: (entry: JournalEntry) => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  entries,
  onBack,
  onDeleteEntry,
  onClearJournal,
  onEditEntryWithImage
}) => {
  const { t } = useTranslation();
  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'deck' | 'feelingPhoto' | 'imageSequence'>('all');

  const handleClear = () => {
    if (window.confirm(t('confirmClear'))) {
      onClearJournal();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      onDeleteEntry(id);
    }
  };

  const preventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const filteredEntries = exerciseFilter === 'all'
    ? entries
    : entries.filter(entry => (entry.exerciseType || 'deck') === exerciseFilter);

  // Group entries by cardId
  const entriesByCard = filteredEntries.reduce((groups, entry) => {
    if (!groups[entry.cardId]) {
      groups[entry.cardId] = [];
    }
    groups[entry.cardId].push(entry);
    return groups;
  }, {} as Record<string, JournalEntry[]>);

  // Get cards metadata and sort them by the date of the latest reflection
  const cardGroups = Object.keys(entriesByCard).map(cardId => {
    const cardMetadata = phototherapyCards.find(c => c.id === cardId);
    const cardReflections = entriesByCard[cardId].sort((a, b) => {
      // Sort reflections within the card by date (latest first)
      return b.date.localeCompare(a.date);
    });
    const isFeelingPhoto = cardReflections[0]?.exerciseType === 'feelingPhoto';
    const isImageSequence = cardReflections[0]?.exerciseType === 'imageSequence';
    
    return {
      cardId,
      cardMetadata,
      reflections: cardReflections,
      latestDate: cardReflections[0]?.date || '',
      isFeelingPhoto,
      isImageSequence
    };
  }).sort((a, b) => {
    // Sort card groups by their latest reflection date (latest card group first)
    return b.latestDate.localeCompare(a.latestDate);
  });

  return (
    <div className="exercise-workspace">
      <div className="glass-panel" style={{ width: '100%' }}>
        <div className="page-header">
          <h2>{t('journalTitle')}</h2>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={18} className="back-icon" />
            {t('back')}
          </button>
        </div>

        <p>{t('journalSubtitle')}</p>

        {entries.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-danger" style={{ padding: '10px 18px', fontSize: '1.05rem' }} onClick={handleClear}>
              <Trash2 size={16} />
              {t('clearJournal')}
            </button>
          </div>
        )}

        {entries.length > 0 && (
          <div className="journal-filter-bar" role="group" aria-label={t('journalFilterLabel')}>
            <button
              className={`journal-filter-btn ${exerciseFilter === 'all' ? 'active' : ''}`}
              onClick={() => setExerciseFilter('all')}
            >
              {t('journalFilterAll')}
            </button>
            <button
              className={`journal-filter-btn ${exerciseFilter === 'deck' ? 'active' : ''}`}
              onClick={() => setExerciseFilter('deck')}
            >
              {t('journalFilterDeck')}
            </button>
            <button
              className={`journal-filter-btn ${exerciseFilter === 'feelingPhoto' ? 'active' : ''}`}
              onClick={() => setExerciseFilter('feelingPhoto')}
            >
              {t('journalFilterFeelingPhoto')}
            </button>
            <button
              className={`journal-filter-btn ${exerciseFilter === 'imageSequence' ? 'active' : ''}`}
              onClick={() => setExerciseFilter('imageSequence')}
            >
              {t('journalFilterImageSequence')}
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center mt-20" style={{ padding: '32px 0' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
            <p className="text-muted">{t('noEntries')}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center mt-20" style={{ padding: '32px 0' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
            <p className="text-muted">{t('noFilteredEntries')}</p>
          </div>
        ) : (
          <div className="journal-list">
            {cardGroups.map((group) => {
              const imagePath = group.cardMetadata?.imagePath || group.reflections[0]?.imagePath || '/cards/path_fog.png';
              
              return (
                <div key={group.cardId} className="journal-card-group">
                  {/* Left Column: Protected Card Image Thumbnail */}
                  <div 
                    className="journal-group-thumbnail-wrapper"
                    onContextMenu={preventContextMenu}
                  >
                    <img 
                      src={imagePath} 
                      alt="Reflected card thumbnail" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                    />
                    <div 
                      className="image-shield" 
                      onContextMenu={preventContextMenu}
                      style={{ cursor: 'default' }}
                    />
                  </div>

                  {/* Right Column: Stacked Reflections for this Card */}
                  <div className="journal-group-reflections">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', borderBottom: '1px solid var(--panel-border)', paddingBottom: '10px', margin: 0, color: 'var(--accent-color)' }}>
                      {group.isImageSequence
                        ? t('imageSequenceJournalGroupTitle', { count: group.reflections.length })
                        : group.isFeelingPhoto
                          ? t('feelingPhotoJournalGroupTitle', { count: group.reflections.length })
                          : t('cardGroupTitle', { count: group.reflections.length })}
                    </h3>
                    
                    <div className={`journal-reflections-grid ${group.reflections.length > 1 ? 'has-multiple' : ''}`}>
                      {group.reflections.map((ref) => (
                        <div key={ref.id} className="journal-group-item">
                          
                          {/* Item Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div className="flex-row" style={{ color: 'var(--text-muted)', fontSize: '1rem' }} title={t('createdDate')}>
                              <Calendar size={12} />
                              <span>{ref.date}</span>
                            </div>
                            
                            <button 
                              className="btn btn-icon" 
                              style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', color: 'var(--danger-color)' }}
                              onClick={() => handleDelete(ref.id)}
                              title={t('deleteEntry')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Item Body: Question and Reflection text */}
                          <div style={{ paddingLeft: '4px', paddingRight: '4px' }}>
                            {ref.initialFeeling && (
                              <div className="journal-initial-feeling">
                                <span>{t('initialFeelingJournalLabel')}</span>
                                <p>{ref.initialFeeling}</p>
                              </div>
                            )}

                            {ref.sequenceImages && ref.sequenceImages.length > 0 && (
                              <div className="journal-sequence-strip">
                                {ref.sequenceImages.map((sequenceImage, imageIndex) => (
                                  <img
                                    key={`${ref.id}-${imageIndex}`}
                                    src={sequenceImage}
                                    alt={t('sequenceImageAlt', { number: imageIndex + 1 })}
                                  />
                                ))}
                              </div>
                            )}

                            {ref.sequenceNotes && ref.sequenceNotes.some(Boolean) && (
                              <div className="journal-sequence-notes">
                                {ref.sequenceNotes.map((note, noteIndex) => note ? (
                                  <p key={`${ref.id}-note-${noteIndex}`}>
                                    <strong>{noteIndex + 1}.</strong> {note}
                                  </p>
                                ) : null)}
                              </div>
                            )}

                            <div className="journal-item-question">
                              "{ref.question}"
                            </div>

                            <div>
                              <div className="journal-item-text">
                                {ref.text}
                              </div>
                              
                              {ref.emotions && ref.emotions.length > 0 && (
                                <div className="journal-item-emotions">
                                  {ref.emotions.map((emo, eIdx) => (
                                    <span key={eIdx} className="journal-emotion-badge">
                                      {emo}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '9px 14px', fontSize: '1.05rem', gap: '6px', marginTop: '12px' }}
                                onClick={() => onEditEntryWithImage(ref)}
                              >
                                <Edit3 size={15} />
                                {t('editReflection')}
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default JournalHistory;
