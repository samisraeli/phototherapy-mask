export interface CardPrompt {
  question: string;
}

export interface Card {
  id: string;
  imagePath: string;
  category: 'metaphor' | 'nature' | 'interpersonal' | 'sensory';
  prompts: {
    he: string[];
    en: string[];
  };
}

export const phototherapyCards: Card[] = [
  {
    id: 'path_fog',
    imagePath: '/cards/path_fog.png',
    category: 'metaphor',
    prompts: {
      he: [
        'מה הדבר הראשון שתופס את העין שלך בתמונה הזו?',
        'אם היית עומד/ת שם, מה לדעתך היית מרגיש/ה?',
        'מה עולה בך כשאת/ה מתבוננ/ת בשביל שנעלם אל תוך הערפל?'
      ],
      en: [
        'What is the first thing that catches your eye in this image?',
        'If you were standing there, what do you think you would feel?',
        'What arises in you when you look at the path disappearing into the fog?'
      ]
    }
  },
  {
    id: 'key_sprout',
    imagePath: '/cards/key_sprout.png',
    category: 'nature',
    prompts: {
      he: [
        'אילו פרטים או ניגודים בתמונה מושכים את תשומת לבך?',
        'אילו מחשבות עולות בך למראה השילוב בין מפתח ישן לנבט חדש?',
        'מה מספרת לך מערכת היחסים בין המפתח, הצמח והסלע?'
      ],
      en: [
        'Which details or contrasts in the image draw your attention?',
        'What thoughts arise when looking at the combination of an old key and a new sprout?',
        'What does the relationship between the key, the plant, and the rock tell you?'
      ]
    }
  },
  {
    id: 'door_stars',
    imagePath: '/cards/door_stars.png',
    category: 'metaphor',
    prompts: {
      he: [
        'מה הדבר הראשון שאת/ה מבחינ/ה בו בתמונה הזו?',
        'מה המראה של הפתח המואר מתוך החדר החשוך מעורר בך?',
        'לאן הדלת הפתוחה הזו מוליכה את הדמיון שלך?'
      ],
      en: [
        'What is the first thing you notice in this image?',
        'What does the sight of the illuminated doorway from within the dark room evoke in you?',
        'Where does this open door lead your imagination?'
      ]
    }
  },
  {
    id: 'hands_light',
    imagePath: '/cards/hands_light.png',
    category: 'sensory',
    prompts: {
      he: [
        'מה מייצג האור החם שמחזיקות הידיים עבורך?',
        'איזו הרגשה מעביר לך האור שמוחזק בין שתי הידיים?',
        'מה עולה בך למראה הידיים המחוספסות האוחזות בנקודה של אור?'
      ],
      en: [
        'What does the warm light held by the hands represent for you?',
        'What feeling does the light held between the two hands convey to you?',
        'What arises in you at the sight of the rough hands holding a point of light?'
      ]
    }
  },
  {
    id: 'chair_beach',
    imagePath: '/cards/chair_beach.png',
    category: 'interpersonal',
    prompts: {
      he: [
        'מה עולה בך כשאת/ה מתבוננ/ת בכיסא הריק הניצב מול הים?',
        'איזה סיפור מספרת התמונה הזו עבורך?',
        'אילו רגשות או זיכרונות מתעוררים בך מול הנוף הזה?'
      ],
      en: [
        'What arises in you when you look at the empty chair standing in front of the sea?',
        'What story does this image tell for you?',
        'What feelings or memories are evoked in you by this landscape?'
      ]
    }
  }
];
export default phototherapyCards;
