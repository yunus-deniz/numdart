# Numdart

Numdart is an open-source number puzzle game for middle-school students
(grades 5-7), built with Expo / React Native and TypeScript.
It turns arithmetic practice into short daily puzzles that teachers can
use in class or assign as homework. The interface is in Turkish and English.

## Features

- Daily puzzle: the same puzzle for everyone each day
- Classic and other game modes with a deterministic puzzle engine
- Statistics and settings screens
- Turkish and English localisation (`src/i18n`)

## Getting started

```bash
npm ci
npm test          # engine tests
npx expo start    # run in Expo Go or an emulator
```

## Project structure

- `src/app` - screens (Expo Router)
- `src/engine` - puzzle generation and game rules
- `src/components` - UI components
- `src/lib` - state, theme, config
- `tests` - engine tests

## Contributing

Issues and pull requests are welcome, especially from teachers with ideas
for new puzzle types or classroom use.

## License

MIT - see [LICENSE](LICENSE).
