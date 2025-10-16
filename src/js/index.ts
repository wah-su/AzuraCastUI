import { tryCatch } from "./tryCatch";

const stationTemplate = document.getElementById("StationLinkTemplate");
const songTemplate = document.getElementById("SongTemplate");
const playButton = document.getElementById("playButton");
const volumeSlider = document.getElementById("volumeSlider");
let updatePlayTimer;
const BASE_URL = process.env.BUN_PUBLIC_BASE_URL;

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
    link.children[0].dataset.name = station.name;
    link.children[0].setAttribute("id", `station_${station.id}`);
    //@ts-ignore
    stationSelectContainer.appendChild(link);

    const activeStation = getActiveStation();
    if (activeStation && activeStation == station.id) {
      setStation(null, activeStation);
    } else {
      setStation(null, 1);
    }
  });

  return true;
}

function setStation(current: number | null, next: number) {
  const lastLink = document.getElementById(`station_${current}`);
  const newLink = document.getElementById(`station_${next}`);
  if (lastLink) {
    lastLink.style = "--link-opacity:75%;";
    lastLink.dataset.active = "false";
  }
  if (newLink) {
    newLink.style = "--link-opacity:100%;";
    newLink.dataset.active = "true";
  }
  fetchStationNowPlaying(next);
  setActiveStation(next);

  if (playButton.dataset.active == "true") {
    playButton.children[0].classList.toggle("hidden");
    playButton.children[1].classList.toggle("hidden");
    playButton.dataset.active = "false";
  }

  const prevEl = document.querySelector("audio");
  if (prevEl) {
    prevEl.pause();
    prevEl.remove();
  }
}

function secondsToMinutes(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getPlayDate(seconds: number) {
  let secs = computeElapsedTime(seconds);

  if (secs <= 0) {
    secs *= -1;
    return `in ${secondsToMinutes(secs)} minutes`;
  } else {
    return `${secondsToMinutes(secs)} minutes ago`;
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

  const backgroundCover = document.getElementById("backgroundCover");
  const playerCover = document.getElementById("playerCover");
  const playerProgress = document.getElementById("playerProgress");
  const playerTimerStart = document.getElementById("playerTimerStart");
  const playerTimerTotal = document.getElementById("playerTimerTotal");
  const playerTitle = document.getElementById("playerTitle");
  const playerArtist = document.getElementById("playerArtist");

  // @ts-ignore
  backgroundCover.src = data.now_playing.song.art;
  // @ts-ignore
  playerCover.src = data.now_playing.song.art;
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
    if (index > 1) return;

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
      prevEl.remove();
    }
  } else {
    playButton.children[0].classList.toggle("hidden");
    playButton.children[1].classList.toggle("hidden");
    playButton.dataset.active = "true";
    const el = document.createElement("audio");
    const sr = data.station.hls_url;
    document.querySelector("body").appendChild(el);
    const hls = new Hls();
    hls.loadSource(sr);
    hls.attachMedia(el);
    el.volume = volumeSlider.value / 100;
    el.play();
  }
}

function changeVolume() {
  const el = document.querySelector("audio");
  if (el) {
    el.volume = volumeSlider.value / 100;
  }

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

  localStorage.setItem("volume", String(volumeSlider.value));
}

async function onload() {
  if (!(await getAndPopulateStations())) return;
  // @ts-ignore
  playButton.addEventListener("click", toggleRadio);
  volumeSlider.value = getVolume();
  volumeSlider.addEventListener("change", changeVolume);

  setInterval(() => {
    updateTimestamps();
  }, 1000);
}

onload();
