# Ai Buddy Chat

<div align="center">

![Ai Buddy Banner](https://capsule-render.vercel.app/api?type=waving&color=0:3a1c71,100:d76d77&height=200&section=header&text=Ai%20Buddy&fontSize=80&fontColor=fff&animation=fadeIn&fontAlignY=35&desc=Your%20Intelligent%20Pair%20Programmer&descAlignY=55&descAlign=50)

<a href="https://nextjs.org">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
</a>
<a href="https://react.dev">
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
</a>
<a href="https://www.typescriptlang.org">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
</a>
<a href="https://tailwindcss.com">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</a>
<a href="https://openai.com">
  <img src="https://img.shields.io/badge/OpenAI-API-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI">
</a>
<a href="https://www.mongodb.com">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
</a>
<a href="https://authjs.dev">
  <img src="https://img.shields.io/badge/NextAuth.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="NextAuth">
</a>

</div>

---

# 🔮 Overview

**Ai Buddy Chat** isn't just another chatbot—it's a **premium, architectural masterpiece** designed for developers who demand excellence. Built on the bleeding edge of web technology, it orchestrates a symphony of **Real-time AI**, **Fluid Animations**, and **Type-Safe Architecture**.

Now featuring a **ChatGPT-like experience** with Guest Mode access limits, secure Google Authentication, and persistent cloud storage for all your conversations.

## ✨ Why Ai Buddy?

-   **⚡ Zero-Latency Feel**: Powered by optimistic UI updates and efficient streaming.
-   **🎨 Cinematic Visuals**: Deep integration of **Framer Motion** for layout transitions and **Lenis** for buttery smooth scrolling.
-   **🔐 Secure & Personal**: **Google OAuth** integration ensures your chats are private and persistent.
-   **🧠 Smart Memory**: Conversations are stored in **MongoDB**, allowing you to pick up exactly where you left off across devices.
-   **🆓 Guest Mode**: Try before you sign in. Guests get a 1-message preview before being prompted to unlock full access.

---

# 🏛️ System Architecture

We adhere to a clean, separation-of-concerns architecture where the UI assumes a reactive state driven by Zustand, whilst standard Next.js Server Actions handle the heavy lifting of API streaming and Database interaction.

## High-Level Data Flow

```mermaid
graph LR
    User[👤 User] -->|Input| UI[🖥️ Client UI]
    UI -->|Otimistic Update| Store[📦 Zustand Store]
    UI -- Check Auth --> Auth[🔐 NextAuth]
    Auth -- Verified --> API[☁️ Next.js Server]
    API -->|Save Message| DB[(🍃 MongoDB)]
    API -->|Stream Request| OpenAI[🧠 OpenAI API]
    OpenAI -->|Stream Chunks| API
    API -->|Stream Response| UI
    UI -->|Render Markdown| Display[📄 Chat Interface]
    
    style User fill:#fff,stroke:#333
    style UI fill:#61DAFB,stroke:#333
    style Store fill:#764ABC,stroke:#333
    style API fill:#000000,stroke:#fff,color:#fff
    style OpenAI fill:#412991,stroke:#fff,color:#fff
    style DB fill:#47A248,stroke:#fff,color:#fff
    style Auth fill:#E34F26,stroke:#fff,color:#fff
```

## Detailed Interaction Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client (Zustand)
    participant S as Server Action
    participant D as MongoDB
    participant AI as OpenAI API
    
    U->>C: Types Message & Sends
    alt Guest Limit Reached
        C->>U: Show Login Modal
    else Authenticated
        C->>C: Add User Message (Optimistic)
        C->>S: POST /chat (Message History)
        S->>D: Save User Message
        S->>AI: Create Chat Completion (Stream=True)
        loop Stream Chunks
            AI-->>S: Delta Content
            S-->>C: Stream Chunk
            C->>C: Append to Assistant Message
        end
        S->>D: Save Assistant Message
        S-->>C: Stream Complete
        C->>C: Finalize State
    end
```

---

# 📂 Project Structure

A meticulously organized codebase ensuring scalability and maintainability.

```bash
d:/Projects/Ai Buddy/
├── 📁 app/                    # 🚀 Next.js App Router System
│   ├── 📁 api/                #    Server-side API routes & Edge Functions
│   │   ├── 📁 auth/           #    NextAuth Handler
│   │   └── 📁 chat-v2/        #    Chat Stream Handler
│   ├── layout.tsx             #    Root Layout (Providers Injection)
│   └── globals.css            #    Tailwind V4 Directives & Theme Variables
├── 📁 components/             # 🧩 UI Building Blocks
│   ├── 📁 ui/                 #    Shadcn/Radix atomic components
│   ├── chat-interface.tsx     #    Main Chat Orchestrator
│   ├── LoginModal.tsx         #    Auth Entry Point
│   └── ChatSidebar.tsx        #    History Navigation
├── 📁 lib/                    # 🛠️ Utilities & Core Logic
│   ├── store.ts               #    Zustand Global State Management
│   ├── mongodb.ts             #    Database Connection
│   └── openai.ts              #    OpenAI Singleton Configuration
├── 📁 models/                 # 🍃 Mongoose Schemas (User, Conversation, Message)
└── package.json               # 📦 Dependency Manifest
```

---

# ⚡ Getting Started

Transform your local environment into an AI powerhouse.

### 1️⃣ Clone & Install
```bash
git clone https://github.com/kirtan597/Ai-Buddy.git
cd Ai-Buddy
npm install
```

### 2️⃣ Configure Environment
Create a `.env.local` file with your keys:
```env
# AI Provider
OPENAI_API_KEY=sk-your-super-secret-key

# Database
MONGODB_URI=mongodb://localhost:27017/ai-buddy

# Authentication (Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000
```

### 3️⃣ Ignite
```bash
npm run dev
```
Visit `http://localhost:3000` and witness the magic.

---

# 🤝 Contribution
Innovation happens together.
1.  **Fork** the repo.
2.  **Branch** off (`feature/quantum-leap`).
3.  **Commit** your brilliance.
4.  **Push** and open a PR.

---

<div align="center">

**Built with ❤️ by [Kirtan](https://github.com/kirtan597)**

</div>
