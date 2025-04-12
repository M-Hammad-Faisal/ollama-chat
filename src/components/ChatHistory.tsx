import React, {useMemo, useState} from 'react'; // Added useMemo, ReactNode
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import AddCommentIcon from '@mui/icons-material/AddComment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SearchIcon from '@mui/icons-material/Search';
import {Chat} from '../types';
import MenuIcon from "@mui/icons-material/Menu";

interface ChatHistoryProps {
    chats: Chat[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onCreateChat: () => void;
    onUpdateTitle: (id: string, title: string) => void;
    onDeleteChat: (id: string) => void;
    toggleDrawer: () => void;
    open: boolean;
    onClose: () => void;
    onOpen: () => void;
    isLoading: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = (
    {
        chats,
        activeChatId,
        onSelectChat,
        onCreateChat,
        onUpdateTitle,
        onDeleteChat,
        toggleDrawer,
        open,
        onClose,
        onOpen,
        isLoading,
    }
) => {
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState<string>('');
    const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [menuChatId, setMenuChatId] = useState<string | null>(null);

    const isMenuOpen = Boolean(menuAnchorEl);

    // --- Menu Handlers ---
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
        setMenuChatId(chatId);
    };
    // --- CORRECTED Signature for Menu onClose ---
    const handleMenuClose = (event?: {}, reason?: "backdropClick" | "escapeKeyDown") => {
        // event?.stopPropagation(); // Not needed/possible with {} event type
        setMenuAnchorEl(null);
        setMenuChatId(null);
    };
    const handleRenameClick = () => {
        if (menuChatId) {
            const chatToEdit = chats.find(c => c.id === menuChatId);
            if (chatToEdit) {
                setEditTitle(chatToEdit.title);
                setEditingChatId(menuChatId);
            }
        }
        handleMenuClose();
    };
    const handleDeleteClick = () => {
        if (menuChatId) {
            onDeleteChat(menuChatId);
        }
        handleMenuClose();
    };

    // --- Edit Handlers ---
    // Removed startEditing (now handled by handleRenameClick)
    const cancelEditing = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        setEditingChatId(null);
        setEditTitle('');
    };
    // --- CORRECTED saveTitle to not require event ---
    const saveTitle = (chatId: string) => {
        if (editTitle.trim() && chatId === editingChatId) {
            onUpdateTitle(chatId, editTitle.trim());
        }
        setEditingChatId(null);
        setEditTitle('');
    };
    const handleEditKeyPress = (e: React.KeyboardEvent, chatId: string) => {
        if (e.key === 'Enter') {
            saveTitle(chatId); /* Pass only ID */
        } else if (e.key === 'Escape') {
            cancelEditing(e);
        }
    };

