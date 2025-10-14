import { tryCatch } from "./tryCatch";

const stationTemplate = document.getElementById("StationLinkTemplate")

function setActiveStation(id) {
    localStorage.setItem("station_id", id)
}

function getActiveStation() {
    localStorage.getItem("station_id") || null
}

async function getAndPopulateStations() {
    const stationSelectContainer = document.getElementById("stationSelectContainer");
    const { data: stationRequest } = await tryCatch(fetch("http://192.168.100.10:8098/api/stations"));
    if (!stationRequest) {
        console.error("Failed to fetch station list");
        return false;
    };
    const data = await stationRequest.json();

    data.forEach((station, index) => {
        const link = stationTemplate.content.cloneNode(true);
        link.children[0].textContent = station.name;
        link.children[0].dataset.stationId = station.id;
        link.children[0].dataset.stationShortcode = station.shortcode;
        link.children[0].dataset.name = station.name;
        link.children[0].setAttribute("id", `station_${station.id}`);
        stationSelectContainer.appendChild(link);

        if (getActiveStation() && getActiveStation() == station.id) {
            setStation(null, getActiveStation());
        } else {
            setStation(null, 1);
        };
    });

    return true;
}

function setStation(current, next) {
    const lastLink = document.getElementById(`station_${current}`);
    const newLink = document.getElementById(`station_${next}`);
    if (lastLink) lastLink.style = "--link-opacity:75%;";
    newLink.style = "--link-opacity:100%;";
    fetchStationNowPlaying(next);
    setActiveStation(next);
}

function secondsToMinutes(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds - (mins * 60)
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

async function fetchStationNowPlaying(id) {
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

    backgroundCover.src = data.now_playing.song.art;
    playerCover.src = data.now_playing.song.art;
    playerTimerStart.textContent = secondsToMinutes(data.now_playing.elapsed);
    playerTimerTotal.textContent = secondsToMinutes(data.now_playing.duration);
    playerProgress.style = `--played-percent:${(data.now_playing.elapsed / data.now_playing.duration) * 100}%;`;
    playerTitle.textContent = data.now_playing.song.title;
    playerArtist.textContent = data.now_playing.song.artist;
}

async function onload() {
    if (!await getAndPopulateStations()) return;
}

onload()