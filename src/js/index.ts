// import { tryCatch } from "./tryCatch";
import { getAndPopulateStations, toggleRadio } from "./player";
import {
  getElementById,
  getVolume,
  setBackgroundRandomPos,
  setVolume,
  updateTimestamps,
} from "./utils";

function onload() {
  setBackgroundRandomPos();
  setInterval(() => {
    setBackgroundRandomPos();
  }, 5000);

  const volumeSlider = getElementById<HTMLInputElement>("volumeSlider");
  if (!volumeSlider) {
    console.error("No volume slider found!");
  } else {
    volumeSlider.value = String(getVolume());
    setVolume();
    volumeSlider.addEventListener("change", setVolume);
  }

  getAndPopulateStations();

  setInterval(() => {
    updateTimestamps();
  }, 1000);

  const playButton = getElementById<HTMLButtonElement>("playButton");
  if (!playButton) {
    console.error("No play button found!");
    return;
  }
  playButton.addEventListener("click", toggleRadio);
}

onload();