    // Filter Chats
    const filteredChats = useMemo(() => {
        if (!searchTerm) return chats;
        return chats.filter(chat => chat.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [chats, searchTerm]);

    const drawerWidth = 250;

    return (
        <Drawer
            variant="persistent" open={open}
            sx={{
                width: open ? {sm: drawerWidth, xs: '100%'} : 0,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: {sm: drawerWidth, xs: '100%'},
                    boxSizing: 'border-box',
                    borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                    transition: (theme) => theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    overflowX: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                },
                transition: (theme) => theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
            }}
        >
            <Box sx={{p: 1.5, display: 'flex', flexShrink: 0, justifyContent: "space-between"}}>
                <Tooltip title="Toggle Chat History" placement="bottom">
                    <IconButton color="inherit" onClick={toggleDrawer} edge="start" sx={{mr: 0.5}}
                                aria-label="Toggle chat history"> <MenuIcon/> </IconButton>
                </Tooltip>
                <Tooltip title="New Chat" placement="bottom">
                    <IconButton color="inherit" onClick={() => {
                        toggleDrawer();
                        onCreateChat();
                    }} aria-label="New Chat" sx={{ml: 0.5, display: {xs: "block", sm: "none"}}}>
                        <AddCommentIcon/>
                    </IconButton>
                </Tooltip>
                <Tooltip title="New Chat" placement="bottom">
                    <IconButton color="inherit" onClick={onCreateChat} aria-label="New Chat"
                                sx={{ml: 0.5, display: {xs: "none", sm: "block"}}}>
                        <AddCommentIcon/>
                    </IconButton>
                </Tooltip>
            </Box>
            <Box sx={{px: 1.5, pb: 1, flexShrink: 0}}>
                <TextField fullWidth variant="outlined" size="small" placeholder="Search chats..." value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)} InputProps={{
                    startAdornment: (
                        <InputAdornment position="start"> <SearchIcon fontSize="small"/> </InputAdornment>),
                    sx: {borderRadius: 5}
                }}/>
            </Box>
            <Divider sx={{flexShrink: 0}}/>
            <Box sx={{flexGrow: 1, overflowY: 'auto'}}>
                <List sx={{p: 1}}>
                    {filteredChats.map((chat) => {
                        const isEditing = editingChatId === chat.id;
                        const isSelected = chat.id === activeChatId;
                        const isHovered = hoveredChatId === chat.id;
                        return (
                            <ListItem key={chat.id} disablePadding sx={{display: 'block', mb: 0.5}}
                                      onMouseEnter={() => setHoveredChatId(chat.id)}
                                      onMouseLeave={() => setHoveredChatId(null)}>
                                {isEditing ? (
                                    <Box sx={{display: 'flex', alignItems: 'center', px: 1, py: '2px'}}>
                                        <TextField value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                                                   onBlur={() => saveTitle(chat.id)} /* Pass only ID */
                                                   onKeyDown={(e) => handleEditKeyPress(e, chat.id)} autoFocus fullWidth
                                                   variant="standard" size="small" sx={{mr: 0.5}}
                                                   InputProps={{disableUnderline: true, sx: {fontSize: '0.875rem'}}}/>
                                        <IconButton size="small" onClick={() => saveTitle(chat.id)} /* Pass only ID */
                                                    aria-label="Save title"><CheckIcon fontSize="inherit"/></IconButton>
                                        <IconButton size="small" onClick={cancelEditing}
                                                    aria-label="Cancel edit"><CloseIcon
                                            fontSize="inherit"/></IconButton>
                                    </Box>
                                ) : (<>
                                        <ListItemButton selected={isSelected} onClick={() => {
                                            toggleDrawer();
                                            onSelectChat(chat.id);
                                        }}
                                                        sx={{
                                                            py: 1,
                                                            borderRadius: 1,
                                                            borderLeft: isSelected ? 3 : 0,
                                                            borderColor: 'primary.main',
                                                            pl: isSelected ? 1.5 - (3 / 8) : 1.5,
                                                            display: {sm: "none", xs: "flex"},
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                        }}>
                                            <ListItemText primary={<Typography variant="body2" noWrap
                                                                               title={chat.title}>{chat.title}</Typography>}
                                                          sx={{
                                                              mr: 1,
                                                              overflow: 'hidden',
                                                              whiteSpace: 'nowrap',
                                                              textOverflow: 'ellipsis'
                                                          }}/>
                                            <Box sx={{display: 'flex'}}>
                                                <IconButton edge="end" size="small" aria-label="Chat actions"
                                                            aria-controls={isMenuOpen && menuChatId === chat.id ? 'chat-actions-menu' : undefined}
                                                            aria-haspopup="true"
                                                            aria-expanded={isMenuOpen && menuChatId === chat.id ? 'true' : undefined}
                                                            onClick={(e) => handleMenuOpen(e, chat.id)} sx={{
                                                    visibility: (isHovered || (isMenuOpen && menuChatId === chat.id)) && !isLoading ? 'visible' : 'hidden',
                                                    p: 0.25
                                                }}>
                                                    <MoreHorizIcon sx={{fontSize: '1.1rem'}}/>
                                                </IconButton>
                                            </Box>
                                        </ListItemButton>
                                        <ListItemButton selected={isSelected} onClick={() => onSelectChat(chat.id)}
                                                        sx={{
                                                            py: 1,
                                                            borderRadius: 1,
                                                            borderLeft: isSelected ? 3 : 0,
                                                            borderColor: 'primary.main',
                                                            pl: isSelected ? 1.5 - (3 / 8) : 1.5,
                                                            display: {sm: "flex", xs: "none"},
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                        }}>
                                            <ListItemText primary={<Typography variant="body2" noWrap
                                                                               title={chat.title}>{chat.title}</Typography>}
                                                          sx={{
                                                              mr: 1,
                                                              overflow: 'hidden',
                                                              whiteSpace: 'nowrap',
                                                              textOverflow: 'ellipsis'
                                                          }}/>
                                            <Box sx={{display: 'flex'}}>
                                                <IconButton edge="end" size="small" aria-label="Chat actions"
                                                            aria-controls={isMenuOpen && menuChatId === chat.id ? 'chat-actions-menu' : undefined}
                                                            aria-haspopup="true"
                                                            aria-expanded={isMenuOpen && menuChatId === chat.id ? 'true' : undefined}
                                                            onClick={(e) => handleMenuOpen(e, chat.id)} sx={{
                                                    visibility: (isHovered || (isMenuOpen && menuChatId === chat.id)) && !isLoading ? 'visible' : 'hidden',
                                                    p: 0.25
                                                }}>
                                                    <MoreHorizIcon sx={{fontSize: '1.1rem'}}/>
                                                </IconButton>
                                            </Box>
                                        </ListItemButton>
                                    </>
                                )}
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
            {/* Action Menu Component */}
            <Menu
                id="chat-actions-menu"
                anchorEl={menuAnchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                MenuListProps={{'aria-labelledby': 'chat-actions-button', dense: true}}
                anchorOrigin={{vertical: 'bottom', horizontal: 'right',}}
                transformOrigin={{vertical: 'top', horizontal: 'right',}}
            >
                <MenuItem onClick={handleRenameClick} sx={{fontSize: '0.875rem'}}> <EditIcon
                    sx={{mr: 1, fontSize: '1rem'}}/> Rename </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{color: 'error.main', fontSize: '0.875rem'}}> <DeleteIcon
                    sx={{mr: 1, fontSize: '1rem'}}/> Delete </MenuItem>
            </Menu>
        </Drawer>
    );
};