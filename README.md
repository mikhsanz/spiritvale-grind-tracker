# Spiritvale Grind Tracker

A local web app for tracking Spiritvale grind sessions. Record the map, starting gold, and a live timer, then enter ending gold to see gold earned and gold per hour.

No install, no login, no server. Open `index.html` in a browser.

**Version:** v1.0  
**Created by:** MYUJIN

## How to use

1. Double-click `index.html`, or right-click it and open it with Chrome or Edge.
2. Search for a map and pick one from the list.
3. Enter your **starting gold**. Thousand separators are added as you type (`1.000.000`).
4. Click **Start grind**. The timer runs in the browser.
5. Use **Pause** / **Resume** if you step away. Paused time does not count.
6. Click **Finish**, enter **ending gold**, then **Save result**.
7. The app shows gold earned, duration, and gold per hour. Finished sessions stay in **Session history**.

You do not need Node, npm, or a terminal.

## Features

- Searchable map dropdown (Spiritvale zones, snapshotted locally)
- Live timer with pause and resume
- Automatic gold thousand separators
- Gold earned and gold per hour
- Session history in this browser (`localStorage`)
- Running or paused sessions survive a refresh or tab close

## How gold is calculated

- Gold earned = ending gold − starting gold
- Gold per hour = gold earned ÷ (running time in hours)
- A negative result is allowed (for example if you spent gold mid-grind)

Duration is only the time the timer was running, not wall-clock time.

## Data

Sessions are stored in the browser under `spiritvale-grind-sessions`. Clearing site data or using another browser starts you from empty.

There is no account and no cloud sync.

## Project files

| File | Role |
| --- | --- |
| `index.html` | Page layout |
| `styles.css` | Dark theme |
| `app.js` | Timer, gold math, storage, map search |
| `maps.js` | Local map list (name + level range) |

Map names come from [spiritvale.info/maps](https://spiritvale.info/maps). That site has no public API, so the list is copied into `maps.js`. Add new maps there after a game patch.

## License

Personal project. Use and modify as you like.
