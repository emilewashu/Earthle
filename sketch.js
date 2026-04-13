// ================== GLOBAL STATE ==================
let countries;
let input;
let baseMap;
let font;
let pauseButton;
let findButton;
let timer = 0;

let selectedCountry = "";
let targetCountry = "";
let prevDistance = null;
let feedback = "";
let gameState = "start";
let gameOverTime = 0;
let numGuesses = 0;
let scoreFeedback = "";
let prevGuesses = [];

let zoom = 1;
let panX = 0;
let panY = 0;
let targetZoom = 1;
let targetPanX = 0;
let targetPanY = 0;
let pulse = 0;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let buttonClickSound;

let countryInfo = null;
let showingLearn = false;
let suggestionsDiv;
let countryList = [];

let challengeMode = false;
let guessLimit = 5;
let timeLimit = 60;
let challengeGuessInput;
let challengeTimeInput;

let homeMusic;
let gameMusic;
let endMusic;

let angle = 0;
let targetAngle = 0;

// ================== SETUP ==================
function preload() {
  countries = loadJSON("assets/custom.geo.json");
  baseMap = loadImage("assets/earth_upscaled.jpg");
  font = loadFont("assets/font.otf");
  buttonClickSound = loadSound("assets/click.mp3");
  homeMusic = loadSound("assets/homemusic.mp3");
  gameMusic = loadSound("assets/gamemusic.mp3");
  endMusic = loadSound("assets/endmusic.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  input = createInput();
  input.position(windowWidth / 2 - 120, 10);
  input.attribute("placeholder", "Enter a country name...");
  input.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleGuess();
      suggestionsDiv.html("");
    }
  });
  input.input(updateSuggestions);

  suggestionsDiv = createDiv();
  suggestionsDiv.position(input.x, input.y + input.height);
  suggestionsDiv.style("background", "#111");
  suggestionsDiv.style("color", "white");
  suggestionsDiv.style("border", "1px solid #444");
  suggestionsDiv.style("width", input.width + "px");
  suggestionsDiv.style("max-height", "150px");
  suggestionsDiv.style("overflow-y", "auto");

  findButton = createButton("Find");
  findButton.position(input.x + input.width + 10, 10);
  findButton.mousePressed(handleGuess);

  pauseButton = createButton("❚❚");
  pauseButton.position(20, 10);
  pauseButton.mousePressed(() => {
    if (gameState === "playing") {
      gameState = "paused";
    } else if (gameState === "paused") {
      gameState = "playing";
    }
    buttonClickSound.play();
  });
  pauseButton.style("background-color", "grey");
  pauseButton.style("color", "white");

  countrySelect = createSelect();
  countrySelect.position(pauseButton.x + pauseButton.width + 30, 10);
  countrySelect.option("Previous Guesses (0)");
  countrySelect.style("background-color", "#111");
  countrySelect.style("color", "white");
  countrySelect.style("border", "1px solid #444");
  countrySelect.style("padding", "8px");
  countrySelect.style("font-size", "14px");
  countrySelect.style("max-width", "220px");
  countrySelect.style("border-radius", "5px");

  gameState = "start";
  countryList = countries.features.map((f) => f.properties.name).sort();

  homeMusic.setLoop(true);
  homeMusic.play();
}

