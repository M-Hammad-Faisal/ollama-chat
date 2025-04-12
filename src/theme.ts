import {alpha, createTheme} from '@mui/material/styles';

const getTheme = (mode: 'light' | 'dark') =>
    createTheme({
        palette: {
            mode: mode,
            primary: {
                main: mode === 'dark' ? '#90A4AE' : '#546E7A',
                light: mode === 'dark' ? '#B0BEC5' : '#819CA9',
                dark: mode === 'dark' ? '#607D8B' : '#37474F',
                contrastText: mode === 'dark' ? '#000000' : '#FFFFFF'
            },
            secondary: {
                main: mode === 'dark' ? '#EF9A9A' : '#f44336',
                contrastText: mode === 'dark' ? '#000000' : '#FFFFFF'
            },
            background: {
                default: mode === 'dark' ? '#212121' : '#ECEFF1',
                paper: mode === 'dark' ? '#303030' : '#FFFFFF'
            },
            text: {
                primary: mode === 'dark' ? '#E0E0E0' : '#263238',
                secondary: mode === 'dark' ? '#B0BEC5' : '#546E7A'
            },
            error: {main: mode === 'dark' ? '#EF9A9A' : '#D32F2F'},
            warning: {main: mode === 'dark' ? '#FFCC80' : '#FFA000'},
            common: {black: '#000', white: '#fff'},
            action: {
                hover: alpha(mode === 'dark' ? '#fff' : '#000', 0.08),
                selected: alpha(mode === 'dark' ? '#fff' : '#000', 0.12),
                disabledBackground: alpha(mode === 'dark' ? '#fff' : '#000', 0.12),
                disabled: alpha(mode === 'dark' ? '#fff' : '#000', 0.38)
            },
            grey: {
                100: '#F5F5F5',
                200: '#EEEEEE',
                300: '#E0E0E0',
                700: '#616161',
                800: '#424242',
                900: '#212121'
            }
        },
        typography: {
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            htmlFontSize: 16, // Locks 1rem = 16px
            fontSize: 14, // Default typography size (0.875rem = 14px)
            body1: {fontSize: '1rem'}, // 16px
            body2: {fontSize: '0.875rem'}, // 14px
            h1: {fontSize: '2rem'}, // 32px
            h2: {fontSize: '1.5rem'}, // 24px
            h3: {fontSize: '1.25rem'}, // 20px
            caption: {fontSize: '0.75rem'} // 12px
        }
    });

export default getTheme;