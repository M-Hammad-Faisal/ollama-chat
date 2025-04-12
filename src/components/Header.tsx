import React from 'react';
import {
    AppBar,
    Avatar,
    Box,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    SelectChangeEvent,
    Toolbar,
    Tooltip,
    Typography
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import AddCommentIcon from '@mui/icons-material/AddComment';
import {Link} from 'react-router-dom';
import {alpha, styled, Theme} from '@mui/material/styles';

// Definition for MinimalSelect
const MinimalSelect = styled(Select)(({theme}) => ({
    minWidth: 120,
    maxWidth: 250,
    marginLeft: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    '& .MuiOutlinedInput-notchedOutline': {border: 'none'},
    '& .MuiSelect-select': {
        paddingTop: theme.spacing(0.5),
        paddingBottom: theme.spacing(0.5),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(4),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: theme.palette.primary.contrastText,
        backgroundColor: alpha(theme.palette.common.white, 0.1),
        borderRadius: theme.shape.borderRadius,
        '&:hover': {backgroundColor: alpha(theme.palette.common.white, 0.15),},
        '&.Mui-focused': {backgroundColor: alpha(theme.palette.common.white, 0.2),},
    },
    '& .MuiSelect-icon': {color: theme.palette.primary.contrastText, right: 8,},
    fontSize: '0.875rem',
    transition: theme.transitions.create(['background-color']),
    '&.Mui-disabled': {
        backgroundColor: 'transparent',
        opacity: 0.6,
        color: alpha(theme.palette.primary.contrastText, 0.6),
        '& .MuiSelect-icon': {color: alpha(theme.palette.primary.contrastText, 0.6)},
        border: 'none',
    },
    '&.MuiInput-underline:before': {borderBottom: 'none',},
    '&.MuiInput-underline:hover:not(.Mui-disabled):before': {borderBottom: 'none',},
    '&.MuiInput-underline:after': {borderBottom: 'none',},
}));

interface HeaderProps {
    darkMode: boolean;
    toggleDarkMode: () => void;
    toggleDrawer: () => void;
    onCreateChat: () => void;
    drawerOpen: boolean;
    model: string;
    availableModels: string[];
    isFetchingModels: boolean;
    modelError: string;
    onModelChange: (event: SelectChangeEvent<unknown>) => void;
}

export const Header: React.FC<HeaderProps> = ({
                                                  darkMode, toggleDarkMode, toggleDrawer, onCreateChat, drawerOpen,
                                                  model, availableModels, isFetchingModels, modelError, onModelChange
                                              }) => (
        <AppBar position="sticky">
            <Toolbar sx={{justifyContent: 'space-between'}}>
                {/* Left Section */}
                <Box sx={{display: 'flex', alignItems: 'center'}}>
                    {!drawerOpen && (<>
                            <Tooltip title="Toggle Chat History" placement="bottom">
                                <IconButton color="inherit" onClick={toggleDrawer} edge="start" sx={{mr: 0.5}}
                                            aria-label="Toggle chat history"> <MenuIcon/> </IconButton>
                            </Tooltip>
                            <Tooltip title="New Chat" placement="bottom">
                                <IconButton color="inherit" onClick={onCreateChat} aria-label="New Chat" sx={{ml: 0.5}}>
                                    <AddCommentIcon/>
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                </Box>

                {/* Logo & Title Link */}
                <Box sx={(theme: Theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    flexGrow: {xs: 1, sm: 0},
                    justifyContent: {xs: 'center', sm: 'center'},
                    marginRight: {xs: 0, sm: 'auto'},
                    marginLeft: !drawerOpen ? {xs: 0, sm: theme.spacing(1)} : 0
                })}>
                    <Link to="/" style={{color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center'}}>
                        <Avatar variant="rounded" sx={(theme) => ({
                            width: 30,
                            height: 30,
                            mr: 1,
                            bgcolor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
                            color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
                            fontSize: '1rem',
                            fontWeight: 'bold',
                        })}> O </Avatar>
                        <Typography variant="h6" component="div" sx={{display: {xs: 'none', sm: 'block'}}}> Ollama
                            Chat </Typography>
                    </Link>
                </Box>

                {/* Right Side Controls */}
                <Box sx={{display: 'flex', alignItems: 'center', gap: {xs: 0.5, sm: 1}}}>
                    {/* Model Selector */}
                    <FormControl variant="standard"
                                 sx={{display: {xs: 'none', sm: 'block'}, minWidth: 150, maxWidth: "100%"}}>
                        <MinimalSelect value={model || ''} onChange={onModelChange}
                                       disabled={isFetchingModels || !availableModels.length}
                                       IconComponent={ArrowDropDownIcon} displayEmpty sx={{bgcolor: 'primary.main'}}
                                       inputProps={{'aria-label': 'Select model'}} disableUnderline>
                            {isFetchingModels && <MenuItem value="" disabled sx={{
                                color: 'text.secondary',
                                bgcolor: 'background.paper'
                            }}>Loading...</MenuItem>}
                            {!isFetchingModels && modelError && !availableModels.length && <MenuItem value="" disabled sx={{
                                color: 'text.secondary',
                                bgcolor: 'background.paper'
                            }}>Error</MenuItem>}
                            {!isFetchingModels && !modelError && !availableModels.length &&
                                <MenuItem value="" disabled sx={{color: 'text.secondary', bgcolor: 'background.paper'}}>No
                                    models</MenuItem>}
                            {availableModels.map((m) => (<MenuItem key={m} value={m} sx={{
                                color: 'text.primary',
                                bgcolor: 'background.paper'
                            }}>{m}</MenuItem>))}
                        </MinimalSelect>
                    </FormControl>
                    {/* Dark Mode Toggle */}
                    <IconButton color="inherit" onClick={toggleDarkMode} aria-label="Toggle dark mode"> {darkMode ?
                        <Brightness7Icon/> : <Brightness4Icon/>} </IconButton>
                </Box>
            </Toolbar>
            {/* Model Selector for smaller screens */}
            <Box
                sx={{display: {xs: 'flex', sm: 'none'}, justifyContent: 'center', pb: 1, pt: 0.5}}>
                <FormControl variant="standard" sx={{minWidth: 150, maxWidth: '100%'}}>
                    <MinimalSelect value={model || ''} onChange={onModelChange} sx={{bgcolor: 'primary.main'}}
                                   disabled={isFetchingModels || !availableModels.length} IconComponent={ArrowDropDownIcon}
                                   displayEmpty inputProps={{'aria-label': 'Select model'}} size="small" disableUnderline>
                        {isFetchingModels && <MenuItem value="" disabled sx={{
                            color: 'text.secondary',
                            bgcolor: 'background.paper'
                        }}>Loading...</MenuItem>}
                        {!isFetchingModels && modelError && !availableModels.length && <MenuItem value="" disabled sx={{
                            color: 'text.secondary',
                            bgcolor: 'background.paper'
                        }}>Error</MenuItem>}
                        {!isFetchingModels && !modelError && !availableModels.length &&
                            <MenuItem value="" disabled sx={{color: 'text.secondary', bgcolor: 'background.paper'}}>No
                                models</MenuItem>}
                        {availableModels.map((m) => (<MenuItem key={m} value={m} sx={{
                            color: 'text.primary',
                            bgcolor: 'background.paper'
                        }}>{m}</MenuItem>))}
                    </MinimalSelect>
                    {!isFetchingModels && modelError && !availableModels.length && (<Typography variant="caption" sx={{
                        mt: 0.5,
                        textAlign: 'center',
                        color: 'primary.contrastText'
                    }}> {modelError} </Typography>)}
                </FormControl>
            </Box>
        </AppBar>
    )
;