// ================== DRAW ==================
function draw() {
  background(9, 12, 53);

  zoom = lerp(zoom, targetZoom, 0.04);
  panX = lerp(panX, targetPanX, 0.04);
  panY = lerp(panY, targetPanY, 0.04);

  push();
  translate(width / 2 + panX, height / 2 + panY);
  scale(10 * zoom);
  image(baseMap, -180 / 2, -90 / 2, 360 / 2, 180 / 2);
  pulse += 0.05;
  drawMap();
  pop();

  textFont(font);
  noStroke();
  fill(255);
  textSize(24);
  textAlign(RIGHT, TOP);
  text(feedback, width - 20, 20);

  if (gameState === "start") {
    showStartMenu();
  } else if (gameState === "ending") {
    if (millis() - gameOverTime > 3000) {
      gameState = "gameover";
      challengeMode = false;
      calculateScore();
    }
    timer += deltaTime;
    findButton.hide();
    input.hide();
  } else if (gameState === "gameover") {
    showGameOverMenu();
  } else if (gameState === "paused") {
    showPauseMenu();
  } else if (gameState === "playing") {
    if (challengeMode) {
      timer -= deltaTime;
      if (timer <= 0) {
        timer = 0;
        feedback = "Time's up!";
        gameOverTime = millis();
        gameState = "ending";
        fetchCountryInfo(targetCountry);
      }
      if (numGuesses >= guessLimit) {
        feedback = "Out of guesses!";
        gameOverTime = millis();
        gameState = "ending";
        fetchCountryInfo(targetCountry);
      }
    } else {
      timer += deltaTime;
    }
    findButton.show();
    input.show();
    pauseButton.show();
    countrySelect.show();
  } else if (gameState === "challenge") {
    showChallengeSetup();
    findButton.hide();
    input.hide();
    pauseButton.hide();
    countrySelect.hide();
  }

  if (gameState !== "start") {
    drawTimer();
  }
  if (gameState === "playing") {
    drawLegend();
    drawCompass();
  }
}

// ================== SCROLL ZOOM ==================
function mouseWheel(event) {
  let zoomDelta = -event.delta * 0.001;
  let newZoom = targetZoom * (1 + zoomDelta);
  newZoom = constrain(newZoom, 1, 10);

  let mx = mouseX - width / 2 - targetPanX;
  let my = mouseY - height / 2 - targetPanY;

  targetPanX -= (mx * (newZoom - targetZoom)) / targetZoom;
  targetPanY -= (my * (newZoom - targetZoom)) / targetZoom;

  targetZoom = newZoom;
  console.log("Zoom:", targetZoom.toFixed(2));
  return false;
}

// ================== DRAWING ==================
function drawMap() {
  for (const feature of countries.features) {
    const name = normalize(feature.properties.name);
    const fillColor = getCountryColor(name);

    fill(fillColor);
    if (selectedCountry && name === selectedCountry) {
      stroke(0);
      strokeWeight(0.02);
      drawGeometry(feature.geometry, true);
    } else {
      stroke(0, 0, 0, 30);
      strokeWeight(0.02);
      drawGeometry(feature.geometry);
    }
  }
}

function getCountryColor(name) {
  const baseColor = color(159, 193, 100, 0);

  const guess = prevGuesses.find((g) => g.name === name);

  if (!guess) return baseColor;

  if (name === targetCountry) {
    return color(11, 218, 81);
  }

  const d = guess.distance;
  if (d == null) return baseColor;

  return getHeatColor(d);
}

function drawLegend() {
  let boxSize = 18;
  let padding = 8;
  let startX = 20;
  let startY = height - 20;

  let legendItems = [
    { label: "< 500 km", col: color(255, 32, 32, 235) },
    { label: "500–1000 km", col: color(255, 180, 64, 235) },
    { label: "1000–1500 km", col: color(255, 200, 80, 235) },
    { label: "1500–2500 km", col: color(220, 210, 120, 235) },
    { label: "2500–3500 km", col: color(180, 200, 150, 235) },
    { label: "3500–5000 km", col: color(100, 160, 255, 235) },
    { label: "5000–6000 km", col: color(80, 140, 255, 235) },
    { label: "6000–7500 km", col: color(64, 120, 255, 235) },
    { label: "7500–9000 km", col: color(64, 90, 255, 235) },
    { label: "> 9000 km", col: color(0, 0, 255, 235) },
  ];

  let totalHeight = legendItems.length * (boxSize + padding);

  fill(0, 200);
  noStroke();
  rect(startX + 67, startY - totalHeight + 125, 150, totalHeight + 25, 8);

  textSize(14);
  textAlign(LEFT, CENTER);

  for (let i = 0; i < legendItems.length; i++) {
    let item = legendItems[i];
    let y = startY - i * (boxSize + padding);

    // box
    fill(item.col);
    stroke(0);
    rect(startX + 20, y - boxSize / 2 - 10, boxSize, boxSize);

    // label
    noStroke();
    fill(255);
    text(item.label, startX + boxSize + 25, y - 19);
  }
}

