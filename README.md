# Ai Buddy Chat

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=for-the-badge&logo=openai&logoColor=white)

**Ai Buddy Chat** is a state-of-the-art, real-time AI conversational assistant built with the latest web technologies. It provides a seamless, responsive, and aesthetically pleasing chat interface powered by OpenAI's advanced models. Designed for developers and power users, it features markdown support, code syntax highlighting, and smooth interactions.

---

## 🚀 Key Features

*   **Real-Time AI Interaction**: Powered by OpenAI's GPT models for intelligent and context-aware responses.
*   **Modern UI/UX**: Built with **Radix UI** primitives and **Tailwind CSS v4** for a robust, accessible, and beautiful interface.
*   **Rich Content Support**: Full support for **Markdown** rendering and **Syntax Highlighting** for code blocks, making it ideal for technical discussions.
*   **Smooth Animations**: Integrated **Framer Motion** for fluid UI transitions and **Lenis** for premium smooth scrolling effects.
*   **Responsive Design**: Fully responsive layout that works perfectly across desktop and mobile devices.
*   **State Management**: efficient state management using **Zustand**.

---

## 🛠️ Technology Stack

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) - The React Framework for the Web.
*   **Language**: [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript for robust development.
*   **Styling**:
    *   [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first CSS framework.
    *   [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible UI components.
    *   [Lucide React](https://lucide.dev/) - Beautiful & consistent icons.
*   **Animations**:
    *   [Framer Motion](https://www.framer.com/motion/) - Production-ready animation library.
    *   [Lenis](https://lenis.studiofreight.com/) - Smooth scrolling library.
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand) - Small, fast, and scalable bearbones state-management solution.
*   **AI Integration**: [OpenAI Node.js SDK](https://github.com/openai/openai-node) - Official usage of the OpenAI API.

---

## 📂 Architecture Overview

The project follows a modern **Next.js App Router** structure, ensuring modularity and scalability.

```
d:/Projects/Ai Buddy/
├── 📁 app/                 # Next.js App Router directories
│   ├── 📁 api/             # Backend API routes (OpenAI integration)
│   ├── layout.tsx          # Root layout with global providers
│   ├── page.tsx            # Main chat interface page
│   └── globals.css         # Global styles and Tailwind directives
├── 📁 components/          # Reusable UI components
│   ├── 📁 ui/              # Shadcn/Radix UI primitive components
│   └── ...                 # Feature-specific components (ChatBubble, etc.)
├── 📁 lib/                 # Utility functions and shared logic
│   ├── utils.ts            # Common helper functions (cn, etc.)
│   └── ...
├── 📁 hooks/               # Custom React hooks
├── 📁 public/              # Static assets (images, icons)
├── 📁 types/               # TypeScript type definitions
└── package.json            # Project dependencies and scripts
```

### Core Components

*   **`app/page.tsx`**: The entry point for the chat application. It orchestrates the chat layout and main interaction flow.
*   **`app/api/`**: Contains server-side logic for securely handling OpenAI API requests, ensuring API keys are never exposed to the client.
*   **`components/ui/`**: A collection of accessible, reusable UI components (Buttons, Inputs, Dialogs) built on top of Radix UI.
*   **`lib/store.ts`** (if applicable): Zustand store definition for managing global application state like chat history and user preferences.

---

## ⚡ Getting Started

Follow these steps to set up the project locally.

### Prerequisites

*   [Node.js](https://nodejs.org/) (Version 18.17 or higher)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kirtan597/Ai-Buddy.git
    cd Ai-Buddy
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env.local` file in the root directory and add your OpenAI API key:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the application:**
    Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.
