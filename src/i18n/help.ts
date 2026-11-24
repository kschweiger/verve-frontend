export const en = {
  center: 'Help Center',
  tabs: {
    start: 'Getting Started',
    faq: 'FAQ',
    formats: 'File Formats',
    about: 'About',
  },
  faq: {
    title: 'Frequently Asked Questions',
    delete: {
      question: 'How do I delete an activity?',
      answer: 'Open the activity details. Click the red trash icon in the top right and confirm the deletion.',
    },
    gear: {
      question: 'Can I track equipment usage?',
      answer: 'Go to My Gear to add your shoes, bikes, and other equipment. You can assign them to individual activities or set up default equipment sets for specific activity types.',
    },
    heatmap: {
      question: 'How does the Heatmap work?',
      answer: 'The heatmap aggregates GPS points from your activities. Filter by year or activity type on the heatmap. In Settings, you can exclude activity types from the heatmap.',
    },
    swimming: {
      question: 'What swimming metadata does Verve support?',
      metadata: 'Verve files can include source-neutral swimming metadata under {target}. This can describe pool length, total stroke count, average SWOLF, lap count, set count, stroke styles, laps, and sets.',
      laps: 'Laps are the smallest exported swim records, usually one pool length. Sets group one or more laps, such as a 100 m breaststroke set made from two 50 m laps. Activity details can display a swim summary and a table of sets when swim metadata is available.',
      pool: 'Pool length is optional, so open-water swims or incomplete exports can still be valid. The activity type and subtype describe where you swam.',
    },
    swolf: {
      question: 'What is SWOLF?',
      answer: 'SWOLF means swim golf. Add the time in seconds and the number of strokes for one pool length. For example, 54 seconds and 26 strokes over 50 m gives a score of 80. Lower scores are better when comparing the same pool length.',
    },
  },
  formats: {
    supported: 'Verve supports {gpx}, {fit}, and {geojson} files.',
    developer: 'Building an integration or creating custom activity files? The developer documentation has the Verve file format definition and examples.',
    link: 'Verve file format documentation',
    newTab: '(opens in a new tab)',
  },
  start: {
    introduction: 'Welcome to Verve Outdoors! Set up your profile to start tracking activities.',
    profile: '1. Configure your profile',
    profileDescription: 'Set your default activity types in Settings to speed up uploads.',
    upload: '2. Upload activities',
    uploadDescription: 'Use the Add button on the dashboard to upload GPX files from your watch or phone.',
    goals: '3. Define goals',
    goalsDescription: 'Set weekly or monthly distance goals to track your progress.',
  },
  about: {
    description: 'A privacy-focused, self-hosted activity tracker for outdoor enthusiasts who want full control over their data.',
    version: 'Version {value}',
  },
};

export const de = {
  center: 'Hilfe',
  tabs: {
    start: 'Erste Schritte',
    faq: 'Häufige Fragen',
    formats: 'Dateiformate',
    about: 'Über Verve',
  },
  faq: {
    title: 'Häufig gestellte Fragen',
    delete: {
      question: 'Wie lösche ich eine Aktivität?',
      answer: 'Öffne die Aktivitätsdetails. Klicke oben rechts auf das rote Papierkorbsymbol und bestätige, dass du die Aktivität löschen möchtest.',
    },
    gear: {
      question: 'Kann ich die Nutzung meiner Ausrüstung verfolgen?',
      answer: 'Unter „Meine Ausrüstung“ kannst du deine Schuhe, Fahrräder und weitere Ausrüstung hinzufügen. Weise sie einzelnen Aktivitäten zu oder lege Ausrüstungssets als Standard für bestimmte Aktivitätstypen fest.',
    },
    heatmap: {
      question: 'Wie funktioniert die Heatmap?',
      answer: 'Die Heatmap fasst GPS-Punkte aus deinen Aktivitäten zusammen. Du kannst direkt auf der Heatmap nach Jahr oder Aktivitätstyp filtern. In den Einstellungen kannst du Aktivitätstypen von der Heatmap ausschließen.',
    },
    swimming: {
      question: 'Welche Schwimmmetadaten unterstützt Verve?',
      metadata: 'Verve-Dateien können unter {target} Schwimmmetadaten aus unterschiedlichen Quellen enthalten. Dazu gehören die Beckenlänge, die Gesamtzahl der Schwimmzüge, der durchschnittliche SWOLF, die Anzahl der Bahnen und Serien, die Schwimmstile sowie einzelne Bahnen und Serien.',
      laps: 'Bahnen sind die kleinsten exportierten Schwimmabschnitte und entsprechen meist einer Beckenlänge. Serien fassen eine oder mehrere Bahnen zusammen, etwa zwei Bahnen à 50 m zu einer Serie über 100 m Brust. Wenn Schwimmmetadaten vorliegen, können die Aktivitätsdetails eine Schwimmübersicht und eine Serientabelle anzeigen.',
      pool: 'Die Beckenlänge ist optional. Auch Freiwasseraktivitäten und unvollständige Exporte sind daher gültig. Der Aktivitätstyp und der Untertyp geben an, wo du geschwommen bist.',
    },
    swolf: {
      question: 'Was ist SWOLF?',
      answer: 'SWOLF steht für „Swim Golf“. Addiere die Zeit in Sekunden und die Anzahl der Schwimmzüge für eine Bahn. Bei 54 Sekunden und 26 Zügen über 50 m beträgt der SWOLF beispielsweise 80. Bei gleicher Beckenlänge sind niedrigere Werte besser.',
    },
  },
  formats: {
    supported: 'Verve unterstützt Dateien in den Formaten {gpx}, {fit} und {geojson}.',
    developer: 'Du entwickelst eine Integration oder erstellst eigene Aktivitätsdateien? Die Entwicklerdokumentation enthält die Definition des Verve-Dateiformats und Beispiele.',
    link: 'Dokumentation zum Verve-Dateiformat',
    newTab: '(öffnet in einem neuen Tab)',
  },
  start: {
    introduction: 'Willkommen bei Verve Outdoors! Richte dein Profil ein, um Aktivitäten zu erfassen.',
    profile: '1. Profil einrichten',
    profileDescription: 'Lege in den Einstellungen deine Standard-Aktivitätstypen fest, um Dateien schneller hochzuladen.',
    upload: '2. Aktivitäten hochladen',
    uploadDescription: 'Über „Hinzufügen“ auf der Startseite kannst du GPX-Dateien von deiner Uhr oder deinem Smartphone hochladen.',
    goals: '3. Ziele festlegen',
    goalsDescription: 'Setze dir wöchentliche oder monatliche Distanzziele, um deinen Fortschritt zu verfolgen.',
  },
  about: {
    description: 'Ein selbst gehosteter Aktivitätstracker für Outdoor-Fans, die Wert auf Datenschutz legen und ihre Daten selbst verwalten wollen.',
    version: 'Version {value}',
  },
} satisfies typeof en;