function drawCompass() {
  resetMatrix();

  let size = 70;
  let margin = 20;

  let cx = width - size - margin;
  let cy = height - size - margin;

  push();
  translate(cx, cy);

  angle = lerp(angle, targetAngle, 0.1);

  // Background circle
  fill(0, 100);
  stroke(255);
  ellipse(0, 0, size);

  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);

  text("N", 0, -size / 2 - 12);
  text("E", size / 2 + 12, 0);
  text("S", 0, size / 2 + 12);
  text("W", -size / 2 - 12, 0);

  // Arrow
  push();
  rotate(angle);
  stroke(255);
  strokeWeight(2);
  line(0, 0, 0, -size / 2 + 10);

  fill(255);
  triangle(-5, -size / 2 + 15, 5, -size / 2 + 15, 0, -size / 2 + 5);
  pop();

  pop();
}

function getHeatColor(d) {
  if (d < 500) return color(255, 32, 32, 235);
  if (d < 1000) return color(255, 180, 64, 235);
  if (d < 1500) return color(255, 200, 80, 235);
  if (d < 2500) return color(220, 210, 120, 235);
  if (d < 3500) return color(180, 200, 150, 235);
  if (d < 5000) return color(100, 160, 255, 235);
  if (d < 6000) return color(80, 140, 255, 235);
  if (d < 7500) return color(64, 120, 255, 235);
  if (d < 9000) return color(64, 90, 255, 235);
  return color(0, 0, 255, 235);
}

// ================== INPUT & GAME LOGIC ==================
function updateSuggestions() {
  const value = input.value().toLowerCase();

  suggestionsDiv.html("");

  if (value.length === 0) return;

  const matches = countryList.filter((c) => c.toLowerCase().includes(value));

  matches.slice(0, 8).forEach((match) => {
    const option = createDiv(match);
    option.parent(suggestionsDiv);
    option.style("padding", "6px");
    option.style("cursor", "pointer");

    option.mouseOver(() => option.style("background", "#333"));
    option.mouseOut(() => option.style("background", "#111"));

    option.mousePressed(() => {
      input.value(match);
      suggestionsDiv.html("");
      buttonClickSound.play();
      handleGuess();
    });
  });
}

function showStartMenu() {
  resetMatrix();
  rectMode(CORNER);

  fill(0, 0, 0, 220);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);

  textSize(70);
  text("Earthle", width / 2, height / 2 - 150);

  textSize(22);

  let boxWidth = width * 0.7;
  let boxX = width / 2 - boxWidth / 2;

  text(
    "Your goal is to guess which country it is using as few guesses as possible. Each incorrect guess will appear on the globe with a color indicating how close it is to the Mystery Country. The hotter the color, the closer you are to the answer.",
    boxX,
    height / 2 - 180,
    boxWidth,
    300
  );

  drawPlayButton(width / 2, height / 2 + 90);
  drawChallengeButton(width / 2, height / 2 + 160);

  findButton.hide();
  input.hide();
  pauseButton.hide();
  countrySelect.hide();
}

function showPauseMenu() {
  resetMatrix();
  rectMode(CORNER);

  fill(0, 0, 0, 220);
  noStroke();
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("PAUSED", width / 2, height / 2);

  findButton.hide();
  input.hide();
}

