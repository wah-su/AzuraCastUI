import ColorThief from "colorthief";

export function getElementById<T>(id: string): T | null {
  return (document.getElementById(id) as T) || null;
}

export function getElementByQuery<T>(query: string): T | null {
  return (document.querySelector(query) as T) || null;
}

export function getAllElementByQuery<T>(query: string): T[] | null {
  const elements = Array.from(document.querySelectorAll(query)) as T[];
  if (elements.length == 0) {
    return null;
  }
  return elements;
}

export function setActiveStation(id: number): void {
  localStorage.setItem("station_id", String(id));
}

export function getActiveStation(): number {
  const stationId = localStorage.getItem("station_id")
    ? Number(localStorage.getItem("station_id"))
    : null;
  if (!stationId) {
    setActiveStation(1);
    return 1;
  }
  return stationId;
}

function changeVolumeIcon(volume: number): void {
  const elements = getAllElementByQuery<HTMLImageElement>(
    "[data-max-show-volume]"
  );
  if (!elements) {
    console.error("No volume icons found!");
    return;
  }

  for (const element of elements) {
    if (!element.dataset.maxShowVolume) {
      console.error("No max show volume found for element:", element);
      continue;
    }
    if (!element.dataset.minShowVolume) {
      console.error("No min show volume found for element:", element);
      continue;
    }
    if (
      volume > Number(element.dataset.minShowVolume) &&
      volume <= Number(element.dataset.maxShowVolume)
    ) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  }
}

export function getVolume(): number {
  return localStorage.getItem("volume")
    ? Number(localStorage.getItem("volume"))
    : 50;
}

export function setVolume(): void {
  const audioElement = getElementByQuery<HTMLAudioElement>("audio");
  const volumeSlider = getElementById<HTMLInputElement>("volumeSlider");

  if (!volumeSlider) {
    console.error("No volume slider found!");
    return;
  }

  let newVolume = Number(volumeSlider.value);
  if (newVolume > 100) {
    newVolume = 100;
  } else {
    newVolume = Math.max(newVolume, 0);
  }

  if (audioElement) {
    audioElement.volume = newVolume / 100;
  }

  changeVolumeIcon(newVolume);
  localStorage.setItem("volume", String(volumeSlider.value));
}

export function removeAllChildNodes(parent: HTMLElement): void {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

export function secondsToMinutes(
  seconds: number,
  minutesPad: number = 0,
  showMinutes: boolean = true,
  showSeconds: boolean = true
): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${showMinutes ? String(mins).padStart(minutesPad, "0") : ""}${
    showMinutes && showSeconds ? ":" : ""
  }${showSeconds ? String(secs).padStart(2, "0") : ""}`;
}

export function computeElapsedTime(playedAtTimestamp: number): number {
  const playedAt = new Date(playedAtTimestamp * 1000);
  const now = new Date();

  return Math.floor((now.getTime() - playedAt.getTime()) / 1000);
}

export function getPlayTime(seconds: number): string {
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

export function updateTimestamps(): void {
  const timestamps = getAllElementByQuery<HTMLParagraphElement>(
    "[data-played-timestamp]"
  );
  if (!timestamps) {
    console.error("No timestamp elements found!");
    return;
  }

  timestamps.forEach((element) => {
    if (!element.dataset.playedTimestamp) {
      console.error("No played timestamp found for element:", element);
      return;
    }
    element.textContent = getPlayTime(Number(element.dataset.playedTimestamp));
  });
}

export function getRandomPosition(): {
  x: number;
  y: number;
} {
  const maxX = window.innerWidth * 0.75; // Adjust for element width
  const maxY = window.innerHeight * 0.75; // Adjust for element height

  const randomX = Math.floor(Math.random() * maxX);
  const randomY = Math.floor(Math.random() * maxY);

  return { x: randomX, y: randomY };
}

export function setBackgroundRandomPos(): void {
  const elements = getAllElementByQuery<HTMLDivElement>("[data-palette-id]");
  if (!elements) {
    console.error("No bg palette elements found!");
    return;
  }

  elements.forEach((element) => {
    const { x, y } = getRandomPosition();
    element.style.setProperty("left", `${x}px`);
    element.style.setProperty("top", `${y}px`);
  });
}

export function updateBackgroundColors(
  [dR, dG, dB]: number[],
  palette: number[][]
) {
  const backgroundDominant =
    getElementById<HTMLDivElement>("backgroundDominant");
  const backgroundPalettes =
    getAllElementByQuery<HTMLDivElement>("[data-palette-id]");
  if (!backgroundDominant) {
    console.error("No background dominant element found!");
    return;
  } else {
    backgroundDominant.style.setProperty(
      "--bg-dominant-color",
      `rgb(${dR}, ${dG}, ${dB})`
    );
  }

  if (!backgroundPalettes) {
    console.error("No background palette elements found!");
    return;
  } else {
    backgroundPalettes.forEach((element, index) => {
      if (!element.dataset.paletteId) {
        console.error("No palette id found for element:", element);
        return;
      }

      if (!palette[index]) {
        console.error(
          "No palette found for index:",
          index,
          "of element:",
          element
        );
        return;
      }

      const pR = palette[index][0];
      const pG = palette[index][1];
      const pB = palette[index][2];
      element.style.setProperty(
        "--bg-palette-color",
        `rgb(${pR}, ${pG}, ${pB})`
      );
    });
  }
}

export function extractCoverColorsAndSetBackgroundColors() {
  const playerCover = getElementById<HTMLImageElement>("playerCover");
  if (!playerCover) {
    console.error("No player cover found!");
    return;
  }

  const CT = new ColorThief();
  if (playerCover.complete) {
    const dominant = CT.getColor(playerCover);
    const palette = CT.getPalette(playerCover, 9);
    updateBackgroundColors([...dominant], [...palette]);
  } else {
    playerCover.addEventListener("load", function () {
      const dominant = CT.getColor(playerCover);
      const palette = CT.getPalette(playerCover, 9);
      updateBackgroundColors([...dominant], [...palette]);
    });
  }
}
