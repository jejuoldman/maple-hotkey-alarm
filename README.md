# Maple Hotkey Alarm

Windows desktop alarm app for MapleStory farming sessions. It keeps running in the tray and listens for global hotkeys while MapleStory is focused.

## Download

Use the files generated in `release/`:

- Installer: `Maple Hotkey Alarm Setup 0.1.0.exe`
- Portable: `Maple Hotkey Alarm 0.1.0.exe`

The first version is unsigned, so Windows SmartScreen may show a warning.

## Development

```powershell
npm install
npm test
npm start
npm run dist
```

This workspace was built with pnpm because the local shell did not have npm on PATH.