function showChallengeSetup() {
  resetMatrix();
  rectMode(CORNER);

  fill(0, 0, 0, 220);
  noStroke();
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("Challenge Mode", width / 2, height / 2 - 210);

  textSize(22);
  text("Max Guesses: " + guessLimit, width / 2, height / 2 - 100);

  drawMenuButton("-", width / 2 - 160, height / 2 - 100, color(180, 50, 50));
  drawMenuButton("+", width / 2 + 160, height / 2 - 100, color(50, 150, 80));

  textAlign(CENTER, CENTER);
  textSize(22);
  fill(255);
  text("Time Limit: " + timeLimit + "s", width / 2, height / 2 - 20);

  drawMenuButton("-", width / 2 - 160, height / 2 - 20, color(180, 50, 50));
  drawMenuButton("+", width / 2 + 160, height / 2 - 20, color(50, 150, 80));

  drawPlayButton(width / 2, height / 2 + 120);
  drawMenuButton("HOME", width / 2, height / 2 + 180, color(128, 128, 128));
}

function showChallengeMenu() {
  gameState = "challenge";
}

function showGameOverMenu() {
  resetMatrix();
  rectMode(CORNER);
  fill(0, 0, 0, 220);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);

  if (showingLearn) {
    // ──- Learn panel ────
    textSize(36);
    text(
      "About " + (countryInfo ? countryInfo.name : targetCountry),
      width / 2,
      height / 2 - 200
    );

    if (countryInfo) {
      textSize(20);
      let lines = [
        "Capital: " + countryInfo.capital,
        "Population: " + countryInfo.population,
        "Region: " + countryInfo.region + " — " + countryInfo.subregion,
        "Area: " + countryInfo.area,
        "Currency: " + countryInfo.currencies,
        "Languages: " + countryInfo.languages,
      ];
      for (let i = 0; i < lines.length; i++) {
        text(lines[i], width / 2, height / 2 - 110 + i * 36);
      }
      drawingContext.save();
      drawingContext.font = "40px sans-serif";
      drawingContext.fillText(
        countryInfo.flag,
        width / 2,
        height / 2 - 100 + lines.length * 36
      );
      drawingContext.restore();
    } else {
      textSize(18);
      text("Couldn't find country data...", width / 2, height / 2);
    }

    drawPlayButton(width / 2, height / 2 + 180);
  } else {
    textSize(42);
    text("Game Over!", width / 2, height / 2 - 90);

    textSize(24);
    text(scoreFeedback, width / 2, height / 2 - 20);

    drawMenuButton("LEARN", width / 2, height / 2 + 60, color(70, 160, 220));
  }

  findButton.hide();
  input.hide();
}

function drawMenuButton(label, x, y, col) {
  fill(col);
  rectMode(CENTER);
  noStroke();
  rect(x, y, 150, 50, 10);
  fill(0);
  textSize(20);
  textAlign(CENTER, CENTER);
  text(label, x, y);
}

function drawPlayButton(x, y) {
  fill(50, 200, 100);
  rectMode(CENTER);
  rect(x, y, 150, 50, 10);

  fill(0);
  textSize(20);
  text("PLAY", x, y);
}

function drawChallengeButton(x, y) {
  fill(230, 0, 0);
  rectMode(CENTER);
  rect(x, y, 150, 50, 10);

  fill(0);
  textSize(20);
  text("CHALLENGE", x, y);
}

function startGame() {
  let savedTimer = challengeMode ? timer : 0;
  timer = savedTimer;
  prevDistance = null;
  feedback = "";
  selectedCountry = "";
  numGuesses = 0;
  prevGuesses = [];
  countrySelect.html("");
  countrySelect.option("Previous Guesses (0)");
  countrySelect.elt.options[0].disabled = true;

  targetCountry = normalize(random(countries.features).properties.name);
  console.log("Mystery Country:", targetCountry);

  gameState = "playing";
  recenterView();

  homeMusic.stop();
  endMusic.stop();

  if (gameMusic.isPlaying()) {
    gameMusic.stop();
  }
  gameMusic.setLoop(true);
  gameMusic.play();
}

function calculateScore() {
  let seconds = floor(timer / 1000);

  let guessScore = max(0, 1000 - (numGuesses - 1) * 50);

  let timeBonus = max(0, floor(map(seconds, 30, 300, 500, 0)));

  let totalScore = guessScore + timeBonus;

  scoreFeedback = ` ${totalScore} pts  |  ${numGuesses} guesses  |  ${formatTime(
    timer
  )}`;
}

