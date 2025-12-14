# Reigning Cats Jest platform game

A simple game built on Phaser for testing the Jest platform.

```bash
cd reigning-cats
npm install
```

Then start the development server with your port number. For example:

```bash
npm run dev
open http://localhost:3003
```

To open in this game's debug mode (not Jest platform debug mode):

```bash
open http://localhost:3003?entryPayload=%7B%22mode%22%3A%22debug%22%7D
```

## Build and deploy

To build for production:

```bash
npm run build
```

Then create a Zip archive using the `dist` directory and upload it as a new version in the [Jest platform Developer Console](https://jest.com/developers).

To test locally with an entry payload:

```bash
npm run dev
open http://localhost:3003?entryPayload=%7B%22mode%22%3A%22debug%22%2C%22difficulty%22%3A%22hard%22%7D
```

To test live on Jest, use this URL: `https://jest.com/g/<game-slug>`
