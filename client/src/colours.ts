export const colors = {
  light: {
    background: '#FEFEFE',
    accent: '#C68BE1',
    yellow: '#FDFBD4',
    green: '#C5FFD8',
    pink: '#FFBDC2',

    hoverPurple: '#954CB7',
    hoverYellow: '#EAE7AB',
    hoverGreen: '#90DEA9',
    hoverGrey: '#B6B6B6',
    hoverPink: '#E18B91',

    textPrimary: '#1a1a1a',
    textSecondary: '#6b6b6b',
    textMuted: '#9a9a9a',

    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.15)',
  },

  dark: {
    background: '#101211',
    surface: '#29281E',
    rose: '#48252F',
    card: '#1e1d15',

    hoverSurface: '#383731',
    hoverBeige: '#E4D8C8',
    hoverTan: '#8C8578',
    hoverRose: '#51353D',
    hoverDark: '#212121',

    beige: '#E7D4BB',
    tan: '#857861',
    mutedRose: '#48252F',
    mutedDark: '#29281E',

    textPrimary: '#E7D4BB',
    textSecondary: '#B09A7A',
    textMuted: '#8C7B6A',

    border: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.12)',
  },
  
  semantic: {
    income: '#1D9E75',
    incomeLight: '#E1F5EE',
    incomeDark: '#085041',

    expense: '#D85A30',
    expenseLight: '#FAECE7',
    expenseDark: '#712B13',

    warning: '#EF9F27',
    warningLight: '#FAEEDA',
    warningDark: '#854F0B',

    purple: '#534AB7',
    purpleLight: '#EEEDFE',
    purpleDark: '#3C3489',

    positive: '#0F6E56',
    negative: '#C0392B',
  },

  categories: {
    food: '#534AB7',
    rent: '#1D9E75',
    transport: '#D85A30',
    entertainment: '#EF9F27',
    health: '#C68BE1',
    other: '#B6B6B6',
  },
} as const;

export type Colors = typeof colors;