function updateGuessDropdown() {
  countrySelect.html("");

  countrySelect.option("Previous Guesses (" + prevGuesses.length + ")");
  countrySelect.elt.options[0].disabled = true;

  for (let i = prevGuesses.length - 1; i >= 0; i--) {
    const g = prevGuesses[i];
    const label =
      g.name.charAt(0).toUpperCase() +
      g.name.slice(1) +
      "  —  " +
      g.distance +
      " km";
    countrySelect.option(label);
  }

  //sort options
  let options = Array.from(countrySelect.elt.options).slice(1);
  options.sort((a, b) => {
    let d1 = parseInt(a.text.split("—")[1]);
    let d2 = parseInt(b.text.split("—")[1]);
    return d1 - d2;
  });
  options.forEach((opt) => countrySelect.elt.appendChild(opt));
}

function handleGuess() {
  buttonClickSound.play();
  const guess = normalize(input.value());
  const d = getBorderDistance(targetCountry, guess);

  if (d !== null) {
    zoomToCountry(guess);
    numGuesses++;

    prevGuesses.push({ name: guess, distance: Math.round(d) });
    updateGuessDropdown();
  }

  const guessPos = getCountryWorldPos(guess);
  const targetPos = getCountryWorldPos(targetCountry);

  if (guessPos[0] !== null && targetPos[0] !== null) {
    const angle = geoBearing(
      guessPos[1],
      guessPos[0],
      targetPos[1],
      targetPos[0]
    );

    targetAngle = radians(angle);
  }

  if (guess === targetCountry) {
    setTimeout(() => {
      homeMusic.stop();
      gameMusic.stop();

      endMusic.setLoop(true);
      endMusic.play();
    }, 3000);

    feedback = "You found it!";
    selectedCountry = guess;
    gameOverTime = millis();
    gameState = "ending";
    countryInfo = null;
    showingLearn = false;
    fetchCountryInfo(targetCountry);
    input.value("");
    return;
  }

  feedback = evaluateGuess(d);
  prevDistance = d;
  selectedCountry = guess;

  input.value("");
  print(feedback);
}

function evaluateGuess(d) {
  if (d === null) return "Country not found!";
  if (d === 0) return "This country borders the target! You're very close!";
  if (prevDistance === null && d > 0)
    return "First guess! " + Math.round(d) + " km away.";
  if (d < prevDistance) return "Hotter! " + Math.round(d) + " km";
  if (d > prevDistance) return "Colder! " + Math.round(d) + " km";
  return "Same distance! " + Math.round(d) + " km";
}

function drawTimer() {
  textFont(font);
  textSize(20);
  textAlign(RIGHT, CENTER);

  let x = input.x - 10;
  let y = input.y + input.height / 2;

  let timeText = challengeMode
    ? formatTime(timer) + "  |  Guesses: " + numGuesses + "/" + guessLimit
    : formatTime(timer);

  if (challengeMode && timer < 10000) {
    fill(255, 80, 80);
  } else {
    fill(255);
  }

  let padding = 6;
  let w = textWidth(timeText) + padding * 2;
  let h = 24;

  rectMode(CENTER);
  fill(0);
  noStroke();
  rect(x - w / 2, y, w + 10, h + 10, 5);

  if (challengeMode && timer < 10000) {
    fill(255, 80, 80);
  } else {
    fill(255);
  }
  text(timeText, x - 5, y);
}

function fetchCountryInfo(countryName) {
  let url =
    "https://restcountries.com/v3.1/name/" +
    encodeURIComponent(countryName) +
    "?fullText=true";
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      if (data && data.length > 0) {
        const c = data[0];
        countryInfo = {
          name: c.name.common,
          capital: c.capital ? c.capital[0] : "N/A",
          population: c.population.toLocaleString(),
          region: c.region,
          subregion: c.subregion || "N/A",
          area: c.area ? c.area.toLocaleString() + " km²" : "N/A",
          currencies: c.currencies
            ? Object.values(c.currencies)
                .map((x) => x.name)
                .join(", ")
            : "N/A",
          languages: c.languages
            ? Object.values(c.languages).join(", ")
            : "N/A",
          flag: c.flag || "",
        };
      }
    })
    .catch(() => {
      countryInfo = null;
    });
}
// ================== GEOMETRY ==================
function drawGeometry(geometry, isPulsing = false) {
  if (geometry.type === "Polygon") {
    drawPolygon(geometry.coordinates, isPulsing);
  } else if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      drawPolygon(poly, isPulsing);
    }
  }
}

