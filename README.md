# Hundred Acre Realm - Magic Realm Web App

A modern web application for playing the classic Magic Realm board game, built with React, TypeScript, and Vite.

## Features

- Interactive game board with hexagonal tiles
- Character management and movement
- Combat system
- Inventory management
- Real-time game state updates
- Modern, responsive UI

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand (State Management)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hundreacrerealm.git
cd hundreacrerealm
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
hundreacrerealm/
├── src/
│   ├── components/     # React components
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Zustand store
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   └── App.tsx        # Main application component
├── public/            # Static assets
├── index.html         # Entry HTML file
├── package.json       # Project dependencies
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

This project uses ESLint and Prettier for code formatting. The configuration is included in the project.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Magic Realm board game by Avalon Hill
- All contributors and supporters of the project 