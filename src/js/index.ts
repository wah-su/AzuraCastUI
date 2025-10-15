import { tryCatch } from "./tryCatch";

const stationTemplate = document.getElementById("StationLinkTemplate")
const songTemplate = document.getElementById("SongTemplate")

function setActiveStation(id: number) {
    localStorage.setItem("station_id", String(id))
}

function getActiveStation() {
    return localStorage.getItem("station_id") ? Number(localStorage.getItem("station_id")) : null
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

async function getAndPopulateStations() {
    const stationSelectContainer = document.getElementById("stationSelectContainer");
    const { data: stationRequest } = await tryCatch(fetch("http://192.168.100.10:8098/api/stations"));
    if (!stationRequest) {
        console.error("Failed to fetch station list");
        return false;
    };
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

        const activeStation = getActiveStation()
        if (activeStation && activeStation == station.id) {
            setStation(null, activeStation);
        } else {
            setStation(null, 1);
        };
    });

    return true;
}

function setStation(current: number | null, next: number) {
    const lastLink = document.getElementById(`station_${current}`);
    const newLink = document.getElementById(`station_${next}`);
    if (lastLink) lastLink.style = "--link-opacity:75%;";
    if (newLink) newLink.style = "--link-opacity:100%;";
    fetchStationNowPlaying(next);
    setActiveStation(next);
}

function secondsToMinutes(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds - (mins * 60)
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function getPlayDate(seconds: number) {
    const dateObject = new Date(seconds * 1000);
    return dateObject.toLocaleTimeString();
}

async function fetchStationNowPlaying(id: number) {
    const { data: stationRequest } = await tryCatch(fetch(`http://192.168.100.10:8098/api/nowplaying/${id}`));
    if (!stationRequest) {
        console.error(`Failed to fetch now playing for station ${id}`);
        return false;
    };
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
    playerTimerStart.textContent = secondsToMinutes(data.now_playing.elapsed);
    // @ts-ignore
    playerTimerTotal.textContent = secondsToMinutes(data.now_playing.duration);
    // @ts-ignore
    playerProgress.style = `--played-percent:${(data.now_playing.elapsed / data.now_playing.duration) * 100}%;`;
    // @ts-ignore
    playerTitle.textContent = data.now_playing.song.title;
    // @ts-ignore
    playerArtist.textContent = data.now_playing.song.artist;

    //@ts-ignore
    const nextSongContainer = document.getElementById("nextSongContainer");
    //@ts-ignore
    const nextSong = songTemplate.content.cloneNode(true);
    nextSong.children[0].children[0].src = data.playing_next.song.art;
    nextSong.children[0].children[1].children[0].textContent = getPlayDate(data.playing_next.cued_at);
    nextSong.children[0].children[1].children[1].textContent = data.playing_next.song.title;
    nextSong.children[0].children[1].children[2].textContent = data.playing_next.song.artist;
    //@ts-ignore
    removeAllChildNodes(nextSongContainer)
    //@ts-ignore
    nextSongContainer.appendChild(nextSong);

    const historySongContainer = document.getElementById("historySongContainer");
    removeAllChildNodes(historySongContainer)
    data.song_history.forEach((song: any, index: number) => {
        if (index > 1) return;

        //@ts-ignore
        const histSong = songTemplate.content.cloneNode(true);
        histSong.children[0].children[0].src = song.song.art;
        histSong.children[0].children[1].children[0].textContent = getPlayDate(song.played_at);
        histSong.children[0].children[1].children[1].textContent = song.song.title;
        histSong.children[0].children[1].children[2].textContent = song.song.artist;
        //@ts-ignore
        historySongContainer.appendChild(histSong)
    })
}

async function onload() {
    if (!await getAndPopulateStations()) return;
}

onload()