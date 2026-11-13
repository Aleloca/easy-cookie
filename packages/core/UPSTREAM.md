# Upstream

`src/engine/` and `test/engine/` started as a source copy of
[orestbida/cookieconsent](https://github.com/orestbida/cookieconsent) **v3.3.0**
(commit `944bb270df5be3732d5384d8d5e12c224468f1d1`), MIT License,
Copyright (c) 2020-2025 Orest Bida. The original license text is kept in
[`LICENSE.upstream`](LICENSE.upstream) and must ship with this package.

The engine is not an npm dependency: easy-cookie owns and modifies this code.
Upstream fixes are reviewed and cherry-picked by hand. When you do, record it below.

## Local changes to the engine

- Engine tests stay on Jest (paths adjusted to `test/engine`); the GUI-less "core build" test was removed because easy-cookie ships a single build.

## Cherry-picked upstream changes

_None yet._
