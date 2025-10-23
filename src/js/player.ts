import { tryCatch } from "./tryCatch";
import {
  computeElapsedTime,
  extractCoverColorsAndSetBackgroundColors,
  getActiveStation,
  getAllElementByQuery,
  getElementById,
  getElementByQuery,
  getVolume,
  removeAllChildNodes,
  secondsToMinutes,
  setActiveStation,
  updateTimestamps,
} from "./utils";
import Hls from "hls.js";

const BASE_URL = process.env.BUN_PUBLIC_BASE_URL;
let hls: Hls | null = null;
let updatePlayTimerInterval: any = null;

export function updatePlayTimer(playedAt: number, duration: number) {
  const playerTimerStart =
    getElementById<HTMLParagraphElement>("playerTimerStart");
  const playerTimerTotal =
    getElementById<HTMLParagraphElement>("playerTimerTotal");
  const playerProgress = getElementById<HTMLDivElement>("playerProgress");
  if (playerTimerStart)
    playerTimerStart.textContent = secondsToMinutes(
      computeElapsedTime(playedAt)
    );
  if (playerTimerTotal)
    playerTimerTotal.textContent = secondsToMinutes(duration);
  if (playerProgress)
    playerProgress.style = `--played-percent:${
      (computeElapsedTime(playedAt) / duration) * 100
    }%;`;
}

export function createSongElement(played_at: number, song: any) {
  const songTemplate = getElementById<HTMLTemplateElement>("SongTemplate");
  if (!songTemplate) {
    console.error("No song template found!");
    return;
  }

  const nextSongTemplate = songTemplate.content.cloneNode(
    true
  ) as HTMLDivElement;
  if (nextSongTemplate.children[0]) {
    if (nextSongTemplate.children[0].children[0]) {
      const img = nextSongTemplate.children[0].children[0] as HTMLImageElement;
      img.src = song.art;
    }

    if (
      nextSongTemplate.children[0].children[1] &&
      nextSongTemplate.children[0].children[1].children[0] &&
      nextSongTemplate.children[0].children[1].children[1] &&
      nextSongTemplate.children[0].children[1].children[2]
    ) {
      const textContainer = nextSongTemplate.children[0]
        .children[1] as HTMLDivElement;
      const playedAt = textContainer.children[0] as HTMLParagraphElement;
      const title = textContainer.children[1] as HTMLParagraphElement;
      const artist = textContainer.children[2] as HTMLParagraphElement;
      playedAt.dataset.playedTimestamp = String(played_at);
      title.textContent = song.title;
      artist.textContent = song.artist;
    }
  }
  return nextSongTemplate;
}

export async function fetchStationNowPlaying(id: number) {
  const { data: stationRequest } = await tryCatch(
    fetch(`${BASE_URL}/nowplaying/${id}`)
  );
  if (!stationRequest) {
    console.error(`Failed to fetch now playing for station ${id}`);
    return false;
  }
  const data = await stationRequest.json();

  const playerCover = getElementById<HTMLImageElement>("playerCover");
  const playerTitle = getElementById<HTMLParagraphElement>("playerTitle");
  const playerArtist = getElementById<HTMLParagraphElement>("playerArtist");

  if (playerCover) playerCover.src = data.now_playing.song.art;
  extractCoverColorsAndSetBackgroundColors();
  if (playerTitle) playerTitle.textContent = data.now_playing.song.title;
  if (playerArtist) playerArtist.textContent = data.now_playing.song.artist;
  updatePlayTimer(data.now_playing.played_at, data.now_playing.duration);

  const services = getAllElementByQuery<HTMLAnchorElement>(
    "[data-service-prefix]"
  );
  if (!services) {
    console.error("No services found!");
  } else {
    services.forEach((element) => {
      element.href = `${element.dataset.servicePrefix}${data.now_playing.song.artist} - ${data.now_playing.song.title}`;
    });
  }

  // @ts-ignore
  if (updatePlayTimerInterval) {
    clearInterval(updatePlayTimerInterval);
  }

  updatePlayTimerInterval = setInterval(() => {
    if (
      data.now_playing.duration -
        computeElapsedTime(data.now_playing.played_at) <=
      0
    ) {
      // @ts-ignore
      clearInterval(this);
      fetchStationNowPlaying(id);
      return;
    }

    updatePlayTimer(data.now_playing.played_at, data.now_playing.duration);
  }, 1000);

  const pageTitle = getElementByQuery<HTMLTitleElement>("title");
  if (pageTitle) {
    pageTitle.textContent = `${data.now_playing.song.artist} - ${data.now_playing.song.title} | ${data.station.name}`;
  }

  const nextSongContainer = getElementById<HTMLDivElement>("nextSongContainer");
  if (nextSongContainer) {
    removeAllChildNodes(nextSongContainer);
    const elem = createSongElement(
      data.playing_next.played_at,
      data.playing_next.song
    );
    if (elem) {
      nextSongContainer.appendChild(elem);
    }
  }

  const historySongContainer = getElementById<HTMLDivElement>(
    "historySongContainer"
  );
  if (historySongContainer) {
    removeAllChildNodes(historySongContainer);
    data.song_history.forEach((song: any, index: number) => {
      if (index > 3) return;
      const elem = createSongElement(song.played_at, song.song);
      if (elem) {
        historySongContainer.appendChild(elem);
      }
    });
  }

  updateTimestamps();
}