function drawPolygon(coords, isPulsing = false) {
  let cx = 0,
    cy = 0,
    totalPoints = 0;

  if (isPulsing) {
    for (const ring of coords) {
      for (const [x, y] of ring) {
        cx += x * 0.5;
        cy += -y * 0.5;
        totalPoints++;
      }
    }
    cx /= totalPoints;
    cy /= totalPoints;
  }

  let minScale = 1;
  let maxScale = 1.05;
  let scaleFactor = map(sin(pulse), -1, 1, minScale, maxScale);

  for (const ring of coords) {
    beginShape();
    for (const [x, y] of ring) {
      if (isPulsing) {
        vertex(
          cx + (x * 0.5 - cx) * scaleFactor,
          cy + (-y * 0.5 - cy) * scaleFactor
        );
      } else {
        vertex(x * 0.5, -y * 0.5);
      }
    }
    endShape(CLOSE);
  }
}
function geoBearing(lat1, lon1, lat2, lon2) {
  const φ1 = radians(lat1);
  const φ2 = radians(lat2);
  const λ1 = radians(lon1);
  const λ2 = radians(lon2);

  const y = sin(λ2 - λ1) * cos(φ2);
  const x = cos(φ1) * sin(φ2) - sin(φ1) * cos(φ2) * cos(λ2 - λ1);

  let brng = atan2(y, x);
  brng = degrees(brng);
  return (brng + 360) % 360;
}
// ================== DATA HELPERS ==================
function normalize(name) {
  return name.trim().toLowerCase();
}

function findCountry(name) {
  return (
    countries.features.find((f) => normalize(f.properties.name) === name) ||
    null
  );
}

function formatTime(ms) {
  let totalSeconds = floor(ms / 1000);
  let minutes = floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;

  return minutes + ":" + nf(seconds, 2);
}

