# Contributing to Hundred Acre Realm

Thank you for your interest in contributing to Hundred Acre Realm! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose (for testing deployment)
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/hundreacrerealm.git
   cd hundreacrerealm
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### File Structure

- **API Routes**: Place new API routes in `app/api/`
- **Components**: Place reusable components in `components/`
- **Pages**: Place page components in `app/`
- **Scripts**: Place data processing scripts in `scripts/`
- **Data**: Place configuration data in `data/`

### Testing

- Test your changes locally before submitting
- Ensure the application builds successfully: `npm run build`
- Test with Docker deployment if your changes affect deployment

### Data Parsing Scripts

When adding new parsing scripts:

1. Place them in the `scripts/` directory
2. Follow the naming convention: `verb_noun.js` (e.g., `parse_characters.js`)
3. Add documentation to `scripts/README.md`
4. Test with sample data before committing

### API Development

When adding new API endpoints:

1. Create the route file in `app/api/`
2. Follow RESTful conventions
3. Add proper error handling
4. Include TypeScript types
5. Test the endpoint locally

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Add feature: brief description"
   ```

3. Push your branch and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Ensure your pull request:
   - Has a clear title and description
   - Includes any necessary documentation updates
   - Follows the existing code style
   - Includes tests if applicable

## Areas for Contribution

### High Priority

- **Bug Fixes**: Fix any issues you encounter
- **Performance Improvements**: Optimize data parsing or rendering
- **UI/UX Enhancements**: Improve the user interface
- **Documentation**: Improve or add documentation

### Medium Priority

- **New Features**: Add new functionality
- **API Enhancements**: Improve existing APIs or add new ones
- **Data Processing**: Enhance parsing scripts
- **Testing**: Add tests for existing functionality

### Low Priority

- **Code Refactoring**: Improve code organization
- **Style Improvements**: Enhance visual design
- **Accessibility**: Improve accessibility features

## Magic Realm Knowledge

This project is based on the Magic Realm board game. Familiarity with the game is helpful but not required. Key concepts:

- **Characters**: Playable characters with unique abilities
- **Monsters**: Enemies that spawn on the map
- **Natives**: NPC groups that inhabit the realm
- **Items**: Weapons, armor, treasures, and other equipment
- **Spells**: Magic abilities characters can learn
- **Tiles**: Map pieces that form the game board
- **Chits**: Game components with various attributes

## Questions and Support

If you have questions or need help:

1. Check the existing documentation
2. Look at similar code in the project
3. Open an issue for discussion
4. Ask in the pull request comments

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you for contributing to Hundred Acre Realm! Your contributions help make this project better for the Magic Realm community. 