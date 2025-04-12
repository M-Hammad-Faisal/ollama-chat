# Ollama Chat

Ollama Chat is a modern, responsive chat application built with React and TypeScript, integrating with
the [Ollama API](https://ollama.ai/) for AI-powered conversations. It features a clean Material-UI interface, chat
history management, dark/light mode theming, and advanced chat functionalities like message editing, regeneration, and
version navigation.

---

## Features

- AI Chat: Stream responses from Ollama models with real-time updates.
- Chat History: Persistent chat sessions with renaming and deletion options.
- Responsive Design: Adapts to mobile and desktop screens.
- Theming: Toggle between light and dark modes with Material-UI styling.
- Model Selection: Choose from available Ollama models dynamically.
- Message Management: Edit prompts, regenerate responses, and navigate response versions.
- Syntax Highlighting: Code blocks with copy functionality using `react-syntax-highlighter`.
- Error Handling: Graceful retries and cancellations for failed responses.
- Auto-Generated Titles: Smart titles based on conversation content.

---

## Tech Stack

- Frontend: React 19.1.0, TypeScript 4.9.5
- UI Framework: Material-UI 7.0.2
- Routing: React Router DOM 7.5.0
- Markdown Rendering: `react-markdown` with `remark-gfm`
- Syntax Highlighting: `react-syntax-highlighter`
- API Integration: Custom Ollama API client
- Styling: MUI `styled` components
- State Management: React hooks with localStorage persistence

---

## Prerequisites

- Node.js: Version 16+ (due to `@types/node` dependency)
- Ollama Server: Running locally or at a custom URL (default: `http://localhost:11434`)
- npm or yarn: For dependency management

---

## Installation

1. Clone the Repository:

   ```bash
   git clone https://github.com/yourusername/ollama-chat.git
   cd ollama-chat
   ```

2. Install Dependencies: Using npm:
   ```bash
   npm install
   ```
3. Set Up Ollama Server:
    - Ensure an Ollama server is running at http://localhost:11434 (default).
    - To use a custom URL, set the REACT_APP_OLLAMA_URL environment variable:
   ```bash
   export REACT_APP_OLLAMA_URL="http://your-ollama-server:port"
   ```
   Alternatively, create a .env file in the root directory:
   ```bash
   REACT_APP_OLLAMA_URL=http://your-ollama-server:port
   ```
4. Start the Application:
   ```bash
   npm start
   ```

5. Access the Application:
    - Open your browser and navigate to `http://localhost:3000`.

---

## Usage

1. Start a Chat:
    - Click the "New Chat" button in the header or sidebar.
    - Type a message in the input field and press Enter or click the Send button.

2. Manage Chats:
    - View History: Toggle the sidebar with the menu icon.
    - Rename: Click the three-dot menu on a chat and select "Rename".
    - Delete: Use the same menu to delete a chat.

3. Interact with Messages:
    - Edit: Click the edit icon on a user message to modify and resend.
    - Regenerate: Use the regenerate button to get a new response.
    - Copy Code: Click the copy icon in code blocks.
    - Version Navigation: Use arrows to cycle through response attempts.

4. Switch Models:
    - Select a model from the dropdown in the header (fetched from the Ollama API).

5. Toggle Theme:
    - Click the sun/moon icon in the header to switch between light and dark modes.

---

## Project Structure

   ```text
   ollama-chat/
   ├── src/
   │ ├── components/
   │ │ ├── ChatHistory.tsx # Sidebar with chat list and actions
   │ │ ├── ChatWindow.tsx # Main chat display with messages
   │ │ └── Header.tsx # Top bar with model selector and controls
   │ ├── services/
   │ │ └── ollamaAPI.ts # API client for Ollama integration
   │ ├── styles/
   │ │ └── index.ts # Custom styled components
   │ ├── types/
   │ │ └── index.ts # TypeScript interfaces for chat data
   │ ├── theme.ts # MUI theme configuration
   │ ├── App.tsx # Main app logic and routing
   │ └── App.css # Global styles (if any)
   ├── package.json # Dependencies and scripts
   └── README.md # This file
   ```

---

## Configuration

- Ollama URL: Set via `REACT_APP_OLLAMA_URL` (defaults to `http://localhost:11434`).
- Persistence: Chats and theme preferences are saved in `localStorage`.
- Font Sizes: Locked at `1rem = 16px` for consistency (see `theme.ts`).

---

## Development

- Add new API endpoints in ollamaAPI.ts.
- Enhance ChatWindow.tsx for additional message features.
- Customize theme.ts for different color schemes.

---

## Screenshots

![Chat Interface (Light Mode)](./screenshots/ChatInterface(LightMode).png?raw=true "Ollama Chat")
![Chat History Sidebar (Dark Mode)](./screenshots/ChatHistorySidebar(DarkMode).png?raw=true "Ollama Chat")
![Code Block with Copy Button](./screenshots/CodeBlockWithCopyButton.png?raw=true "Ollama Chat")

---

## Contributing

- Fork the repository.
- Create a feature branch (git checkout -b feature/YourFeature).
- Commit changes (git commit -m "Add YourFeature").
- Push to the branch (git push origin feature/YourFeature).
- Open a Pull Request.

## License

This project is licensed under the MIT License. See the file for details.

---

## Acknowledgments

[Ollama](https://ollama.ai/) for the AI backend.
[Material-UI](https://mui.com/) for the UI components.
[React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) for code rendering.