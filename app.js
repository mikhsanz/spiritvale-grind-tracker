(function () {
  const STORAGE_KEY = "spiritvale-grind-sessions";
  const MAPS = window.SPIRITVALE_MAPS || [];

  const setupView = document.getElementById("setup-view");
  const runningView = document.getElementById("running-view");
  const resultView = document.getElementById("result-view");
  const setupForm = document.getElementById("setup-form");
  const mapSearch = document.getElementById("map-search");
  const mapList = document.getElementById("map-list");
  const mapHint = document.getElementById("map-hint");
  const startingGoldInput = document.getElementById("starting-gold");
  const startBtn = document.getElementById("start-btn");
  const activeMap = document.getElementById("active-map");
  const activeStartGold = document.getElementById("active-start-gold");
  const timerEl = document.getElementById("timer");
  const timerStatus = document.getElementById("timer-status");
  const pauseBtn = document.getElementById("pause-btn");
  const finishBtn = document.getElementById("finish-btn");
  const finishForm = document.getElementById("finish-form");
  const endingGoldInput = document.getElementById("ending-gold");
  const finishError = document.getElementById("finish-error");
  const confirmFinishBtn = document.getElementById("confirm-finish-btn");
  const cancelFinishBtn = document.getElementById("cancel-finish-btn");
  const resultMap = document.getElementById("result-map");
  const resultDuration = document.getElementById("result-duration");
  const resultGained = document.getElementById("result-gained");
  const resultRate = document.getElementById("result-rate");
  const newSessionBtn = document.getElementById("new-session-btn");
  const historyList = document.getElementById("history-list");

  let sessions = loadSessions();
  let selectedMap = null;
  let highlightIndex = -1;
  let tickId = null;
  let lastResultId = null;

  function loadSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  function createId() {
    return "ses_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function parseGold(value) {
    const cleaned = String(value).replace(/[^\d-]/g, "");
    if (cleaned === "" || cleaned === "-") return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function formatGold(value) {
    return new Intl.NumberFormat("id-ID").format(value);
  }

  function formatGoldInput(input) {
    const raw = input.value;
    const cursor = input.selectionStart || 0;
    const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, "").length;
    const negative = raw.trim().charAt(0) === "-";
    const digits = raw.replace(/\D/g, "");

    if (!digits) {
      input.value = negative ? "-" : "";
      return;
    }

    const formatted = (negative ? "-" : "") + formatGold(Number(digits));
    input.value = formatted;

    let seen = 0;
    let nextCursor = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted.charAt(i))) {
        seen += 1;
        if (seen === digitsBeforeCursor) {
          nextCursor = i + 1;
          break;
        }
      }
    }
    if (!digitsBeforeCursor) nextCursor = negative ? 1 : 0;
    input.setSelectionRange(nextCursor, nextCursor);
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSec % 60).padStart(2, "0");
    return hours + ":" + minutes + ":" + seconds;
  }

  function currentElapsed(session) {
    if (!session) return 0;
    var ms = session.elapsedMs || 0;
    if (session.status === "running" && session.runningSince) {
      ms += Date.now() - new Date(session.runningSince).getTime();
    }
    return Math.max(0, ms);
  }

  function activeSession() {
    return sessions.find(function (session) {
      return session.status === "running" || session.status === "paused";
    }) || null;
  }

  function finishedSessions() {
    return sessions
      .filter(function (session) {
        return session.status === "finished";
      })
      .sort(function (a, b) {
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
  }

  function goldPerHour(gained, elapsedMs) {
    if (!elapsedMs) return 0;
    return gained / (elapsedMs / 3600000);
  }

  function filterMaps(query) {
    const q = query.trim().toLowerCase();
    if (!q) return MAPS.slice();
    return MAPS.filter(function (map) {
      return map.name.toLowerCase().indexOf(q) !== -1 || map.level.toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderMapList() {
    const matches = filterMaps(mapSearch.value);
    mapList.innerHTML = "";

    if (!matches.length) {
      const empty = document.createElement("li");
      empty.textContent = "No maps found.";
      empty.setAttribute("aria-disabled", "true");
      mapList.appendChild(empty);
      highlightIndex = -1;
      return;
    }

    if (highlightIndex >= matches.length) highlightIndex = matches.length - 1;

    matches.forEach(function (map, index) {
      const item = document.createElement("li");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", index === highlightIndex ? "true" : "false");
      item.innerHTML =
        "<span>" + escapeHtml(map.name) + "</span><span class=\"level\">" + escapeHtml(map.level) + "</span>";
      item.addEventListener("mousedown", function (event) {
        event.preventDefault();
        chooseMap(map);
      });
      mapList.appendChild(item);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openMapList() {
    renderMapList();
    mapList.hidden = false;
    mapSearch.setAttribute("aria-expanded", "true");
  }

  function closeMapList() {
    mapList.hidden = true;
    mapSearch.setAttribute("aria-expanded", "false");
    highlightIndex = -1;
  }

  function chooseMap(map) {
    selectedMap = map;
    mapSearch.value = map.name;
    mapHint.textContent = map.name + " · " + map.level;
    mapHint.classList.add("ok");
    startBtn.disabled = parseGold(startingGoldInput.value) === null;
    closeMapList();
  }

  function syncStartButton() {
    startBtn.disabled = !selectedMap || parseGold(startingGoldInput.value) === null;
  }

  function showView(name) {
    setupView.hidden = name !== "setup";
    runningView.hidden = name !== "running";
    resultView.hidden = name !== "result";
  }

  function stopTick() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function startTick() {
    stopTick();
    tickId = setInterval(function () {
      const session = activeSession();
      if (!session) {
        stopTick();
        return;
      }
      timerEl.textContent = formatDuration(currentElapsed(session));
    }, 250);
  }

  function renderRunning(session) {
    activeMap.textContent = session.mapName;
    activeStartGold.textContent = formatGold(session.startingGold);
    timerEl.textContent = formatDuration(currentElapsed(session));
    const paused = session.status === "paused";
    timerStatus.textContent = paused ? "Paused" : "Running";
    timerStatus.classList.toggle("paused", paused);
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    finishForm.hidden = true;
    finishError.hidden = true;
    endingGoldInput.value = "";
    showView("running");
    if (paused) stopTick();
    else startTick();
  }

  function renderResult(session) {
    resultMap.textContent = session.mapName;
    resultDuration.textContent = "Duration " + formatDuration(session.elapsedMs);
    const gained = session.goldGained;
    resultGained.textContent = (gained > 0 ? "+" : "") + formatGold(gained);
    resultGained.classList.toggle("negative", gained < 0);
    resultRate.textContent = formatGold(Math.round(session.goldPerHour));
    resultRate.classList.toggle("negative", session.goldPerHour < 0);
    showView("result");
    stopTick();
  }

  function renderHistory() {
    const items = finishedSessions();
    if (!items.length) {
      historyList.innerHTML = '<p class="muted empty">No finished sessions yet.</p>';
      return;
    }

    historyList.innerHTML = items
      .map(function (session) {
        const gained = session.goldGained;
        const sign = gained > 0 ? "+" : "";
        return (
          '<article class="history-item">' +
          "<span><strong>" +
          escapeHtml(session.mapName) +
          '</strong><span class="sub">' +
          new Date(session.startedAt).toLocaleString() +
          "</span></span>" +
          "<span>" +
          formatDuration(session.elapsedMs) +
          '<span class="sub">Duration</span></span>' +
          "<span>" +
          sign +
          formatGold(gained) +
          '<span class="sub">Gold earned</span></span>' +
          "<span>" +
          formatGold(Math.round(session.goldPerHour)) +
          '<span class="sub">Gold / hour</span></span>' +
          "</article>"
        );
      })
      .join("");
  }

  function startSession() {
    const startingGold = parseGold(startingGoldInput.value);
    if (!selectedMap || startingGold === null) return;

    sessions.forEach(function (session) {
      if (session.status === "running" || session.status === "paused") {
        session.status = "finished";
        session.endingGold = session.startingGold;
        session.elapsedMs = currentElapsed(session);
        session.goldGained = 0;
        session.goldPerHour = 0;
        session.runningSince = null;
      }
    });

    const session = {
      id: createId(),
      mapName: selectedMap.name,
      startingGold: startingGold,
      endingGold: null,
      startedAt: new Date().toISOString(),
      elapsedMs: 0,
      runningSince: new Date().toISOString(),
      status: "running",
      goldGained: null,
      goldPerHour: null,
    };

    sessions.push(session);
    saveSessions();
    lastResultId = null;
    renderRunning(session);
  }

  function togglePause() {
    const session = activeSession();
    if (!session) return;

    if (session.status === "running") {
      session.elapsedMs = currentElapsed(session);
      session.runningSince = null;
      session.status = "paused";
    } else {
      session.runningSince = new Date().toISOString();
      session.status = "running";
    }

    saveSessions();
    renderRunning(session);
  }

  function finishSession() {
    const session = activeSession();
    if (!session) return;
    const endingGold = parseGold(endingGoldInput.value);
    if (endingGold === null) {
      finishError.hidden = false;
      return;
    }

    session.elapsedMs = currentElapsed(session);
    session.runningSince = null;
    session.endingGold = endingGold;
    session.goldGained = endingGold - session.startingGold;
    session.goldPerHour = goldPerHour(session.goldGained, session.elapsedMs);
    session.status = "finished";
    saveSessions();
    lastResultId = session.id;
    renderResult(session);
    renderHistory();
  }

  function resetSetup() {
    selectedMap = null;
    mapSearch.value = "";
    startingGoldInput.value = "";
    mapHint.textContent = "Pick a map from the list to start.";
    mapHint.classList.remove("ok");
    startBtn.disabled = true;
    closeMapList();
    showView("setup");
  }

  mapSearch.addEventListener("focus", openMapList);
  mapSearch.addEventListener("input", function () {
    if (selectedMap && mapSearch.value !== selectedMap.name) {
      selectedMap = null;
      mapHint.textContent = "Pick a map from the list to start.";
      mapHint.classList.remove("ok");
    }
    syncStartButton();
    openMapList();
  });
  mapSearch.addEventListener("keydown", function (event) {
    const matches = filterMaps(mapSearch.value);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMapList();
      highlightIndex = Math.min(matches.length - 1, highlightIndex + 1);
      renderMapList();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMapList();
      highlightIndex = Math.max(0, highlightIndex - 1);
      renderMapList();
    } else if (event.key === "Enter") {
      if (!mapList.hidden && highlightIndex >= 0 && matches[highlightIndex]) {
        event.preventDefault();
        chooseMap(matches[highlightIndex]);
      }
    } else if (event.key === "Escape") {
      closeMapList();
    }
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("#map-combobox")) closeMapList();
  });

  startingGoldInput.addEventListener("input", function () {
    formatGoldInput(startingGoldInput);
    syncStartButton();
  });
  endingGoldInput.addEventListener("input", function () {
    formatGoldInput(endingGoldInput);
    finishError.hidden = true;
  });

  setupForm.addEventListener("submit", function (event) {
    event.preventDefault();
    startSession();
  });

  pauseBtn.addEventListener("click", togglePause);
  finishBtn.addEventListener("click", function () {
    finishForm.hidden = false;
    endingGoldInput.focus();
  });
  cancelFinishBtn.addEventListener("click", function () {
    finishForm.hidden = true;
    finishError.hidden = true;
  });
  confirmFinishBtn.addEventListener("click", finishSession);
  endingGoldInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") finishSession();
  });
  newSessionBtn.addEventListener("click", resetSetup);

  renderHistory();

  const current = activeSession();
  if (current) {
    renderRunning(current);
  } else if (lastResultId) {
    const last = sessions.find(function (session) {
      return session.id === lastResultId;
    });
    if (last) renderResult(last);
    else showView("setup");
  } else {
    showView("setup");
  }
})();
