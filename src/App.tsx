import React, {CSSProperties, useCallback, useEffect, useRef, useState} from 'react';
import {BrowserRouter, Navigate, Route, Routes, useNavigate, useParams} from 'react-router-dom';
import {Box, CssBaseline, IconButton, Paper, SelectChangeEvent, ThemeProvider, Typography} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import {Chat, Message, ResponseAttempt, Turn} from './types';
import {Header} from './components/Header';
import {ChatHistory} from './components/ChatHistory';
import {ChatWindow} from './components/ChatWindow';
import {fetchModels, generateTitle, streamChatResponse} from './services/ollamaAPI';
import getTheme from './theme';
import './App.css';
import {StyledTextarea} from "./styles";

interface EditingTurnInfo {
    chatId: string;
    turnIndex: number;
}



// --- Main App Component ---
const AppCore: React.FC = () => {
    // State definitions
    const [chats, setChats] = useState<Chat[]>(() => {
        const savedChats = localStorage.getItem('chats');
        try {
            if (savedChats) {
                const parsed = JSON.parse(savedChats);
                if (parsed.length > 0 && !parsed[0].turns) {
                    localStorage.removeItem('chats');
                    return [];
                }
                return parsed;
            }
        } catch (e) {
            console.error("Failed parse chats", e);
            localStorage.removeItem('chats');
        }
        return [];
    });
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [input, setInput] = useState<string>('');
    const [model, setModel] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const [modelError, setModelError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const savedTheme = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedTheme ? JSON.parse(savedTheme) : prefersDark;
    });
    const [drawerOpen, setDrawerOpen] = useState<boolean>(() => {
        const saved = localStorage.getItem('drawerOpen');
        return saved ? JSON.parse(saved) : true;
    });
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const currentStreamRef = useRef<{
        chatId: string;
        turnId: string;
        attemptId: string;
        tempBotMessageId: string
    } | null>(null);
    const [editingTurnInfo, setEditingTurnInfo] = useState<EditingTurnInfo | null>(null);
    const [displayedVersions, setDisplayedVersions] = useState<Record<string, number>>({});

    const {chatId: chatIdFromUrl} = useParams<{ chatId?: string }>();
    const navigate = useNavigate();

    // Toggle Dark Mode
    const toggleDarkModeHandler = () => {
        setDarkMode(prev => !prev);
    };
    // New Chat navigation
    const handleGoToHomeAndReset = useCallback(() => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            if (isLoading) setIsLoading(false);
        }
        if (activeChatId !== null) {
            setActiveChatId(null);
        }
        setError('');
        setModelError('');
        setEditingTurnInfo(null);
        navigate('/');
    }, [navigate, abortController, isLoading, activeChatId]);

    // Effects
    useEffect(() => {
        let isMounted = true;
        const loadModels = async () => {
            setIsFetchingModels(true);
            setModelError('');
            try {
                const models = await fetchModels();
                if (!isMounted) return;
                setAvailableModels(models);
                const savedModel = localStorage.getItem('selectedModel');
                const defaultModel = models[0] || '';
                let modelToSet = '';
                if (savedModel && models.includes(savedModel)) {
                    modelToSet = savedModel;
                } else {
                    modelToSet = defaultModel;
                }
                setModel(modelToSet);
            } catch (err) {
                if (!isMounted) return;
                console.error("Fetch models err:", err);
                setModelError((err as Error).message || 'Could not connect.');
                setAvailableModels([]);
                setModel('');
            } finally {
                if (isMounted) {
                    setIsFetchingModels(false);
                }
            }
        };
        loadModels();
        return () => {
            isMounted = false;
        }; /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, []);
    useEffect(() => {
        localStorage.setItem('chats', JSON.stringify(chats));
    }, [chats]);
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);
    useEffect(() => {
        if (model && availableModels.includes(model)) {
            localStorage.setItem('selectedModel', model);
        }
    }, [model, availableModels]);
    useEffect(() => {
        localStorage.setItem('drawerOpen', JSON.stringify(drawerOpen));
    }, [drawerOpen]);
    useEffect(() => {
        if (activeChatId && !chats.some(chat => chat.id === activeChatId)) {
            handleGoToHomeAndReset();
        }
    }, [chats, activeChatId, handleGoToHomeAndReset]);
    useEffect(() => {
        const safeAbort = (reason: string) => {
            if (abortController) {
                console.log(`Aborting stream: ${reason}`);
                abortController.abort();
                setAbortController(null);
                if (isLoading) setIsLoading(false);
                const streamInfo = currentStreamRef.current;
                if (streamInfo) {
                    setChats(prev => prev.map(chat => {
                        if (chat.id === streamInfo.chatId) {
                            const turnIndex = chat.turns.findIndex(t => t.turnId === streamInfo.turnId);
                            if (turnIndex !== -1) {
                                const attemptIndex = chat.turns[turnIndex].responses.findIndex(r => r.attemptId === streamInfo.attemptId);
                                if (attemptIndex !== -1) {
                                    const finalMessages = chat.turns[turnIndex].responses[attemptIndex].assistantMessage.content?.trim() ? chat.turns[turnIndex].responses.map((r, i) => i === attemptIndex ? {
                                        ...r,
                                        assistantMessage: {...r.assistantMessage, id: undefined}
                                    } : r) : chat.turns[turnIndex].responses.slice(0, attemptIndex);
                                    const newTurns = [...chat.turns];
                                    newTurns[turnIndex] = {...newTurns[turnIndex], responses: finalMessages};
                                    return {...chat, turns: newTurns};
                                }
                            }
                        }
                        return chat;
                    }));
                    currentStreamRef.current = null;
                }
            }
        };
        if (chatIdFromUrl) {
            const chatExists = chats.some(chat => chat.id === chatIdFromUrl);
            if (chatExists) {
                if (activeChatId !== chatIdFromUrl) {
                    safeAbort(`Switching to chat ${chatIdFromUrl} from ${activeChatId}`);
                    setEditingTurnInfo(null);
                    setActiveChatId(chatIdFromUrl);
                }
            } else {
                console.warn(`Chat ID ${chatIdFromUrl} not found.`);
                if (activeChatId !== null) {
                    safeAbort(`Navigating away from ${activeChatId} to invalid URL`);
                    setActiveChatId(null);
                    setEditingTurnInfo(null);
                }
                navigate('/', {replace: true});
            }
        } else {
            if (activeChatId !== null) {
                safeAbort(`Navigating away from ${activeChatId} to root`);
                setActiveChatId(null);
                setEditingTurnInfo(null);
            }
        } /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [chatIdFromUrl, abortController, navigate]);

    // Callbacks & Handlers
    const createNewChatState = useCallback((): Chat | null => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            if (isLoading) setIsLoading(false);
        }
        setError('');
        setModelError('');
        const newChatId = Date.now().toString();
        let maxNum = 0;
        chats.forEach(chat => {
            const match = chat.title.match(/^Chat (\d+)$/);
            if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
        });
        const newChat: Chat = {id: newChatId, title: `Chat ${maxNum + 1}`, turns: [],};
        setChats((prev) => [...prev, newChat]);
        return newChat;
    }, [chats, abortController, isLoading]);

    const selectChat = useCallback((id: string) => {
        if (id !== activeChatId) {
            setError('');
            setModelError('');
            setEditingTurnInfo(null);
            navigate(`/chat/${id}`);
        }
    }, [activeChatId, navigate]);

    const updateChatTitle = useCallback((id: string, title: string) => {
        setChats((prev) => prev.map((chat) => (chat.id === id ? {
            ...chat,
            title: title.trim() || `Chat ${id}`
        } : chat)));
    }, []);

    const deleteChat = (id: string) => {
        if (id === activeChatId && abortController) {
            abortController.abort();
            setAbortController(null);
            if (isLoading) setIsLoading(false);
        }
        const remainingChats = chats.filter((chat) => chat.id !== id);
        setChats(remainingChats);
    };

    const stopGeneration = useCallback(() => {
        if (abortController) {
            abortController.abort();
        }
    }, [abortController]);

    const handleCancelEdit = useCallback(() => {
        setEditingTurnInfo(null);
        setInput('');
    }, []);

    const generateTitleAndUpdateState = useCallback(async (chatId: string, promptUsed: string, finalContent: string) => {
        const chat = chats.find(c => c.id === chatId);
        const defaultTitlePattern = /^Chat \d+$/;
        if (chat && defaultTitlePattern.test(chat.title) && model) {
            try {
                const titleModel = availableModels.find(m => m.includes("phi") || m.includes("gemma:2b")) || model;
                const generatedTitle = await generateTitle(titleModel, promptUsed, finalContent);
                if (generatedTitle && generatedTitle !== "Chat") {
                    updateChatTitle(chatId, generatedTitle);
                }
            } catch (titleError) {
                console.error("Failed to generate title:", titleError);
            }
        }
    }, [chats, model, availableModels, updateChatTitle]);

    const streamResponseInternal = useCallback(async (targetChatId: string, targetTurnId: string, targetAttemptId: string, contextMessages: Message[]) => {
        if (!model) {
            setError("No model selected.");
            setIsLoading(false);
            return;
        }
        if (isLoading) {
            return;
        }
        if (abortController) {
            abortController.abort();
        }
        setError('');
        setModelError('');
        setIsLoading(true);
        const newAbortController = new AbortController();
        setAbortController(newAbortController);
        const tempBotMessageId = `bot-${Date.now()}`;
        currentStreamRef.current = {
            chatId: targetChatId,
            turnId: targetTurnId,
            attemptId: targetAttemptId,
            tempBotMessageId
        };
        setChats((prev) => prev.map((chat) => {
            if (chat.id === targetChatId) {
                const turnIndex = chat.turns.findIndex(t => t.turnId === targetTurnId);
                if (turnIndex !== -1) {
                    const attemptIndex = chat.turns[turnIndex].responses.findIndex(r => r.attemptId === targetAttemptId);
                    if (attemptIndex !== -1) {
                        const newTurns = [...chat.turns];
                        const newResponses = [...newTurns[turnIndex].responses];
                        newResponses[attemptIndex] = {
                            ...newResponses[attemptIndex],
                            assistantMessage: {role: 'assistant', content: '', id: tempBotMessageId}
                        };
                        newTurns[turnIndex] = {...newTurns[turnIndex], responses: newResponses};
                        return {...chat, turns: newTurns};
                    }
                }
            }
            return chat;
        }));
        let accumulatedBotContent = '';
        const handleData = (chunk: string) => {
            accumulatedBotContent += chunk;
            const streamInfo = currentStreamRef.current;
            if (!streamInfo) return;
            setChats((prev) => prev.map((chat) => {
                if (chat.id === streamInfo.chatId) {
                    const turnIndex = chat.turns.findIndex(t => t.turnId === streamInfo.turnId);
                    if (turnIndex !== -1) {
                        const attemptIndex = chat.turns[turnIndex].responses.findIndex(r => r.attemptId === streamInfo.attemptId);
                        if (attemptIndex !== -1 && chat.turns[turnIndex].responses[attemptIndex].assistantMessage.id === streamInfo.tempBotMessageId) {
                            const newTurns = [...chat.turns];
                            const newResponses = [...newTurns[turnIndex].responses];
                            newResponses[attemptIndex] = {
                                ...newResponses[attemptIndex],
                                assistantMessage: {
                                    ...newResponses[attemptIndex].assistantMessage,
                                    content: accumulatedBotContent
                                }
                            };
                            newTurns[turnIndex] = {...newTurns[turnIndex], responses: newResponses};
                            return {...chat, turns: newTurns};
                        }
                    }
                }
                return chat;
            }));
        };
        const handleError = (error: Error) => {
            const isAbort = error.name === 'AbortError';
            const errorMessage = isAbort ? 'Request cancelled.' : error.message || 'Error streaming.';
            if (!isAbort) {
                console.error("Stream err cb:", error);
                setError(errorMessage);
            } else {
                console.log("Stream aborted.");
                setError('');
            }
            const streamInfo = currentStreamRef.current;
            if (streamInfo) {
                setChats(prev => prev.map(chat => {
                    if (chat.id === streamInfo.chatId) {
                        const turnIndex = chat.turns.findIndex(t => t.turnId === streamInfo.turnId);
                        if (turnIndex !== -1) {
                            const attemptIndex = chat.turns[turnIndex].responses.findIndex(r => r.attemptId === streamInfo.attemptId);
                            if (attemptIndex !== -1 && chat.turns[turnIndex].responses[attemptIndex].assistantMessage.id === streamInfo.tempBotMessageId) {
                                const newTurns = [...chat.turns];
                                const newResponses = [...newTurns[turnIndex].responses];
                                newResponses[attemptIndex] = {
                                    ...newResponses[attemptIndex],
                                    assistantMessage: {
                                        ...newResponses[attemptIndex].assistantMessage,
                                        content: accumulatedBotContent.trim() || errorMessage,
                                        isError: true,
                                        id: streamInfo.tempBotMessageId
                                    }
                                };
                                newTurns[turnIndex] = {...newTurns[turnIndex], responses: newResponses};
                                return {...chat, turns: newTurns};
                            }
                        }
                    }
                    return chat;
                }));
            } else {
                console.warn("No streamInfo in handleError");
            }
            setIsLoading(false);
            setAbortController(null);
            currentStreamRef.current = null;
        };
        const handleComplete = (finalContent: string) => {
            const streamInfo = currentStreamRef.current;
            if (!streamInfo) return;
            const {
                chatId: completedChatId,
                turnId: completedTurnId,
                attemptId: completedAttemptId,
                tempBotMessageId: completedTempId
            } = streamInfo;
            const chatBeforeUpdate = chats.find(c => c.id === completedChatId);
            const turnIndex = chatBeforeUpdate?.turns.findIndex(t => t.turnId === completedTurnId) ?? -1;
            const turnBeforeUpdate = chatBeforeUpdate?.turns[turnIndex];
            const attemptIndexForTitle = turnBeforeUpdate?.responses.findIndex(r => r.attemptId === completedAttemptId);
            const isFirstEverResponse = turnIndex === 0 && attemptIndexForTitle === 0 && finalContent.trim() !== '';
            const needsTitleUpdate = isFirstEverResponse && /^Chat \d+$/.test(chatBeforeUpdate?.title || '');
            const promptForTitle = turnBeforeUpdate?.responses[0]?.promptUsed;
            setChats((prev) => prev.map((chat) => {
                if (chat.id === completedChatId) {
                    const turnIdx = chat.turns.findIndex(t => t.turnId === completedTurnId);
                    if (turnIdx !== -1) {
                        const attemptIndex = chat.turns[turnIdx].responses.findIndex(r => r.attemptId === completedAttemptId);
                        if (attemptIndex !== -1 && chat.turns[turnIdx].responses[attemptIndex].assistantMessage.id === completedTempId) {
                            const newTurns = [...chat.turns];
                            const newResponses = [...newTurns[turnIdx].responses];
                            const currentAttempt = newResponses[attemptIndex];
                            if (finalContent.trim() === '') {
                                newResponses[attemptIndex] = {
                                    ...currentAttempt,
                                    assistantMessage: {
                                        ...currentAttempt.assistantMessage,
                                        content: 'Model did not respond.',
                                        isError: true,
                                        id: completedTempId
                                    }
                                };
                            } else {
                                newResponses[attemptIndex] = {
                                    ...currentAttempt,
                                    assistantMessage: {
                                        ...currentAttempt.assistantMessage,
                                        content: finalContent,
                                        isError: false,
                                        id: undefined
                                    }
                                };
                            }
                            newTurns[turnIdx] = {...newTurns[turnIdx], responses: newResponses};
                            return {...chat, turns: newTurns};
                        }
                    }
                }
                return chat;
            }));
            setIsLoading(false);
            setAbortController(null);
            currentStreamRef.current = null;
            if (needsTitleUpdate && promptForTitle) {
                generateTitleAndUpdateState(completedChatId, promptForTitle, finalContent);
            }
        };
        await streamChatResponse({
            model,
            messages: contextMessages,
            signal: newAbortController.signal,
            onData: handleData,
            onError: handleError,
            onComplete: handleComplete,
        }).catch(err => {
            console.error("Sync stream err:", err);
            if (!newAbortController.signal.aborted && err.name !== 'AbortError') {
                setError((err as Error).message || 'Unexpected error.');
                setIsLoading(false);
                setAbortController(null);
                const streamInfo = currentStreamRef.current;
                if (streamInfo) {
                    setChats(prev => prev.map(chat => {
                        if (chat.id === streamInfo.chatId) {
                            const turnIndex = chat.turns.findIndex(t => t.turnId === streamInfo.turnId);
                            if (turnIndex !== -1) {
                                const attemptIndex = chat.turns[turnIndex].responses.findIndex(r => r.attemptId === streamInfo.attemptId);
                                if (attemptIndex !== -1) {
                                    const newResponses = chat.turns[turnIndex].responses.slice(0, attemptIndex);
                                    const newTurns = [...chat.turns];
                                    newTurns[turnIndex] = {...newTurns[turnIndex], responses: newResponses};
                                    return {...chat, turns: newTurns};
                                }
                            }
                        }
                        return chat;
                    }));
                }
                currentStreamRef.current = null;
            }
        });
    }, [model, abortController, generateTitleAndUpdateState, chats]);
    const handleSendMessage = useCallback(() => {
        const messageContent = input.trim();
        if (!messageContent || !activeChatId || isLoading) {
            return;
        }
        let targetTurnId: string | null = null;
        let newAttemptId = Date.now().toString();
        let contextMessages: Message[] = [];
        let chatModified = false;
        if (editingTurnInfo && editingTurnInfo.chatId === activeChatId) {
            const {chatId: editChatId, turnIndex: editTurnIndex} = editingTurnInfo;
            targetTurnId = chats.find(c => c.id === editChatId)?.turns[editTurnIndex]?.turnId || null;
            if (targetTurnId) {
                const newResponseAttempt: ResponseAttempt = {
                    attemptId: newAttemptId,
                    promptUsed: messageContent,
                    assistantMessage: {role: 'assistant', content: ''}
                };
                setChats(prev => {
                    const chatIndex = prev.findIndex(c => c.id === editChatId);
                    if (chatIndex === -1) return prev;
                    const chat = prev[chatIndex];
                    const newTurns = [...chat.turns];
                    if (editTurnIndex >= 0 && editTurnIndex < newTurns.length) {
                        newTurns[editTurnIndex] = {
                            ...newTurns[editTurnIndex],
                            responses: [...newTurns[editTurnIndex].responses, newResponseAttempt]
                        };
                        contextMessages = prev[chatIndex].turns.slice(0, editTurnIndex).flatMap((turn: Turn): Message[] => {
                            const lastResp = turn.responses[turn.responses.length - 1];
                            if (!lastResp || lastResp.assistantMessage.isError) return [];
                            const userM: Message = {role: 'user', content: lastResp.promptUsed};
                            const assistantM: Message = lastResp.assistantMessage;
                            return [userM, assistantM];
                        }) || [];
                        contextMessages.push({role: 'user', content: messageContent});
                        chatModified = true;
                        setDisplayedVersions(d => ({
                            ...d,
                            [targetTurnId!]: newTurns[editTurnIndex].responses.length - 1
                        }));
                        const newChats = [...prev];
                        newChats[chatIndex] = {...chat, turns: newTurns};
                        return newChats;
                    } else {
                        console.error("Edit failed: Invalid index.");
                        setError("Failed to edit.");
                        return prev;
                    }
                });
            } else {
                console.error("Edit failed: No targetTurnId.");
                setError("Failed to edit.");
                setEditingTurnInfo(null);
                setInput('');
                return;
            }
            setEditingTurnInfo(null);
        } else {
            const newTurnId = `turn-${Date.now()}`;
            targetTurnId = newTurnId;
            const newResponseAttempt: ResponseAttempt = {
                attemptId: newAttemptId,
                promptUsed: messageContent,
                assistantMessage: {role: 'assistant', content: ''}
            };
            const newTurn: Turn = {turnId: newTurnId, responses: [newResponseAttempt]};
            contextMessages = chats.find(c => c.id === activeChatId)?.turns.flatMap((turn: Turn): Message[] => {
                const lastResp = turn.responses[turn.responses.length - 1];
                if (!lastResp || lastResp.assistantMessage.isError) return [];
                const userM: Message = {role: 'user', content: lastResp.promptUsed};
                const assistantM: Message = lastResp.assistantMessage;
                return [userM, assistantM];
            }) || [];
            contextMessages.push({role: 'user', content: messageContent});
            setChats((prev) => prev.map((chat) => chat.id === activeChatId ? {
                ...chat,
                turns: [...chat.turns, newTurn]
            } : chat));
            chatModified = true;
        }
        setInput('');
        if (chatModified && activeChatId && targetTurnId && contextMessages.length >= 0) {
            streamResponseInternal(activeChatId, targetTurnId, newAttemptId, contextMessages);
        } else if (chatModified) {
            console.error("Send failed: Invalid context/IDs?");
            setError("Error sending message.");
            setIsLoading(false);
        }
    }, [input, activeChatId, isLoading, streamResponseInternal, editingTurnInfo, chats]);
    const handleEditStart = useCallback((turnIndex: number, currentContent: string) => {
        if (isLoading || !activeChatId) return;
        setEditingTurnInfo({chatId: activeChatId, turnIndex});
        setInput(currentContent);
    }, [isLoading, activeChatId]);
    const handleSendFirstMessage = useCallback((message: string) => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || isLoading || isFetchingModels) {
            return;
        }
        if (!model) {
            setError("Please select a model first.");
            return;
        }
        const newChat = createNewChatState();
        if (newChat?.id) {
            const newId = newChat.id;
            const firstUserMessage: Message = {role: 'user', content: trimmedMessage};
            const firstAttemptId = Date.now().toString();
            const firstResponseAttempt: ResponseAttempt = {
                attemptId: firstAttemptId,
                promptUsed: trimmedMessage,
                assistantMessage: {role: 'assistant', content: ''}
            };
            const firstTurn: Turn = {turnId: `turn-${Date.now()}`, responses: [firstResponseAttempt]};
            const defaultTitlePattern = /^Chat \d+$/;
            let finalTitle = newChat.title;
            if (defaultTitlePattern.test(newChat.title)) {
                const suffix = firstUserMessage.content.length > 35 ? '...' : '';
                finalTitle = firstUserMessage.content.substring(0, 35) + suffix;
            }
            setChats(prev => prev.map(chat => chat.id === newId ? {
                ...chat,
                title: finalTitle,
                turns: [firstTurn]
            } : chat));
            setInput('');
            navigate(`/chat/${newId}`);
        } else {
            console.error("Failed to create chat state.");
            setError("Could not start chat.");
        }
    }, [isLoading, isFetchingModels, model, createNewChatState, navigate]);
    useEffect(() => {
        const currentActiveChat = activeChatId ? chats.find(c => c.id === activeChatId) : undefined;
        if (currentActiveChat && currentActiveChat.turns.length === 1 && currentActiveChat.turns[0].responses.length === 1 && !isLoading && !abortController) {
            const firstTurn = currentActiveChat.turns[0];
            const firstAttempt = firstTurn.responses[0];
            if (firstAttempt.assistantMessage.content === '' && !firstAttempt.assistantMessage.isError && firstAttempt.assistantMessage.id === undefined) {
                if (activeChatId) {
                    const context: Message[] = [{role: 'user', content: firstAttempt.promptUsed}];
                    streamResponseInternal(activeChatId, firstTurn.turnId, firstAttempt.attemptId, context);
                }
            }
        } /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [activeChatId, chats, isLoading, abortController]);
    const handleRetryLastMessage = useCallback(() => {
        if (!activeChatId || isLoading) return;
        let targetTurnId: string | null = null;
        let promptToRetry: string | null = null;
        let chatToUpdate: Chat | undefined = chats.find(chat => chat.id === activeChatId);
        let contextForRetry: Message[] = [];
        let turnIndexToRetry = -1;
        if (chatToUpdate && chatToUpdate.turns.length > 0) {
            for (let i = chatToUpdate.turns.length - 1; i >= 0; i--) {
                const turn = chatToUpdate.turns[i];
                if (turn.responses.length > 0) {
                    const lastAttempt = turn.responses[turn.responses.length - 1];
                    if (lastAttempt.assistantMessage.isError) {
                        targetTurnId = turn.turnId;
                        promptToRetry = lastAttempt.promptUsed;
                        turnIndexToRetry = i;
                        break;
                    }
                }
            }
        }
        if (activeChatId && targetTurnId && promptToRetry !== null && turnIndexToRetry !== -1) {
            contextForRetry = chatToUpdate?.turns.slice(0, turnIndexToRetry).flatMap((turn: Turn): Message[] => {
                const lastResp = turn.responses[turn.responses.length - 1];
                if (!lastResp || lastResp.assistantMessage.isError) return [];
                const userM: Message = {role: 'user', content: lastResp.promptUsed};
                const assistantM: Message = lastResp.assistantMessage;
                return [userM, assistantM];
            }) || [];
            contextForRetry.push({role: 'user', content: promptToRetry});
            const newRetryAttemptId = Date.now().toString();
            const newRetryAttempt: ResponseAttempt = {
                attemptId: newRetryAttemptId,
                promptUsed: promptToRetry,
                assistantMessage: {role: 'assistant', content: ''}
            };
            setChats(prev => prev.map(chat => {
                if (chat.id === activeChatId) {
                    const newTurns = [...chat.turns];
                    const turnIdx = newTurns.findIndex(t => t.turnId === targetTurnId!);
                    if (turnIdx !== -1) {
                        const errorIndex = newTurns[turnIdx].responses.findIndex(r => r.assistantMessage.isError);
                        let responsesWithoutError = newTurns[turnIdx].responses;
                        if (errorIndex !== -1) {
                            responsesWithoutError = responsesWithoutError.slice(0, errorIndex);
                        }
                        const updatedResponses = [...responsesWithoutError, newRetryAttempt];
                        newTurns[turnIdx] = {...newTurns[turnIdx], responses: updatedResponses};
                        setDisplayedVersions(d => ({...d, [targetTurnId!]: updatedResponses.length - 1}));
                        return {...chat, turns: newTurns};
                    }
                }
                return chat;
            }));
            streamResponseInternal(activeChatId, targetTurnId, newRetryAttemptId, contextForRetry);
        } else {
            console.warn("Retry failed.");
            setError("Could not perform retry.");
        }
    }, [activeChatId, isLoading, chats, streamResponseInternal]);
    const handleRegenerate = useCallback((turnId: string, attemptIndex: number) => {
        if (!activeChatId || isLoading) return;
        const chatToUpdate = chats.find(c => c.id === activeChatId);
        const turnIndexToRegen = chatToUpdate?.turns.findIndex(t => t.turnId === turnId);
        const turnToUpdate = turnIndexToRegen !== undefined && turnIndexToRegen !== -1 ? chatToUpdate?.turns[turnIndexToRegen] : undefined;
        const attemptToRegen = turnToUpdate?.responses[attemptIndex];
        if (chatToUpdate && turnToUpdate && attemptToRegen && turnIndexToRegen !== -1) {
            const promptToUse = attemptToRegen.promptUsed;
            const newAttemptId = Date.now().toString();
            const newResponseAttempt: ResponseAttempt = {
                attemptId: newAttemptId,
                promptUsed: promptToUse,
                assistantMessage: {role: 'assistant', content: ''}
            };
            let contextMessages: Message[] = chatToUpdate.turns.slice(0, turnIndexToRegen).flatMap((turn: Turn): Message[] => {
                const lastResp = turn.responses[turn.responses.length - 1];
                if (!lastResp || lastResp.assistantMessage.isError) return [];
                const userM: Message = {role: 'user', content: lastResp.promptUsed};
                const assistantM: Message = lastResp.assistantMessage;
                return [userM, assistantM];
            }) || [];
            contextMessages.push({role: 'user', content: promptToUse});
            setChats(prev => prev.map(chat => {
                if (chat.id === activeChatId) {
                    const newTurns = [...chat.turns];
                    const turnIdx = newTurns.findIndex(t => t.turnId === turnId);
                    if (turnIdx !== -1) {
                        const updatedResponses = [...newTurns[turnIdx].responses, newResponseAttempt];
                        newTurns[turnIdx] = {...newTurns[turnIdx], responses: updatedResponses};
                        setDisplayedVersions(d => ({...d, [turnId]: updatedResponses.length - 1}));
                        return {...chat, turns: newTurns};
                    }
                }
                return chat;
            }));
            streamResponseInternal(activeChatId, turnId, newAttemptId, contextMessages);
        } else {
            console.warn("Regenerate failed.");
            setError("Could not regenerate response.");
        }
    }, [activeChatId, isLoading, chats, streamResponseInternal]);
    const handleModelChange = (event: SelectChangeEvent<unknown>) => {
        setModel(event.target.value as string);
    };
    const handleShowVersion = useCallback((turnId: string, index: number) => {
        setDisplayedVersions(prev => ({...prev, [turnId]: index,}));
    }, []);
    const getGreeting = () => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) return "Good morning";
        if (currentHour < 18) return "Good afternoon";
        return "Good evening";
    };

    // Theme definition
    const theme = React.useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);
    // Get active chat data
    const activeChat = activeChatId ? chats.find((chat) => chat.id === activeChatId) : undefined;

    // --- Render UI ---
    return (<ThemeProvider theme={theme}> <CssBaseline/> <Box
        sx={{display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default'}}>
        <ChatHistory chats={chats} activeChatId={activeChatId} onSelectChat={selectChat}
                     onCreateChat={handleGoToHomeAndReset} onUpdateTitle={updateChatTitle}
                     toggleDrawer={() => setDrawerOpen(prev => !prev)} onDeleteChat={deleteChat}
                     open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)}
                     isLoading={isLoading || isFetchingModels}/>
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            height: '100vh',
            overflow: 'hidden'
        }}>
            {/* --- Pass model props to Header --- */}
            <Header darkMode={darkMode} toggleDarkMode={toggleDarkModeHandler}
                    toggleDrawer={() => setDrawerOpen(prev => !prev)} onCreateChat={handleGoToHomeAndReset}
                    drawerOpen={drawerOpen} model={model} availableModels={availableModels}
                    isFetchingModels={isFetchingModels} modelError={modelError} onModelChange={handleModelChange}/>
            {/* --- UPDATED: Content area handles scroll, added pb --- */}
            <Box sx={{
                flexGrow: 1,
                width: '100%',
                display: 'flex',
                mx: 0,
                flexDirection: 'column',
                position: 'relative'
            }}>
                {/* Content (Initial or ChatWindow) */}
                <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%'}}>
                    {!activeChatId ? ( /* Initial Centered View */ <Box sx={{
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            p: 3
                        }}> <Paper elevation={0} sx={{
                            p: {xs: 2, sm: 4},
                            borderRadius: 2,
                            textAlign: 'center',
                            width: {xs: '95%', sm: '80%', md: '70'},
                            bgcolor: 'transparent'
                        }}>
                            <Typography variant="h2" sx={{
                                mb: 2,
                                fontSize: {xs: "2rem", sm: "3rem", md: "4rem"},
                                color: 'text.secondary'
                            }}>{getGreeting()}!</Typography>
                            <QuestionAnswerIcon sx={{fontSize: {xs: 50, sm: 60, md: 80}, color: 'action.disabled', mb: 2}}/>
                            <Box
                                sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 2}}>
                                <StyledTextarea minRows={1} maxRows={8} placeholder={"Send a message..."} value={input}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                                                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendFirstMessage(input);
                                                    }
                                                }} disabled={isLoading || isFetchingModels || !model}
                                                style={{flexGrow: 1, padding: 10}}/>
                                <IconButton color="primary" onClick={() => handleSendFirstMessage(input)}
                                            disabled={!input.trim() || isLoading || isFetchingModels || !model} sx={{
                                    height: '50px',
                                    width: '50px',
                                    '&:hover': {bgcolor: 'action.hover'}
                                }}><SendIcon/></IconButton> </Box> </Paper> </Box>)
                        : activeChat ? ( /* Active Chat View */ <ChatWindow key={activeChatId} activeChat={activeChat}
                                                                            input={input} error={error}
                                                                            isLoading={isLoading}
                                                                            isFetchingModels={isFetchingModels}
                                                                            onInputChange={setInput}
                                                                            onSendMessage={handleSendMessage}
                                                                            onClearError={() => setError('')}
                                                                            onStopGenerating={stopGeneration}
                                                                            onRetry={handleRetryLastMessage}
                                                                            onEdit={handleEditStart}
                                                                            isEditing={!!editingTurnInfo && editingTurnInfo.chatId === activeChatId}
                                                                            displayedVersions={displayedVersions}
                                                                            onShowVersion={handleShowVersion}
                                                                            onRegenerate={handleRegenerate}
                                                                            onCancelEdit={handleCancelEdit}/>)
                            : ( /* Fallback */ <Box
                                sx={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                <Typography variant="h6" color="error" align="center">Error: Chat not
                                    found.</Typography> </Box>)}
                </Box>
            </Box>
        </Box>
    </Box> </ThemeProvider>);
};

// --- App Component Wrapper (Handles Routing) ---
const App: React.FC = () => {
    return (<BrowserRouter> <Routes> <Route path="/chat/:chatId" element={<AppCore/>}/> <Route path="/"
                                                                                               element={<AppCore/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/> </Routes> </BrowserRouter>);
};

export default App;