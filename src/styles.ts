import {styled} from '@mui/material/styles';
import {TextareaAutosize} from '@mui/material';

// StyledTextarea (Used in App and ChatWindow)
export const StyledTextarea = styled(TextareaAutosize)(({ theme }) => ({
    width: '100%',
    padding: theme.spacing(1.25),
    borderRadius: '24px',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    resize: 'none',
    fontFamily: theme.typography.fontFamily, // Use theme font family
    fontSize: '1rem', // Already set, keep it
    lineHeight: 1.5,
    '&:focus': { outline: `2px solid ${theme.palette.primary.main}`, borderColor: 'transparent' },
    '&::placeholder': { color: theme.palette.text.secondary, opacity: 0.8 },
    '&:disabled': { backgroundColor: theme.palette.action.disabledBackground, cursor: 'not-allowed' }
}));

// CodeBlockElement (Used in ChatWindow)
export const CodeBlockElement = styled('pre')(({ theme }) => ({
    padding: theme.spacing(1.5),
    margin: 0,
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    whiteSpace: 'pre',
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100]
}));