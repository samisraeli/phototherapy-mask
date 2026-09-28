# שקף צילום - Phototherapy Mask

אפליקציית Web/PWA לתרגיל צילום פוטותרפי עם שקפים וירטואליים.

המשתמש פותח קישור בדפדפן, מקבל הנחיה קצרה, בוחר שקף שחור וירטואלי, מצלם דרך מצלמת המכשיר, ומקבל תמונה סופית עם החסימה על גבי הצילום.

## פרטיות

- אין שרת אפליקטיבי.
- אין חשבונות משתמש.
- אין העלאת תמונות.
- אין שמירת תמונות בענן.
- התמונה נוצרת בדפדפן ונשמרת/משותפת רק ביוזמת המשתמש.

## קבצים חשובים

- `index.html` - האפליקציה המלאה.
- `manifest.webmanifest` - הגדרות PWA.
- `sw.js` - Service Worker בסיסי.
- `dist/` - גרסת הפרסום ל-Firebase Hosting.
- `firebase.json` - הגדרת Firebase Hosting.

## הרצה מקומית

```bash
python -m http.server 8088
```

ואז לפתוח:

```text
http://127.0.0.1:8088
```

## פריסה ל-Firebase Hosting

```bash
firebase login
firebase deploy --only hosting
```

Firebase יגיש את התוכן מתוך תיקיית `dist`.
