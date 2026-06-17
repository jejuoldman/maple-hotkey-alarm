# Maple Hotkey Alarm

Windows desktop alarm app for MapleStory farming sessions. It keeps running in the tray and listens for global hotkeys while MapleStory is focused.

## Features

- Multiple alarm slots
- Single keys, modifier hotkeys, and ordinary key chords such as `Insert + 1`
- Pressing the same registered key resets that slot's timer
- Expired alarms keep ringing until you press the slot's stop button
- Tray background mode

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
