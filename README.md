# barely

A UI interaction library built on native browser APIs.

DOM is the database. CSS variables are the rendering bridge. JS just orchestrates.

## Packages

| Package                  | Description                                                   | Status       |
| ------------------------ | ------------------------------------------------------------- | ------------ |
| `@justbarely/data`       | Placeholder data via HTML attrs or JS imports                 | ✅ Published |
| `@justbarely/engine`     | Component registry, MO, IO, cleanup, sync, events             | ✅ Done      |
| `@justbarely/core`       | Pure math functions — clamp, normalize, progress, scroll math | ⬜ Scaffold  |
| `@justbarely/components` | Drop-in UI components (tabs, accordion, carousel, etc.)       | ⬜ Scaffold  |
| `@justbarely/styles`     | CSS design tokens, base styles, and skins                     | ⬜ Scaffold  |
| `barely`                 | Meta-package — re-exports everything                          | ⬜ Scaffold  |

Each package is self-contained. `cd <name>` for package-specific scripts.

```sh
npm run build   # build all packages
npm run serve   # serve this directory
npm run lint    # lint all packages
```

Published to npm under the `@justbarely` scope.
