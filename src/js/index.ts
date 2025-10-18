import { tryCatch } from "./tryCatch";

const stationTemplate = document.getElementById("StationLinkTemplate");
const songTemplate = document.getElementById("SongTemplate");
const playButton = document.getElementById("playButton");
const volumeSlider = document.getElementById("volumeSlider");
let updatePlayTimer;
const BASE_URL = process.env.BUN_PUBLIC_BASE_URL;
let hls;

function setActiveStation(id: number) {
  localStorage.setItem("station_id", String(id));
}

function getActiveStation() {
  return localStorage.getItem("station_id")
    ? Number(localStorage.getItem("station_id"))
    : null;
}

function getVolume() {
  return localStorage.getItem("volume")
    ? Number(localStorage.getItem("volume"))
    : 50;
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

async function getAndPopulateStations() {
  const stationSelectContainer = document.getElementById(
    "stationSelectContainer"
  );
  const { data: stationRequest } = await tryCatch(
    fetch(`${BASE_URL}/stations`)
  );
  if (!stationRequest) {
    console.error("Failed to fetch station list");
    return false;
  }
  const data = await stationRequest.json();

  data.forEach((station: any, index: number) => {
    //@ts-ignore
    const link = stationTemplate.content.cloneNode(true);
    link.children[0].textContent = station.name;
    link.children[0].dataset.stationId = station.id;
    link.children[0].dataset.stationShortcode = station.shortcode;
    link.children[0].dataset.stationName = station.name;
    link.children[0].setAttribute("id", `station_${station.id}`);
    //@ts-ignore
    stationSelectContainer.appendChild(link);
  });

  const activeStation = getActiveStation();
  if (activeStation) {
    setStation(activeStation);
  } else {
    setStation(1);
  }

  document.querySelectorAll("[data-station-id]").forEach((element) => {
    element.addEventListener("click", () => {
      setStation(Number(element.dataset.stationId));
    });
  });

  return true;
}

function setStation(next: number) {
  const newLink = document.querySelector(`button[data-station-id="${next}"]`);
  const allLinks = document.querySelectorAll("[data-station-id]");

  allLinks.forEach((element) => {
    element.style = "--link-opacity:75%;";
    element.dataset.active = "false";
  });

  if (newLink) {
    newLink.style = "--link-opacity:100%;";
    newLink.dataset.active = "true";
  }
  setActiveStation(next);
  fetchStationNowPlaying(next);

  if (playButton.dataset.active == "true") {
    playButton.children[0].classList.toggle("hidden");
    playButton.children[1].classList.toggle("hidden");
    playButton.dataset.active = "false";
  }

  const prevEl = document.querySelector("audio");
  if (prevEl) {
    prevEl.pause();
    hls.detachMedia(prevEl);
    hls.destroy(prevEl);
    prevEl.src = "";
    prevEl.remove();
  }
}

function secondsToMinutes(
  seconds: number,
  minutesPad = 0,
  showMinutes = true,
  showSeconds = true
) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${showMinutes ? String(mins).padStart(minutesPad, "0") : ""}${
    showMinutes && showSeconds ? ":" : ""
  }${showSeconds ? String(secs).padStart(2, "0") : ""}`;
}

function getPlayDate(seconds: number) {
  let secs = computeElapsedTime(seconds);

  if (secs >= -60 && secs < 0) {
    secs *= -1;
    return `Played in ${secs} seconds`;
  } else if (secs < -60) {
    secs *= -1;
    return `Played in ${secondsToMinutes(secs, 2)} minutes`;
  } else if (secs > 0 && secs < 30) {
    return `Ready to play`;
  } else {
    return `${secondsToMinutes(secs, 0, true, false)} minutes ago`;
  }
}

function updateTimestamps() {
  const timestamps = document.querySelectorAll("[data-played-timestamp]");
  timestamps.forEach((element) => {
    element.textContent = getPlayDate(Number(element.dataset.playedTimestamp));
  });
}

function computeElapsedTime(playedAtTimestamp: number) {
  const playedAt = new Date(playedAtTimestamp * 1000);
  const now = new Date();

  return Math.floor((now.getTime() - playedAt.getTime()) / 1000);
}

async function fetchStationNowPlaying(id: number) {
  const { data: stationRequest } = await tryCatch(
    fetch(`${BASE_URL}/nowplaying/${id}`)
  );
  if (!stationRequest) {
    console.error(`Failed to fetch now playing for station ${id}`);
    return false;
  }
  const data = await stationRequest.json();

  const playerCover = document.getElementById("playerCover");
  const playerProgress = document.getElementById("playerProgress");
  const playerTimerStart = document.getElementById("playerTimerStart");
  const playerTimerTotal = document.getElementById("playerTimerTotal");
  const playerTitle = document.getElementById("playerTitle");
  const playerArtist = document.getElementById("playerArtist");

  // @ts-ignore
  playerCover.src = data.now_playing.song.art;
  getCoverColors();
  // @ts-ignore
  playerTimerStart.textContent = secondsToMinutes(
    computeElapsedTime(data.now_playing.played_at)
  );
  // @ts-ignore
  playerTimerTotal.textContent = secondsToMinutes(data.now_playing.duration);
  // @ts-ignore
  playerProgress.style = `--played-percent:${
    (computeElapsedTime(data.now_playing.played_at) /
      data.now_playing.duration) *
    100
  }%;`;
  // @ts-ignore
  playerTitle.textContent = data.now_playing.song.title;
  // @ts-ignore
  playerArtist.textContent = data.now_playing.song.artist;

  document.querySelectorAll("[data-service-prefix]").forEach((element) => {
    const lnk = element as HTMLAnchorElement;
    lnk.href = `${element.dataset.servicePrefix}${data.now_playing.song.artist} - ${data.now_playing.song.title}`;
  });

  if (updatePlayTimer) {
    clearInterval(updatePlayTimer);
  }

  updatePlayTimer = setInterval(() => {
    if (
      data.now_playing.duration -
        computeElapsedTime(data.now_playing.played_at) <=
      0
    ) {
      clearInterval(this);
      fetchStationNowPlaying(id);
      return;
    }

    playerTimerStart.textContent = secondsToMinutes(
      computeElapsedTime(data.now_playing.played_at)
    );
    playerProgress.style = `--played-percent:${
      (computeElapsedTime(data.now_playing.played_at) /
        data.now_playing.duration) *
      100
    }%;`;
  }, 1000);

  //@ts-ignore
  const nextSongContainer = document.getElementById("nextSongContainer");
  //@ts-ignore
  const nextSong = songTemplate.content.cloneNode(true);
  nextSong.children[0].children[0].src = data.playing_next.song.art;
  nextSong.children[0].children[1].children[0].dataset.playedTimestamp =
    data.playing_next.played_at;
  nextSong.children[0].children[1].children[1].textContent =
    data.playing_next.song.title;
  nextSong.children[0].children[1].children[2].textContent =
    data.playing_next.song.artist;
  //@ts-ignore
  removeAllChildNodes(nextSongContainer);
  //@ts-ignore
  nextSongContainer.appendChild(nextSong);

  const historySongContainer = document.getElementById("historySongContainer");
  removeAllChildNodes(historySongContainer);
  data.song_history.forEach((song: any, index: number) => {
    if (index > 3) return;

    //@ts-ignore
    const histSong = songTemplate.content.cloneNode(true);
    histSong.children[0].children[0].src = song.song.art;
    histSong.children[0].children[1].children[0].dataset.playedTimestamp =
      song.played_at;
    histSong.children[0].children[1].children[1].textContent = song.song.title;
    histSong.children[0].children[1].children[2].textContent = song.song.artist;
    //@ts-ignore
    historySongContainer.appendChild(histSong);
  });

  document.querySelector(
    "title"
  ).textContent = `${data.now_playing.song.artist} - ${data.now_playing.song.title} | ${data.station.name}`;

  updateTimestamps();
}

async function toggleRadio() {
  const activeStationId = document.querySelector("button[data-active='true']");
  // @ts-ignore
  const { data: stationRequest } = await tryCatch(
    fetch(`${BASE_URL}/nowplaying/${activeStationId.dataset.stationId}`)
  );
  if (!stationRequest) {
    // @ts-ignore
    console.error(
      `Failed to fetch now playing for station ${activeStationId.dataset.stationId}`
    );
    return false;
  }
  const data = await stationRequest.json();

  if (playButton.dataset.active == "true") {
    playButton.children[0].classList.toggle("hidden");
    playButton.children[1].classList.toggle("hidden");
    playButton.dataset.active = "false";

    const prevEl = document.querySelector("audio");
    if (prevEl) {
      prevEl.pause();
      hls.detachMedia(prevEl);
      hls.destroy(prevEl);
      prevEl.src = "";
      prevEl.remove();
    }
  } else {
    playButton.children[0].classList.toggle("hidden");
    playButton.children[1].classList.toggle("hidden");
    playButton.dataset.active = "true";
    const el = document.createElement("audio");
    const sr = data.station.hls_url;
    document.querySelector("body").appendChild(el);
    hls = new Hls();
    hls.loadSource(sr);
    hls.attachMedia(el);
    el.volume = volumeSlider.value / 100;
    el.play();
  }
}

function changeVolumeIcon() {
  const volumeMuteIcon = document.getElementById("volumeMuteIcon");
  const volumeLowIcon = document.getElementById("volumeLowIcon");
  const volumeHighIcon = document.getElementById("volumeHighIcon");
  if (volumeSlider.value == 0) {
    volumeMuteIcon.classList.remove("hidden");
    volumeLowIcon.classList.add("hidden");
    volumeHighIcon.classList.add("hidden");
  } else if (volumeSlider.value < 50) {
    volumeMuteIcon.classList.add("hidden");
    volumeLowIcon.classList.remove("hidden");
    volumeHighIcon.classList.add("hidden");
  } else {
    volumeMuteIcon.classList.add("hidden");
    volumeLowIcon.classList.add("hidden");
    volumeHighIcon.classList.remove("hidden");
  }
}

function changeVolume() {
  const el = document.querySelector("audio");
  if (el) {
    el.volume = volumeSlider.value / 100;
  }
  changeVolumeIcon();
  localStorage.setItem("volume", String(volumeSlider.value));
}

function getCoverColors() {
  const playerCover = document.getElementById("playerCover");
  const colorThief = new ColorThief();
  if (playerCover.complete) {
    const dominant = colorThief.getColor(playerCover);
    const palette = colorThief.getPalette(playerCover, 9);
    setBackgroundColors([...dominant], [...palette]);
  } else {
    playerCover.addEventListener("load", function () {
      const dominant = colorThief.getColor(playerCover);
      const palette = colorThief.getPalette(playerCover, 9);
      setBackgroundColors([...dominant], [...palette]);
    });
  }
}

function setBackgroundColors([dR, dG, dB]: number[], palette: number[][]) {
  const backgroundDominant = document.getElementById("backgroundDominant");
  backgroundDominant.style.setProperty(
    "--bg-dominant-color",
    `rgb(${dR}, ${dG}, ${dB})`
  );

  document.querySelectorAll("[data-palette-id]").forEach((element, index) => {
    const pR = palette[index][0];
    const pG = palette[index][1];
    const pB = palette[index][2];
    const { x, y } = getRandomPosition();
    element.style.setProperty("--bg-palette-color", `rgb(${pR}, ${pG}, ${pB})`);
    element.style.setProperty("left", `${x}px`);
    element.style.setProperty("top", `${y}px`);
  });
}

function getRandomPosition() {
  const maxX = window.innerWidth * 0.75; // Adjust for element width
  const maxY = window.innerHeight * 0.75; // Adjust for element height

  const randomX = Math.floor(Math.random() * maxX);
  const randomY = Math.floor(Math.random() * maxY);

  return { x: randomX, y: randomY };
}

async function onload() {
  if (!(await getAndPopulateStations())) return;
  // @ts-ignore
  playButton.addEventListener("click", toggleRadio);
  volumeSlider.value = getVolume();
  changeVolumeIcon();
  volumeSlider.addEventListener("change", changeVolume);

  setInterval(() => {
    updateTimestamps();
  }, 1000);

  document.querySelectorAll("[data-palette-id]").forEach((element, index) => {
    const { x, y } = getRandomPosition();
    element.style.setProperty("left", `${x}px`);
    element.style.setProperty("top", `${y}px`);
  });

  setInterval(() => {
    document.querySelectorAll("[data-palette-id]").forEach((element, index) => {
      const { x, y } = getRandomPosition();
      element.style.setProperty("left", `${x}px`);
      element.style.setProperty("top", `${y}px`);
    });
  }, 5000);
}

onload();