function stopMedia() {
  togglePlayIcon("pause");

  const audioElement = getElementByQuery<HTMLAudioElement>("audio");
  if (audioElement) {
    audioElement.pause();
    if (hls) {
      hls.detachMedia();
      hls.destroy();
    }
    audioElement.src = "";
    audioElement.remove();
  }
}

export function setStation(next: number) {
  const newLink = getElementByQuery<HTMLButtonElement>(
    `button[data-station-id="${next}"]`
  );
  const allLinks = getAllElementByQuery<HTMLButtonElement>("[data-station-id]");
  if (allLinks) {
    allLinks.forEach((element) => {
      element.style = "--link-opacity:75%;";
      element.dataset.active = "false";
    });
  }
  if (newLink) {
    newLink.style = "--link-opacity:100%;";
    newLink.dataset.active = "true";
  }

  const playButton = getElementById<HTMLButtonElement>("playButton");
  if (!playButton || !playButton.children[0] || !playButton.children[1]) {
    console.error("No play button found!");
    return;
  }
  if (playButton.dataset.active == "true") {
    playButton.children[0].classList.toggle("hidden");
    playButton.children[1].classList.toggle("hidden");
    playButton.dataset.active = "false";
  }

  stopMedia();
  setActiveStation(next);
  fetchStationNowPlaying(next);
}

export async function getAndPopulateStations() {
  const stationSelectContainer = getElementById<HTMLDivElement>(
    "stationSelectContainer"
  );
  if (!stationSelectContainer) {
    console.error("No station select container found!");
    return false;
  }

  const { data: stationRequest } = await tryCatch(
    fetch(`${BASE_URL}/stations`)
  );
  if (!stationRequest) {
    console.error("Failed to fetch station list");
    return false;
  }

  const data = await stationRequest.json();

  const stationTemplate = getElementById<HTMLTemplateElement>(
    "StationLinkTemplate"
  );
  if (!stationTemplate) {
    console.error("No station template found!");
    return false;
  }

  data.forEach((station: any) => {
    const templ = stationTemplate.content.cloneNode(
      true
    ) as HTMLTemplateElement;
    if (!templ.children[0]) {
      console.error("Failed to clone station select button template!");
      return false;
    }
    const btn = templ.children[0] as HTMLButtonElement;
    btn.textContent = station.name;
    btn.dataset.stationId = station.id;
    btn.dataset.stationShortcode = station.shortcode;
    btn.dataset.stationName = station.name;
    btn.setAttribute("id", `station_${station.id}`);
    stationSelectContainer.appendChild(btn);
  });

  setStation(getActiveStation());

  const stations = getAllElementByQuery<HTMLButtonElement>("[data-station-id]");
  if (!stations) {
    console.error("No stations found!");
    return false;
  }

  stations.forEach((station) => {
    if (!station.dataset.stationId) {
      console.error("No station id found for button:", station);
      return;
    }
    const { stationId } = station.dataset;
    station.addEventListener("click", () => {
      setStation(parseInt(stationId));
    });
  });
}

function togglePlayIcon(state: "play" | "pause") {
  const playButton = getElementById<HTMLButtonElement>("playButton");
  if (!playButton || !playButton.children[0] || !playButton.children[1]) {
    console.error("No play button found!");
    return;
  }

  const PauseIcon = playButton.children[0];
  const PlayIcon = playButton.children[1];

  switch (state) {
    case "play":
      PlayIcon.classList.remove("hidden");
      PauseIcon.classList.add("hidden");
      break;
    case "pause":
      PlayIcon.classList.add("hidden");
      PauseIcon.classList.remove("hidden");
      break;
  }
}

export async function toggleRadio() {
  const activeStationId = getElementByQuery<HTMLButtonElement>(
    "button[data-active='true']"
  );

  if (!activeStationId) {
    console.error("No active station found!");
    return false;
  }

  const { data: stationRequest } = await tryCatch(
    fetch(`${BASE_URL}/nowplaying/${activeStationId.dataset.stationId}`)
  );
  if (!stationRequest) {
    console.error(
      `Failed to fetch now playing for station ${activeStationId.dataset.stationId}`
    );
    return false;
  }
  const data = await stationRequest.json();

  const playButton = getElementById<HTMLButtonElement>("playButton");
  if (!playButton) {
    console.error("No play button found!");
    return false;
  }

  let audioElement = getElementByQuery<HTMLAudioElement>("audio");

  if (audioElement) {
    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  } else {
    const el = document.createElement("audio");
    const sr = data.station.hls_url;
    el.addEventListener("play", () => {
      el.currentTime = el.duration;
      togglePlayIcon("play");
    });
    el.addEventListener("pause", () => {
      togglePlayIcon("pause");
    });

    const bodyEl = getElementByQuery<HTMLBodyElement>("body");
    if (bodyEl) {
      bodyEl.appendChild(el);
      hls = new Hls();
      hls.loadSource(sr);
      hls.attachMedia(el);
      el.volume = getVolume() / 100;
      el.play();
      togglePlayIcon("play");
    }
  }
}
