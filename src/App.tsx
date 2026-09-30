import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Languages, BookOpen, Compass, Camera, ImagePlus, Images } from 'lucide-react';
import { DeckExercise } from './components/DeckExercise';
import { FeelingPhotoExercise } from './components/FeelingPhotoExercise';
import { ImageSequenceExercise } from './components/ImageSequenceExercise';
import { JournalHistory } from './components/JournalHistory';

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

type AppScreen = 'welcome' | 'deck' | 'feelingPhoto' | 'imageSequence' | 'journal';
type ReturnScreen = Exclude<AppScreen, 'journal'>;

function App() {
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [journalReturnScreen, setJournalReturnScreen] = useState<ReturnScreen>('welcome');
  const [isJournalOverlayOpen, setIsJournalOverlayOpen] = useState(false);
  const [entryToEditWithImage, setEntryToEditWithImage] = useState<JournalEntry | null>(null);
  const [entryToEditFeelingPhoto, setEntryToEditFeelingPhoto] = useState<JournalEntry | null>(null);
  const [entryToEditImageSequence, setEntryToEditImageSequence] = useState<JournalEntry | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const isApplyingBrowserHistoryRef = useRef(false);
  const hasInitializedBrowserHistoryRef = useRef(false);

  const exercises = [
    {
      id: 'deck',
      icon: Camera,
      title: t('exerciseDeck'),
      summary: t('exerciseDeckSummary'),
      details: t('exerciseDeckDetails'),
      action: t('exerciseDeckAction'),
      onStart: () => setScreen('deck')
    },
    {
      id: 'feelingPhoto',
      icon: ImagePlus,
      title: t('exerciseFeelingPhoto'),
      summary: t('exerciseFeelingPhotoSummary'),
      details: t('exerciseFeelingPhotoDetails'),
      action: t('exerciseFeelingPhotoAction'),
      onStart: () => setScreen('feelingPhoto')
    },
    {
      id: 'imageSequence',
      icon: Images,
      title: t('exerciseImageSequence'),
      summary: t('exerciseImageSequenceSummary'),
      details: t('exerciseImageSequenceDetails'),
      action: t('exerciseImageSequenceAction'),
      onStart: () => setScreen('imageSequence')
    }
  ];

  const openJournal = () => {
    if (isJournalOverlayOpen) {
      setIsJournalOverlayOpen(false);
      return;
    }

    if (screen === 'journal') {
      setScreen(journalReturnScreen);
      return;
    }

    if (screen === 'deck' || screen === 'feelingPhoto' || screen === 'imageSequence') {
      setJournalReturnScreen(screen);
      setIsJournalOverlayOpen(true);
      return;
    }

    setJournalReturnScreen('welcome');
    setScreen('journal');
  };

  const closeJournal = () => {
    if (isJournalOverlayOpen) {
      setIsJournalOverlayOpen(false);
      return;
    }

    setScreen(journalReturnScreen);
  };

  const handleEditEntryWithImage = (entry: JournalEntry) => {
    setIsJournalOverlayOpen(false);

    if (entry.exerciseType === 'feelingPhoto') {
      setEntryToEditFeelingPhoto(entry);
      setJournalReturnScreen('feelingPhoto');
      setScreen('feelingPhoto');
      return;
    }

    if (entry.exerciseType === 'imageSequence') {
      setEntryToEditImageSequence(entry);
      setJournalReturnScreen('imageSequence');
      setScreen('imageSequence');
      return;
    }

    setEntryToEditWithImage(entry);
    setJournalReturnScreen('deck');
    setScreen('deck');
  };

  // Load journal entries on startup
  useEffect(() => {
    const saved = localStorage.getItem('phototherapy_journal');
    if (saved) {
      try {
        setJournalEntries(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading journal entries', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!window.history.state?.appScreen) {
      window.history.replaceState({ appScreen: screen }, '', window.location.href);
    }
    hasInitializedBrowserHistoryRef.current = true;

    const handlePopState = (event: PopStateEvent) => {
      const nextScreen = event.state?.appScreen as AppScreen | undefined;
      if (!nextScreen) return;

      isApplyingBrowserHistoryRef.current = true;
      setIsJournalOverlayOpen(false);
      setScreen(nextScreen);
      if (nextScreen !== 'journal') {
        setJournalReturnScreen(nextScreen);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen]);

  useEffect(() => {
    if (!hasInitializedBrowserHistoryRef.current) return;

    if (isApplyingBrowserHistoryRef.current) {
      isApplyingBrowserHistoryRef.current = false;
      return;
    }

    if (window.history.state?.appScreen === screen) return;
    window.history.pushState({ appScreen: screen }, '', window.location.href);
  }, [screen]);

  // Sync theme with HTML attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync language direction (RTL/LTR) with document
  useEffect(() => {
    const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.body.dir = dir;
    document.documentElement.dir = dir;
  }, [i18n.language]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(nextLang);
  };

  const handleSaveEntry = (newEntry: JournalEntry) => {
    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    localStorage.setItem('phototherapy_journal', JSON.stringify(updated));
  };

  const handleDeleteEntry = (id: string) => {
    const updated = journalEntries.filter((entry) => entry.id !== id);
    setJournalEntries(updated);
    localStorage.setItem('phototherapy_journal', JSON.stringify(updated));
  };

  const handleUpdateEntry = (
    id: string,
    newText: string,
    newQuestion?: string,
    newEmotions?: string[],
    updates?: Partial<JournalEntry>
  ) => {
    const updated = journalEntries.map((entry) => 
      entry.id === id 
        ? { 
            ...entry, 
            text: newText, 
            ...(newQuestion !== undefined && { question: newQuestion }),
            ...(newEmotions !== undefined && { emotions: newEmotions }),
            ...(updates || {})
          } 
        : entry
    );
    setJournalEntries(updated);
    localStorage.setItem('phototherapy_journal', JSON.stringify(updated));
  };

  const handleClearJournal = () => {
    setJournalEntries([]);
    localStorage.removeItem('phototherapy_journal');
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header>
        <h1>{t('appName')}</h1>
        <div className="flex-row gap-12">
          {/* Language toggle */}
          <button 
            className="btn-icon" 
            onClick={toggleLanguage} 
            title={i18n.language === 'he' ? 'Switch to English' : 'עבור לעברית'}
          >
            <Languages size={18} />
          </button>
          
          {/* Theme toggle */}
          <button 
            className="btn-icon" 
            onClick={toggleTheme} 
            title={theme === 'light' ? t('themeDark') : t('themeLight')}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Journal shortcut (always shown on header) */}
          <button 
            className="btn-icon" 
            onClick={openJournal} 
            title={t('myJournalButton')}
            style={{ position: 'relative' }}
          >
            <BookOpen size={18} />
            {journalEntries.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--accent-color)',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                {journalEntries.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Router */}
      <main style={{ flexGrow: 1 }}>
        {screen === 'welcome' && (
          <div className="welcome-screen welcome-workspace">
            <div className="glass-panel welcome-intro-panel">
              <div className="welcome-logo">📷✨</div>
              <h2>{t('tagline')}</h2>
              <p className="welcome-intro-text">
                {t('introText')}
              </p>
            </div>

            {/* Exercises section */}
            <section className="exercise-picker">
              <h3 className="exercise-picker-title">
                <Compass size={20} style={{ color: 'var(--accent-color)' }} />
                {t('exerciseSelect')}
              </h3>

              <div className="exercise-grid">
                {exercises.map((exercise) => {
                  const Icon = exercise.icon;

                  return (
                    <article className="exercise-card" key={exercise.id}>
                      <div className="exercise-card-header">
                        <div className="exercise-card-icon" aria-hidden="true">
                          <Icon size={24} />
                        </div>
                        <div className="exercise-card-heading">
                          <h4>{exercise.title}</h4>
                          <p>{exercise.summary}</p>
                        </div>
                      </div>

                      <p className="exercise-card-details">
                        {exercise.details}
                      </p>

                      <button className="btn btn-primary exercise-start-btn" onClick={exercise.onStart}>
                        {exercise.action}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {screen === 'deck' && (
          <DeckExercise 
            onBack={() => setScreen('welcome')} 
            onSaveEntry={handleSaveEntry} 
            journalEntries={journalEntries}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            initialEditEntry={entryToEditWithImage}
            onInitialEditEntryConsumed={() => setEntryToEditWithImage(null)}
          />
        )}

        {screen === 'feelingPhoto' && (
          <FeelingPhotoExercise
            onBack={() => setScreen('welcome')}
            onSaveEntry={handleSaveEntry}
            onUpdateEntry={handleUpdateEntry}
            initialEditEntry={entryToEditFeelingPhoto}
            onInitialEditEntryConsumed={() => setEntryToEditFeelingPhoto(null)}
          />
        )}

        {screen === 'imageSequence' && (
          <ImageSequenceExercise
            onBack={() => setScreen('welcome')}
            onSaveEntry={handleSaveEntry}
            onUpdateEntry={handleUpdateEntry}
            initialEditEntry={entryToEditImageSequence}
            onInitialEditEntryConsumed={() => setEntryToEditImageSequence(null)}
          />
        )}

        {screen === 'journal' && (
          <JournalHistory 
            entries={journalEntries} 
            onBack={closeJournal}
            onDeleteEntry={handleDeleteEntry}
            onClearJournal={handleClearJournal}
            onUpdateEntry={handleUpdateEntry}
            onEditEntryWithImage={handleEditEntryWithImage}
          />
        )}
      </main>

      {isJournalOverlayOpen && (
        <div className="journal-overlay" onClick={closeJournal}>
          <div className="journal-overlay-content" onClick={(e) => e.stopPropagation()}>
            <JournalHistory
              entries={journalEntries}
              onBack={closeJournal}
              onDeleteEntry={handleDeleteEntry}
              onClearJournal={handleClearJournal}
              onUpdateEntry={handleUpdateEntry}
              onEditEntryWithImage={handleEditEntryWithImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
