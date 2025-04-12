import React, {CSSProperties, useEffect, useRef, useState} from 'react';
import {Alert, Box, IconButton, List, ListItem, Paper, Snackbar, Tooltip, Typography} from '@mui/material';
import {alpha, useTheme} from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {Chat} from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {prism, vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {CodeBlockElement, StyledTextarea} from '../styles';

type CodeComponentProps = {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    style?: CSSProperties;
    node?: any;
    [key: string]: any;
};


interface ChatWindowProps {
    activeChat: Chat;
    input: string;
    error: string;
    isLoading: boolean;
    isFetchingModels: boolean;
    onInputChange: (input: string) => void;
    onSendMessage: () => void;
    onClearError: () => void;
    onStopGenerating?: () => void;
    onRetry?: () => void;
    onEdit?: (turnIndex: number, currentContent: string) => void;
    isEditing?: boolean;
    displayedVersions: Record<string, number>;
    onShowVersion: (turnId: string, index: number) => void;
    onRegenerate?: (turnId: string, attemptIndex: number) => void;
    onCancelEdit?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = (
    {
        activeChat,
        input,
        error,
        isLoading,
        isFetchingModels,
        onInputChange,
        onSendMessage,
        onClearError,
        onStopGenerating,
        onRetry,
        onEdit,
        isEditing,
        displayedVersions,
        onShowVersion,
        onRegenerate,
        onCancelEdit
    }
) => {
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const scrollContainerRef = useRef<null | HTMLDivElement>(null);
    const theme = useTheme();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
    const lastScrollTopRef = useRef(0);

    // Snackbar Handlers
    const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };
    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    // Scroll Logic
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (!isAutoScrollEnabled) return;
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({behavior, block: 'end'});
        }, 50);
    };

    // Handle scroll events to toggle auto-scroll
    useEffect(() => {
        const element = scrollContainerRef.current;
        if (!element) return;

        const handleScroll = () => {
            const currentScrollTop = element.scrollTop;
            const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 2;

            if (isAtBottom) {
                setIsAutoScrollEnabled(true);
            } else if (currentScrollTop < lastScrollTopRef.current) {
                // User scrolled up
                setIsAutoScrollEnabled(false);
            }
            // Update last scroll position
            lastScrollTopRef.current = currentScrollTop;
        };

        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-scroll effect for new messages or streaming
    useEffect(() => {
        if (isAutoScrollEnabled) {
            scrollToBottom('smooth');
        }
    }, [activeChat?.turns, displayedVersions]);

    // Instant scroll on chat switch
    useEffect(() => {
        if (activeChat?.id) {
            setIsAutoScrollEnabled(true);
            scrollToBottom('auto');
        }
    }, [activeChat?.id]);

    // Send Handlers
    const handleSend = () => {
        onSendMessage();
    };
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading && !isFetchingModels && input.trim()) {
                handleSend();
            }
        }
    };

    // Cancel Edit Handler
    const handleCancelEdit = () => {
        onInputChange('');
        if (onCancelEdit) {
            onCancelEdit();
        }
    };

    // Markdown Components (unchanged)
    const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
        h1: ({children, ...props}) => (
            <Typography
                variant="h4"
                component="h1"
                sx={{mt: 2, mb: 1, fontSize: '2rem'}} // 32px at 16px root
                {...props}
            >
                {children}
            </Typography>
        ),
        h2: ({children, ...props}) => (
            <Typography
                variant="h5"
                component="h2"
                sx={{mt: 2, mb: 1, fontSize: '1.5rem'}} // 24px
                {...props}
            >
                {children}
            </Typography>
        ),
        h3: ({children, ...props}) => (
            <Typography
                variant="h6"
                component="h3"
                sx={{mt: 1.5, mb: 0.5, fontSize: '1.25rem'}} // 20px
                {...props}
            >
                {children}
            </Typography>
        ),
        code: (props: CodeComponentProps) => {
            const {inline, className, children, style, node, ...rest} = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match?.[1];
            let isBlock = false;
            if (!inline) {
                if (match || (typeof children === 'string' && children.includes('\n'))) {
                    isBlock = true;
                }
            }
            if (isBlock && typeof children === 'string') {
                const codeString = children.replace(/\n$/, '');
                const handleCopy = async () => {
                    if (!navigator.clipboard) {
                        showSnackbar('Clipboard API not available.', 'error');
                        return;
                    }
                    try {
                        await navigator.clipboard.writeText(codeString);
                        showSnackbar('Copied to clipboard!', 'success');
                    } catch (err) {
                        console.error('Failed to copy code:', err);
                        showSnackbar('Copy failed.', 'error');
                    }
                };

                const stripFontSize = (theme: typeof vscDarkPlus | typeof prism) => {
                    const newTheme = {...theme};
                    Object.keys(newTheme).forEach((key) => {
                        if (newTheme[key] && newTheme[key]!['fontSize']) {
                            delete newTheme[key]!['fontSize'];
                        }
                        if (newTheme[key] && newTheme[key]!['fontSize']) {
                            delete newTheme[key]!['fontSize'];
                        }
                    });
                    return newTheme;
                };

                const syntaxTheme = theme.palette.mode === 'dark' ? stripFontSize(vscDarkPlus) : stripFontSize(prism);

                const codeStyle = {
                    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                    margin: 0,
                    padding: 0,
                    fontSize: '0.875rem'
                };

                return (
                    <Box sx={{borderRadius: theme.shape.borderRadius, border: 1, borderColor: 'divider'}}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor:
                                    theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[300],
                                px: 2
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem'}} // 12px
                            >
                                {language || 'code'}
                            </Typography>
                            <IconButton onClick={handleCopy} size="small" sx={{color: 'text.secondary'}}
                                        aria-label="Copy code">
                                <ContentCopyIcon sx={{fontSize: '1rem'}}/>
                            </IconButton>
                        </Box>
                        <SyntaxHighlighter
                            {...rest}
                            style={syntaxTheme}
                            language={language || 'text'}
                            PreTag={CodeBlockElement}
                            wrapLongLines={true}
                            customStyle={codeStyle}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </Box>
                );
            } else if (typeof children === 'string') {
                return (
                    <Box
                        component="code"
                        className={className}
                        style={style}
                        {...rest}
                        sx={{
                            backgroundColor: (theme) =>
                                theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.common.white, 0.1)
                                    : alpha(theme.palette.common.black, 0.08),
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem', // 14px
                            wordBreak: 'break-word'
                        }}
                    >
                        {children}
                    </Box>
                );
            } else {
                return <code className={className} {...rest}>{children}</code>;
            }
        },
        li: ({children, ...props}) => (
            <Typography
                component="li"
                sx={{display: 'list-item', mt: 0.5, ml: 2, fontSize: '1rem'}} // 16px
                {...props}
            >
                {children}
            </Typography>
        ),
        table: ({children, ...props}) => (
            <Box
                component="table"
                sx={{
                    width: 'auto',
                    maxWidth: '100%',
                    borderCollapse: 'collapse',
                    my: 1.5,
                    '& th, & td': {border: 1, borderColor: 'divider', p: 1}
                }}
                {...props}
            >
                {children}
            </Box>
        ),
        thead: ({children, ...props}) => (
            <Box
                component="thead"
                sx={{backgroundColor: theme.palette.action.hover, '& th': {fontWeight: 'bold'}}}
                {...props}
            >
                {children}
            </Box>
        ),
        tbody: ({children, ...props}) => <Box component="tbody" {...props}>{children}</Box>,
        tr: ({children, ...props}) => <Box component="tr" {...props}>{children}</Box>,
        th: ({children, ...props}) => (
            <Box component="th" sx={{textAlign: 'left', fontSize: '1rem'}} {...props}>
                {children}
            </Box>
        ),
        td: ({children, ...props}) => (
            <Box component="td" sx={{textAlign: 'left', fontSize: '1rem'}} {...props}>
                {children}
            </Box>
        ),
        blockquote: ({children, ...props}) => (
            <Box
                component="blockquote"
                sx={{
                    my: 1,
                    pl: 2,
                    borderLeft: 4,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    '& > p': {my: 0.5, fontSize: '1rem'}
                }}
                {...props}
            >
                {children}
            </Box>
        ),
        a: ({children, ...props}) => (
            <Typography
                component="a"
                color="primary"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
                sx={{textDecoration: 'underline', '&:hover': {textDecoration: 'none'}, fontSize: '1rem'}}
            >
                {children}
            </Typography>
        )
    };

    // Determine if Retry button should be shown
    const lastTurn = activeChat?.turns?.[activeChat.turns.length - 1];
    const lastTurnVersionIndex = lastTurn ? (displayedVersions[lastTurn.turnId] ?? lastTurn.responses.length - 1) : -1;
    const lastDisplayedResponseAttempt = lastTurn && lastTurnVersionIndex >= 0 ? lastTurn.responses[lastTurnVersionIndex] : undefined;
    const showRetry = lastDisplayedResponseAttempt?.assistantMessage?.role === 'assistant' && lastDisplayedResponseAttempt?.assistantMessage?.isError === true && !!onRetry;

    // JSX Rendering
    return (
        <Box sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: "center",
            height: '80vh',
            width: "100%",
            overflow: 'hidden',
            position: 'relative',
        }}>
            {error && (
                <Alert severity="error" sx={{m: 1, mb: 0, flexShrink: 0, borderRadius: 1}} onClose={onClearError}>
                    {error}
                </Alert>
            )}

            <Box
                ref={scrollContainerRef}
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    width: "100%",
                    marginBottom: {lg: "5%", md: "8%", sm: "10%"},
                    alignItems: 'center'
                }}
            >
                {activeChat.turns.length > 0 ? (
                    <List sx={{p: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center"}}>
                        {activeChat.turns.map((turn, turnIndex) => {
                            const totalVersions = turn.responses.length;
                            const currentVersionIndex = displayedVersions[turn.turnId] ?? totalVersions - 1;
                            const safeVersionIndex = Math.max(0, Math.min(currentVersionIndex, totalVersions - 1));
                            const responseAttempt = turn.responses[safeVersionIndex];
                            if (!responseAttempt) {
                                return null;
                            }

                            const turnKey = `${turn.turnId}-${safeVersionIndex}`;
                            const userPromptKey = `${turnKey}-prompt`;
                            const assistantMessageKey = responseAttempt.assistantMessage.id || `${turnKey}-assist`;

                            const handleCopyResponse = async () => {
                                if (!navigator.clipboard) {
                                    showSnackbar('Clipboard API not available.', 'error');
                                    return;
                                }
                                try {
                                    await navigator.clipboard.writeText(responseAttempt.assistantMessage.content || '');
                                    showSnackbar('Copied to clipboard!', 'success');
                                } catch (err) {
                                    console.error('Failed to copy response:', err);
                                    showSnackbar('Copy failed.', 'error');
                                }
                            };
                            const handleEdit = () => {
                                if (onEdit) {
                                    onEdit(turnIndex, responseAttempt.promptUsed);
                                }
                            };
                            const handlePrevVersion = () => onShowVersion(turn.turnId, safeVersionIndex - 1);
                            const handleNextVersion = () => onShowVersion(turn.turnId, safeVersionIndex + 1);
                            const handleRegenerateClick = () => {
                                if (onRegenerate) {
                                    onRegenerate(turn.turnId, safeVersionIndex);
                                }
                            };

                            return (
                                <Box sx={{width: {lg: "50%", md: "70%", sm: "100%"}}} key={turn.turnId}>
                                    <ListItem key={userPromptKey} sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                    }}>
                                        <Paper elevation={1} sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: 'primary.main',
                                            color: 'primary.contrastText',
                                            maxWidth: '85%',
                                            overflowWrap: 'break-word',
                                            position: 'relative'
                                        }}>
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                zIndex: 1,
                                                display: 'flex',
                                                gap: 0.5
                                            }}>
                                                {!isLoading && onEdit && (
                                                    <Tooltip title="Edit & Regenerate">
                                                        <IconButton
                                                            size="small"
                                                            onClick={handleEdit}
                                                            sx={{
                                                                p: 0.5,
                                                                color: alpha(theme.palette.primary.contrastText, 0.7),
                                                                '&:hover': {bgcolor: alpha(theme.palette.common.white, 0.1)}
                                                            }}
                                                            aria-label="Edit prompt"
                                                        >
                                                            <EditIcon sx={{fontSize: '1rem'}}/>
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            <Box component="div" sx={{pr: 5}}>
                                                <Typography sx={{whiteSpace: 'pre-wrap'}}>
                                                    {responseAttempt.promptUsed}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    </ListItem>

                                    <ListItem key={assistantMessageKey} sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        px: 0,
                                        py: 0.5,
                                    }}>
                                        <Paper elevation={0} sx={{
                                            p: 1.5,
                                            width: '100%',
                                            borderRadius: 2,
                                            bgcolor: 'background.default',
                                            color: 'text.primary',
                                            overflowWrap: 'break-word',
                                            position: 'relative'
                                        }}>
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                zIndex: 1,
                                                display: 'flex',
                                                gap: 0.5
                                            }}>
                                                {!responseAttempt.assistantMessage.isError && (
                                                    <Tooltip title="Copy Response">
                                                        <IconButton
                                                            size="small"
                                                            onClick={handleCopyResponse}
                                                            sx={{
                                                                color: 'text.secondary',
                                                                bgcolor: alpha(theme.palette.background.paper, 0.7),
                                                                '&:hover': {bgcolor: alpha(theme.palette.background.paper, 0.9)}
                                                            }}
                                                            aria-label="Copy response"
                                                        >
                                                            <ContentCopyIcon sx={{fontSize: '0.875rem'}}/>
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            <Box component="div">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={markdownComponents}
                                                    children={responseAttempt.assistantMessage.content || ''}
                                                />
                                                {responseAttempt.assistantMessage.isError && (
                                                    <Typography variant="caption" color="error"
                                                                sx={{mt: 1, display: 'block'}}>
                                                        {responseAttempt.assistantMessage.content || 'An error occurred.'}
                                                    </Typography>
                                                )}
                                            </Box>
                                            {(totalVersions > 1 || onRegenerate) && (
                                                <Box sx={{
                                                    position: 'absolute',
                                                    bottom: 4,
                                                    left: 6,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    mt: 1,
                                                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                                                    borderRadius: 1,
                                                    padding: '0px 4px'
                                                }}>
                                                    {totalVersions > 1 && (
                                                        <>
                                                            <Tooltip title="Previous Version">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={handlePrevVersion}
                                                                    disabled={safeVersionIndex === 0}
                                                                    sx={{color: 'text.secondary', p: 0}}
                                                                    aria-label="Previous version"
                                                                >
                                                                    <NavigateBeforeIcon fontSize="small"/>
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Typography variant="caption" sx={{
                                                                color: 'text.secondary',
                                                                mx: 0.5,
                                                                cursor: 'default'
                                                            }}>
                                                                {safeVersionIndex + 1}/{totalVersions}
                                                            </Typography>
                                                            <Tooltip title="Next Version">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={handleNextVersion}
                                                                    disabled={safeVersionIndex === totalVersions - 1}
                                                                    sx={{color: 'text.secondary', p: 0}}
                                                                    aria-label="Next version"
                                                                >
                                                                    <NavigateNextIcon fontSize="small"/>
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    {!isLoading && onRegenerate && (
                                                        <Tooltip title="Regenerate Response">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={handleRegenerateClick}
                                                                    disabled={isLoading}
                                                                    sx={{
                                                                        color: 'text.secondary',
                                                                        p: 0.25,
                                                                        ml: totalVersions > 1 ? 0.5 : 0
                                                                    }}
                                                                    aria-label="Regenerate response"
                                                                >
                                                                    <ReplayIcon sx={{fontSize: '0.875rem'}}/>
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            )}
                                        </Paper>
                                    </ListItem>
                                </Box>
                            );
                        })}
                        <div ref={messagesEndRef} style={{height: '1px'}}/>
                    </List>
                ) : null}
            </Box>

            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: {lg: "50%", md: "70%", sm: "100%"},
                p: 1,
                borderColor: 'divider',
                boxShadow: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'background.paper',
                borderRadius: 2
            }}>
                {isEditing && (
                    <Tooltip title="Cancel Edit">
                        <IconButton onClick={handleCancelEdit} size="small" sx={{mr: 1, color: 'text.secondary'}}>
                            <CancelIcon/>
                        </IconButton>
                    </Tooltip>
                )}
                <StyledTextarea
                    ref={inputRef}
                    minRows={1}
                    maxRows={8}
                    placeholder={isEditing ? "Enter edited message..." : "Send a message..."}
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading || isFetchingModels}
                    style={{flexGrow: 1}}
                />
                {showRetry ? (
                    <Tooltip title="Retry Last Message">
                        <span>
                            <IconButton
                                color="warning"
                                onClick={onRetry}
                                disabled={isLoading || isFetchingModels}
                                sx={{height: '40px', width: '40px', '&:hover': {bgcolor: 'action.hover'}}}
                                aria-label="Retry"
                            >
                                <ReplayIcon/>
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : isLoading ? (
                    <Tooltip title="Stop Generating">
                        <span>
                            <IconButton
                                color="secondary"
                                onClick={onStopGenerating}
                                disabled={!onStopGenerating}
                                sx={{height: '40px', width: '40px'}}
                            >
                                <StopCircleIcon/>
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : (
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading || isFetchingModels}
                        sx={{height: '40px', width: '40px', '&:hover': {bgcolor: 'action.hover'}}}
                    >
                        <SendIcon/>
                    </IconButton>
                )}
            </Box>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} variant="filled" sx={{width: '100%'}}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};