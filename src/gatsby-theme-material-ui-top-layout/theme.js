import { red } from '@mui/material/colors';
import { adaptV4Theme } from '@mui/material/styles';
import { createTheme } from '@mui/material';

const theme = createTheme(adaptV4Theme({
  palette: {
    primary: {
      main: '#1b1b1b',
    },
    secondary: {
      main: '#ffab00',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#fff',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
    },
  },
}));

export default theme;
