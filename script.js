"use client";

const characterElement = document.getElementById("character");
const mapElement = document.getElementById("map");
const stepCounter = document.getElementById("step-counter");
const distanceCounter = document.getElementById("distance-counter");
const addressDisplay = document.getElementById("address-display");
const centerButton = document.getElementById("centerMapOnCharacter"); // Button zum Zentrieren

let character = {
  lat: 52.4857, // Startkoordinaten für den Charakter
  lng: 13.3885,
  speed: 0.00005, // Geschwindigkeit der Bewegung
  steps: 0, // Schrittzähler
  distance: 0, // Fiktive Distanz in Metern
};

let fetchCounter = 0; // Zähler für Fetch-Anfragen
let isFetching = false; // Flag, um zu verhindern, dass Fetch-Anfragen ausgeführt werden
const FETCH_LIMIT = 3; // Maximale Anzahl der Fetch-Anfragen
const FETCH_TIMEOUT = 5000; // Timeout für Fetch-Anfragen (5 Sekunden)

let stepTimeout; // Timer für das Abwarten nach dem Loslassen der Pfeiltaste

// Farben für Marker je nach Geschäftstyp
const markerColors = {
  restaurant: "orange",
  cafe: "lightblue",
  shop: "green",
  default: "red",
};

// Leaflet-Karteninitialisierung
const map = L.map(mapElement).setView([character.lat, character.lng], 18); // Zoomlevel auf 18 setzen

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Marker für den Hauptcharakter hinzufügen
const characterMarker = L.marker([character.lat, character.lng], {
  color: "lightyellow", // Hauptcharakter Marker in hellgelb
  radius: 15,
}).addTo(map);

// Geolocation-Funktion
function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function showPosition(position) {
  character.lat = position.coords.latitude;
  character.lng = position.coords.longitude;
  updateCharacterPosition();
  fetchAddress(); // Initiale Adressabfrage
  fetchNearbyShops(character.lat, character.lng); // Geschäfte in der Nähe abrufen
}

function showError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert("Benutzer hat die Anfrage nach Standortverfolgung abgelehnt.");
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Standortinformationen sind nicht verfügbar.");
      break;
    case error.TIMEOUT:
      alert("Die Anfrage nach Standortverfolgung hat zu lange gedauert.");
      break;
    case error.UNKNOWN_ERROR:
      alert("Ein unbekannter Fehler ist aufgetreten.");
      break;
  }
}

// Funktion, um den Hauptcharakter auf der Karte zu zeichnen
function updateCharacterPosition() {
  characterMarker.setLatLng([character.lat, character.lng]);
  map.setView([character.lat, character.lng], 18); // Karte auf die aktuelle Position zentrieren
  fetchNearbyShops(character.lat, character.lng); // Geschäfte in der Nähe abrufen
}

// Funktion zur Abfrage der Adresse
function fetchAddress() {
  const currentTime = Date.now();
  if (isFetching) {
    console.log("Fetch-Anfrage für Adresse wird blockiert, warte auf Timeout.");
    return; // Blockiere weitere Fetch-Anfragen
  }

  // Überprüfen, ob die maximale Anzahl der Fetch-Anfragen erreicht wurde
  if (fetchCounter >= FETCH_LIMIT) {
    const timeSinceLastFetch = currentTime - lastFetchTime;
    if (timeSinceLastFetch < FETCH_TIMEOUT) {
      console.log(
        "Maximale Anzahl von Fetch-Anfragen für Adresse erreicht. Warte 5 Sekunden."
      );
      return; // Warten, wenn der Timeout noch nicht abgelaufen ist
    } else {
      console.log(
        "Timeout abgelaufen, Fetch-Anfragen für Adresse zurücksetzen."
      );
      fetchCounter = 0; // Zähler zurücksetzen
    }
  }

  // Fetch-Anfrage durchführen
  fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${character.lat}&lon=${character.lng}&format=json`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data && data.display_name) {
        addressDisplay.innerText = `Aktuelle Adresse: ${data.display_name}`;
        console.log(`Adresse abgerufen: ${data.display_name}`);
      }
    })
    .catch((error) => console.error("Fehler beim Abrufen der Adresse:", error))
    .finally(() => {
      fetchCounter++;
      lastFetchTime = Date.now();
      console.log(`Fetch-Anfrage ${fetchCounter} für Adresse durchgeführt.`);
      isFetching = true; // Setze das Flag, dass ein Fetch läuft
      setTimeout(() => {
        isFetching = false; // Nach dem Timeout wieder erlauben
        console.log("Fetch-Anfragen für Adresse sind jetzt wieder erlaubt.");
      }, FETCH_TIMEOUT);
    });
}

// Funktion, um Geschäfte in der Nähe abzurufen
function fetchNearbyShops(lat, lng) {
  const radius = 500; // Radius in Metern
  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["shop"](around:${radius},${lat},${lng}););out;`; // Korrigierte Abfrage

  fetch(overpassUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.elements.length > 0) {
        console.log("Gefundene Geschäfte in der Nähe:");
        displayNearbyShops(data.elements); // Zeige Geschäfte an
      } else {
        console.log("Keine Geschäfte in der Nähe gefunden.");
      }
    })
    .catch((error) =>
      console.error("Fehler beim Abrufen der Geschäfte:", error)
    );
}

// Funktion zur Anzeige der Geschäfte auf der Karte mit benutzerdefinierten Farben
function displayNearbyShops(shops) {
  shops.forEach((shop) => {
    let color = markerColors[shop.tags.shop] || markerColors.default; // Wähle die Farbe basierend auf dem Geschäftstyp
    L.circleMarker([shop.lat, shop.lon], {
      color: color,
      radius: 10, // Radius für die Marker
    })
      .addTo(map)
      .bindPopup(`<b>${shop.tags.name}</b><br>${shop.tags.shop}`);
  });
}

// Bewegungssteuerung des Hauptcharakters
function moveCharacter(e) {
  let newLat = character.lat;
  let newLng = character.lng;

  switch (e.key) {
    case "ArrowUp":
      newLat += character.speed; // Nach oben bewegen
      break;
    case "ArrowDown":
      newLat -= character.speed; // Nach unten bewegen
      break;
    case "ArrowLeft":
      newLng -= character.speed; // Nach links bewegen
      break;
    case "ArrowRight":
      newLng += character.speed; // Nach rechts bewegen
      break;
  }

  character.lat = newLat;
  character.lng = newLng;
  character.steps += 1; // Schrittzähler erhöhen
  character.distance += character.speed * 10000; // Fiktive Distanz erhöhen (in Metern)

  // Aktualisiere die Anzeige
  stepCounter.innerText = `Schritte: ${character.steps}`;
  distanceCounter.innerText = `Fiktive Distanz: ${character.distance.toFixed(
    2
  )} m`;

  updateCharacterPosition();
}

// Funktion zur Anzeige von Datum und Uhrzeit
function displayDateTime() {
  const now = new Date();
  document.getElementById("date-time").innerText = now.toLocaleString();
}

// Funktion zum Zentrieren der Karte auf den Charakter
function centerMapOnCharacter() {
  map.setView([character.lat, character.lng], 18);
}

document.addEventListener("keydown", moveCharacter);
centerButton.addEventListener("click", centerMapOnCharacter); // Event Listener für den Button

setInterval(() => {
  displayDateTime();
}, 1000); // Aktualisiert die Uhrzeit jede Sekunde

// Initiale Position abrufen
getLocation();