function mousePressed() {
  userStartAudio();
  if (!homeMusic.isPlaying() && gameState === "start") {
    homeMusic.play();
  }
  if (gameState === "start" || gameState === "gameover") {
    let playY =
      gameState === "start"
        ? height / 2 + 90
        : showingLearn
        ? height / 2 + 270
        : height / 2 + 120;
    let bx = width / 2;

    if (
      mouseX > bx - 60 &&
      mouseX < bx + 60 &&
      mouseY > playY - 25 &&
      mouseY < playY + 25
    ) {
      showingLearn = false;
      startGame();
      buttonClickSound.play();

      homeMusic.stop();
      endMusic.stop();

      gameMusic.setLoop(true);
      gameMusic.play();
      return;
    }

    let challengeY = height / 2 + 160;

    if (
      mouseX > bx - 75 &&
      mouseX < bx + 75 &&
      mouseY > challengeY - 25 &&
      mouseY < challengeY + 25
    ) {
      console.log("CHALLENGE pressed");

      gameState = "challenge";
      buttonClickSound.play();

      return;
    }

    if (gameState === "gameover" && !showingLearn) {
      let ly = height / 2 + 40;
      if (
        mouseX > bx - 60 &&
        mouseX < bx + 60 &&
        mouseY > ly - 25 &&
        mouseY < ly + 25
      ) {
        showingLearn = true;
        buttonClickSound.play();

        return;
      }
    }

    if (gameState === "gameover" && showingLearn) {
      let by2 = height / 2 + 200;
      if (
        mouseX > bx - 60 &&
        mouseX < bx + 60 &&
        mouseY > by2 - 25 &&
        mouseY < by2 + 25
      ) {
        showingLearn = false;
        startGame();
        buttonClickSound.play();
        return;
      }
    }
  }
  if (gameState === "challenge") {
    let bx = width / 2;

    if (mouseY > height / 2 - 125 && mouseY < height / 2 - 75) {
      if (mouseX > bx - 220 && mouseX < bx - 100) {
        guessLimit = max(1, guessLimit - 1);
        buttonClickSound.play();
        return;
      } else if (mouseX > bx + 100 && mouseX < bx + 220) {
        guessLimit = min(20, guessLimit + 1);
        buttonClickSound.play();
        return;
      }
    }

    if (mouseY > height / 2 - 45 && mouseY < height / 2 + 5) {
      if (mouseX > bx - 220 && mouseX < bx - 100) {
        timeLimit = max(10, timeLimit - 10);
        buttonClickSound.play();
        return;
      } else if (mouseX > bx + 100 && mouseX < bx + 220) {
        timeLimit = min(300, timeLimit + 10);
        buttonClickSound.play();
        return;
      }
    }

    if (
      mouseX > bx - 75 &&
      mouseX < bx + 75 &&
      mouseY > height / 2 + 95 &&
      mouseY < height / 2 + 145
    ) {
      challengeMode = true;
      timer = timeLimit * 1000;
      startGame();
      buttonClickSound.play();
      return;
    }

    if (
      mouseX > bx - 60 &&
      mouseX < bx + 60 &&
      mouseY > height / 2 + 155 &&
      mouseY < height / 2 + 205
    ) {
      gameState = "start";
      challengeMode = false;
      buttonClickSound.play();
      return;
    }

    return;
  }

  isDragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseDragged() {
  if (!isDragging) return;

  let dx = mouseX - lastMouseX;
  let dy = mouseY - lastMouseY;

  targetPanX += dx;
  targetPanY += dy;

  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseReleased() {
  isDragging = false;
}

function keyPressed() {
  if (key === "r" || key === "R") {
    recenterView();
  }
}

// ================== DISTANCE ==================
function geoDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    sin(dLat / 2) ** 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2) ** 2;
  return R * 2 * atan2(sqrt(a), sqrt(1 - a));
}

function getBorderDistance(name1, name2) {
  const c1 = findCountry(name1);
  const c2 = findCountry(name2);
  if (!c1 || !c2) return null;

  const points1 = getAllPoints(c1);
  const points2 = getAllPoints(c2);

  let minDist = Infinity;
  for (const [lon1, lat1] of points1) {
    for (const [lon2, lat2] of points2) {
      const d = geoDistance(lat1, lon1, lat2, lon2);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

function getAllPoints(feature) {
  const geom = feature.geometry;
  const points = [];
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) points.push(...ring);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates)
      for (const ring of poly) points.push(...ring);
  }
  return points;
}

function zoomToCountry(name) {
  const feature = findCountry(name);
  if (!feature) return;

  const points = getAllPoints(feature);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const [x, y] of points) {
    let wx = x / 2;
    let wy = -y / 2;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy;
    if (wy > maxY) maxY = wy;
  }

  let cx = (minX + maxX) / 2;
  let cy = (minY + maxY) / 2;

  let bboxW = maxX - minX;
  let bboxH = maxY - minY;

  const padding = 0.6;
  let zoomX = (width * padding) / (bboxW * 10);
  let zoomY = (height * padding) / (bboxH * 10);

  targetZoom = constrain(min(zoomX, zoomY), 1, 10);
  targetPanX = -cx * 10 * targetZoom;
  targetPanY = -cy * 10 * targetZoom;
}

function getCountryWorldPos(name) {
  const feature = findCountry(name);
  if (!feature) return [null, null];

  const points = getAllPoints(feature);
  let sumX = 0,
    sumY = 0;
  for (const [x, y] of points) {
    sumX += x / 2;
    sumY += -y / 2;
  }
  return [sumX / points.length, sumY / points.length];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function recenterView() {
  targetZoom = 1;
  targetPanX = 0;
  targetPanY = 0;
}
