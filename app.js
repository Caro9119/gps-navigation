import * as maplibregl from "https://unpkg.com/maplibre-gl@6.7.0/dist/maplibre-gl.mjs";

// Position affichée avant de recevoir le GPS : Genève
const positionInitiale = [6.1432, 46.2044];

// Clé publique MapTiler uniquement
const CLE_MAPTILER = "m9nu0ifKbXyas60cQ4hZ";

const CLE_TOMTOM = "QKU2MCkiGwOrt3S3mgmPqop07GyDB6mZ";

// Fond routier actuel
const STYLE_EXPLORE =
  "https://tiles.openfreemap.org/styles/bright";

// Fond satellite avec routes et noms
const STYLE_SATELLITE =
  "https://api.maptiler.com/maps/hybrid-v4/style.json?key=" +
  CLE_MAPTILER;

const STYLE_SWISS =
  "https://api.maptiler.com/maps/ch-swisstopo-lbm/style.json?key=" +
  CLE_MAPTILER;




// Création de la carte MapLibre
const carte = new maplibregl.Map({
  container: "map",

  // L'application démarre avec la vue Satellite
  style: STYLE_SATELLITE,

  center: positionInitiale,
  zoom: 14,
  pitch: 0,
  bearing: 0,
  interactive: true,
  maxPitch: 85,
  canvasContextAttributes: {
    antialias: true
  }
});


// Active explicitement les interactions avec la carte
carte.dragPan.enable();
carte.scrollZoom.enable();
carte.doubleClickZoom.enable();
carte.touchZoomRotate.enable();

// Variable qui contiendra le marqueur de notre position
let marqueurUtilisateur = null;

let elementUtilisateur = null;


let positionUtilisateur = null;
let suiviPositionActif = false;
let premierCentrageEffectue = false;

let navigationActive = false;

// Logo utilisé pendant la navigation
let logoNavigationActuel =
  localStorage.getItem("logoNavigation") ||
  "voiture";

// Copie du dessin SVG actuel de la voiture
let contenuLogoVoiture = "";

let orientationTelephone = null;
let boussoleActive = false;


// Vérifie si le navigateur permet d'utiliser le GPS
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    mettreAJourPosition,
    afficherErreurGPS,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );
} else {
  alert("Le GPS n'est pas disponible sur cet appareil.");
}

// Fonction appelée chaque fois que la position GPS change
function mettreAJourPosition(position) {
  const longitude = position.coords.longitude;
  const latitude = position.coords.latitude;
  const direction = position.coords.heading;

  const coordonnees = [longitude, latitude];

  positionUtilisateur = coordonnees;

  // Au premier signal GPS, ouvre l'application directement autour de
  // l'utilisateur avec une vue assez large pour le panneau moyen.
  if (!premierCentrageEffectue) {
    premierCentrageEffectue = true;

    requestAnimationFrame(function () {
      centrerVueInitiale(coordonnees);
    });
  }
  // Actualise les kilomètres, la durée et l'arrivée
if (coordonneesRouteActive.length > 0) {
  mettreAJourProgressionTrajet(coordonnees);

  if (navigationActive) {
    verifierRecalculItineraire(coordonnees);
  }
}

if (marqueurUtilisateur === null) {
  elementUtilisateur = document.createElement("div");
  elementUtilisateur.className = "marqueur-utilisateur";

  // Petite voiture vue du dessus
  elementUtilisateur.innerHTML = `
    <svg
      viewBox="0 0 40 64"
      aria-hidden="true"
    >
      <path
        d="
          M12 3
          C8 3 6 8 5 15
          L2 45
          C2 54 7 60 14 61
          L26 61
          C33 60 38 54 38 45
          L35 15
          C34 8 32 3 28 3
          Z
        "
        fill="#2563eb"
        stroke="#ffffff"
        stroke-width="3"
      />

      <path
        d="M11 17 L29 17 L32 31 L8 31 Z"
        fill="#bfdbfe"
      />

      <rect
        x="9"
        y="37"
        width="22"
        height="15"
        rx="5"
        fill="#1d4ed8"
      />

      <circle cx="10" cy="54" r="3" fill="#fef08a"/>
      <circle cx="30" cy="54" r="3" fill="#fef08a"/>
    </svg>
  `;

  // Conserve le dessin original de la voiture
    contenuLogoVoiture =
     elementUtilisateur.innerHTML;

// Applique le logo précédemment choisi
    appliquerLogoNavigation();

  marqueurUtilisateur = new maplibregl.Marker({
    element: elementUtilisateur,
    anchor: "center"
  })
    .setLngLat(coordonnees)
    .addTo(carte);
} else {
  marqueurUtilisateur.setLngLat(coordonnees);
}

const orientation =
  navigationActive &&
  typeof orientationTelephone === "number"
    ? orientationTelephone
    : typeof direction === "number"
      ? direction
      : carte.getBearing();

      // Direction réellement fournie par le téléphone
const directionDisponible =
  navigationActive &&
  typeof orientationTelephone === "number"
    ? orientationTelephone
    : typeof direction === "number"
      ? direction
      : null;

// Affiche et oriente le cône bleu
if (
  marqueurUtilisateur !== null &&
  elementUtilisateur !== null
) {
  if (
    typeof directionDisponible === "number" &&
    Number.isFinite(directionDisponible)
  ) {
    elementUtilisateur.classList.add(
      "direction-visible"
    );

    marqueurUtilisateur.setRotation(
      directionDisponible
    );

    marqueurUtilisateur.setRotationAlignment(
      "map"
    );
  } else {
    elementUtilisateur.classList.remove(
      "direction-visible"
    );
  }
}
  // Garde la caméra verrouillée sur le GPS.
  // Pendant la navigation, jumpTo évite que les mises à jour très
  // fréquentes de la boussole de l'iPhone interrompent le recentrage.
if (suiviPositionActif) {
  const optionsCamera = {
    center: coordonnees,
    zoom: navigationActive ? 18.5 : 16,
    pitch:
      modeCarteCompatible3D() && mode3DActif
        ? navigationActive
          ? 65
          : 60
        : 0,
    bearing: orientation,
    offset: [0, 0]
  };

  if (navigationActive) {
    carte.jumpTo(optionsCamera);
  } else {
    carte.easeTo({
      ...optionsCamera,
      duration: 600
    });
  }
}
// Ferme la fonction mettreAJourPosition
}

function centrerVueInitiale(coordonnees) {
  const panneau = document.getElementById(
    "panneau-destination"
  );

  const hauteurPanneauVisible = panneau
    ? Math.max(
        0,
        window.innerHeight -
          panneau.getBoundingClientRect().top
      )
    : 0;

  carte.easeTo({
    center: coordonnees,
    zoom: 14.5,
    pitch: 0,
    bearing: 0,

    // Place l'utilisateur au centre de la partie de carte non masquée.
    offset: [
      0,
      -Math.min(hauteurPanneauVisible / 2, 190)
    ],

    duration: 900
  });
}

// Fonction appelée si la localisation échoue

// Fonction appelée si la localisation échoue
function afficherErreurGPS(erreur) {
  console.error("Erreur GPS :", erreur.message);

  alert(
    "Impossible d'obtenir ta position. Vérifie les autorisations de localisation."
  );
}


// Récupération des éléments créés dans index.html
const formulaireDestination = document.getElementById(
  "formulaire-destination"
);

const champDestination = document.getElementById("destination");

const listeResultats = document.getElementById(
  "resultats-recherche"
);

let minuteurRecherche = null;
let rechercheEnCours = null;

champDestination.addEventListener("input", function () {
  clearTimeout(minuteurRecherche);

  const recherche = champDestination.value.trim();

  if (recherche.length < 3) {
    listeResultats.innerHTML = "";
    listeResultats.hidden = true;
    return;
  }

  afficherMessageRecherche("Recherche en cours…");

  // Court délai : les propositions apparaissent rapidement sans envoyer
  // une requête pour absolument chaque frappe.
  minuteurRecherche = setTimeout(function () {
    rechercherSuggestions(recherche);
  }, 220);
});

// Fonction exécutée lorsqu'on appuie sur le bouton "Itinéraire"
formulaireDestination.addEventListener(
  "submit",
  rechercherDestination
);

async function rechercherDestination(evenement) {
  evenement.preventDefault();

  clearTimeout(minuteurRecherche);

  const recherche = champDestination.value.trim();

  if (recherche.length < 3) {
    afficherMessageRecherche(
      "Écris au moins trois caractères."
    );
    return;
  }

  await rechercherSuggestions(recherche);
}

async function rechercherSuggestions(recherche) {
  // Annule la recherche précédente si elle n'est pas terminée
  if (rechercheEnCours !== null) {
    rechercheEnCours.abort();
  }

  rechercheEnCours = new AbortController();

  try {
    let adresseAPI =
      "https://photon.komoot.io/api/" +
      "?limit=5" +
      "&lang=fr" +
      "&q=" +
      encodeURIComponent(recherche);

    // Favorise les résultats proches de la position actuelle
    if (positionUtilisateur !== null) {
      adresseAPI +=
        "&lon=" +
        positionUtilisateur[0] +
        "&lat=" +
        positionUtilisateur[1];
    }

    const reponse = await fetch(adresseAPI, {
      signal: rechercheEnCours.signal
    });

    if (!reponse.ok) {
      throw new Error(
        "Le service de recherche ne répond pas."
      );
    }

    const donnees = await reponse.json();

    const resultats = donnees.features.map(
      convertirResultatPhoton
    );

    afficherResultatsRecherche(resultats);
  } catch (erreur) {
    // Une recherche annulée est normale lorsqu'on continue à écrire
    if (erreur.name === "AbortError") {
      return;
    }

    console.error("Erreur de recherche :", erreur);

    afficherMessageRecherche(
      "Impossible de rechercher cet endroit."
    );
  }
}

function convertirResultatPhoton(element) {
  const proprietes = element.properties;
  const coordonnees = element.geometry.coordinates;

  const morceauxAdresse = [
    proprietes.name,
    proprietes.housenumber,
    proprietes.street,
    proprietes.postcode,
    proprietes.city,
    proprietes.state,
    proprietes.country
  ];

  // Retire les valeurs vides et les répétitions
  const adresse = morceauxAdresse
    .filter(function (morceau, index, tableau) {
      return (
        morceau &&
        tableau.indexOf(morceau) === index
      );
    })
    .join(", ");

  // Produit le même format que celui attendu
  // par choisirDestination()
  return {
    display_name: adresse || "Destination",
    lon: coordonnees[0],
    lat: coordonnees[1]
  };
}

// Affiche les adresses trouvées
function afficherResultatsRecherche(resultats) {
  listeResultats.innerHTML = "";
  listeResultats.hidden = false;

  if (resultats.length === 0) {
    afficherMessageRecherche("Aucune adresse trouvée.");
    return;
  }

  resultats.forEach(function (resultat) {
    const ligne = document.createElement("li");

    ligne.textContent = resultat.display_name;

    ligne.dataset.longitude = resultat.lon;
    ligne.dataset.latitude = resultat.lat;

    ligne.addEventListener("click", function () {
      choisirDestination(resultat);
    });

    listeResultats.appendChild(ligne);
  });
}

// Affiche un message dans la liste
function afficherMessageRecherche(message) {
  listeResultats.innerHTML = "";
  listeResultats.hidden = false;

  const ligne = document.createElement("li");
  ligne.textContent = message;

  listeResultats.appendChild(ligne);
}

// Éléments utilisés pour afficher les informations du trajet
const informationsTrajet = document.getElementById(
  "informations-trajet"
);

const distanceTrajet = document.getElementById(
  "distance-trajet"
);

const dureeTrajet = document.getElementById(
  "duree-trajet"
);

const heureArrivee = document.getElementById(
  "heure-arrivee"
);

// Informations concernant la route active
let coordonneesRouteActive = [];
let distanceRouteTotale = 0;
let dureeRouteTotale = 0;

// Marqueur placé sur la destination
let marqueurDestination = null;

// Garde l'itinéraire pendant un changement de carte
let derniereGeometrieRoute = null;

// Etat du guidage et des itinéraires alternatifs
let destinationActive = null;
let routesDisponibles = [];
let indexRouteSelectionnee = 0;
// Destinations Maison et Travail enregistrées
let favorisDestination = {};

// Lieux génériques affichés dans Places
let placesEnregistrees = [];

// Trois dernières destinations choisies
let recherchesRecentes = [];
// Étiquettes +X min placées sur les routes alternatives
let etiquettesRoutes = [];
let calculItineraireEnCours = false;
let derniereActualisationTrafic = 0;
let dernierRecalculItineraire = 0;
let compteurPositionsHorsRoute = 0;

const DISTANCE_HORS_ROUTE_METRES = 60;
const POSITIONS_HORS_ROUTE_REQUISES = 3;
const DELAI_MINIMUM_RECALCUL_MS = 30 * 1000;
const INTERVALLE_ACTUALISATION_TRAFIC_MS = 5 * 60 * 1000;


// Exécutée lorsque l'utilisateur sélectionne une adresse
async function choisirDestination(resultat) {
  suiviPositionActif = false;

  const longitude = Number(resultat.lon);
  const latitude = Number(resultat.lat);

  const destination = [longitude, latitude];

  destinationActive = destination;

  champDestination.value = resultat.display_name;
  listeResultats.hidden = true;

  if (positionUtilisateur === null) {
    alert(
      "Ta position GPS n'est pas encore disponible. " +
      "Autorise la localisation puis réessaie."
    );

    return;
  }

  // Pendant le choix du trajet, le panneau ne montre plus les lieux,
  // les récents ni les réglages secondaires.
  panneauDestination.classList.add(
    "itineraire-selectionne"
  );

  // Le résumé du trajet apparaîtra sous la recherche dans le panneau.
  definirPositionPanneau("milieu");

  enregistrerRechercheRecente(resultat);

  // Ajoute ou déplace le marqueur de destination
  if (marqueurDestination === null) {
    marqueurDestination = new maplibregl.Marker({
      color: "#dc2626"
    })
      .setLngLat(destination)
      .addTo(carte);
  } else {
    marqueurDestination.setLngLat(destination);
  }

  await calculerItineraire(positionUtilisateur, destination, {
    cadrer: true,
    afficherChargement: true
  });
}

// Calcule les routes avec le trafic TomTom.
// En cas d'indisponibilité, OSRM prend automatiquement le relais.
async function calculerItineraire(
  depart,
  destination,
  options = {}
) {
  if (calculItineraireEnCours) {
    return;
  }

  const cadrer = options.cadrer !== false;
  const afficherChargement =
    options.afficherChargement !== false;

  calculItineraireEnCours = true;
  destinationActive = destination;

    if (afficherChargement) {
    // Affiche Save et les trois points
    // avant de démarrer le trajet
    boutonSauvegarderTrajet.hidden = false;
    boutonSupprimerItineraire.hidden = false;
}

  try {
    let nouvellesRoutes;

    try {
      nouvellesRoutes = await demanderRoutesTomTom(
        depart,
        destination
      );
    } catch (erreurTomTom) {
      console.warn(
        "TomTom indisponible, utilisation d'OSRM :",
        erreurTomTom
      );

      nouvellesRoutes = await demanderRoutesOSRM(
        depart,
        destination
      );
    }

    // Pendant la navigation, un éventuel recalcul ne doit
    // réafficher ni les alternatives ni leurs durées.
    if (navigationActive && nouvellesRoutes.length > 0) {
      nouvellesRoutes = [nouvellesRoutes[0]];
    }

    routesDisponibles = nouvellesRoutes;
    indexRouteSelectionnee = 0;

    afficherRoutesSurCarte(routesDisponibles);
    selectionnerRoute(0, cadrer);

        
    // Affiche les trois points sous « Démarrer »
    if (afficherChargement) {
    boutonSupprimerItineraire.hidden = false;
    }

    derniereActualisationTrafic = Date.now();
    dernierRecalculItineraire = Date.now();
    compteurPositionsHorsRoute = 0;
  } catch (erreur) {
    console.error("Erreur itinéraire :", erreur);

    if (afficherChargement || routesDisponibles.length === 0) {
      afficherInformations(
        "Itinéraire indisponible",
        "Réessaie dans quelques instants."
      );
    }
  } finally {
    calculItineraireEnCours = false;
  }
}

async function demanderRoutesTomTom(depart, destination) {
  const adresseTomTom =
    "https://api.tomtom.com/routing/1/calculateRoute/" +
    depart[1] +
    "," +
    depart[0] +
    ":" +
    destination[1] +
    "," +
    destination[0] +
    "/json" +
    "?key=" +
    encodeURIComponent(CLE_TOMTOM) +
    "&traffic=true" +
    "&routeType=fastest" +
    "&travelMode=car" +
    "&maxAlternatives=2" +
    "&computeTravelTimeFor=all" +
    "&sectionType=traffic";

  const reponse = await fetch(adresseTomTom);

  if (!reponse.ok) {
    throw new Error(
      "TomTom a répondu avec le code " + reponse.status
    );
  }

  const donnees = await reponse.json();

  if (!donnees.routes || donnees.routes.length === 0) {
    throw new Error("TomTom n'a trouvé aucun itinéraire.");
  }

  return donnees.routes.map(function (route) {
    const coordonnees = [];

    route.legs.forEach(function (etape) {
      etape.points.forEach(function (point) {
        const coordonnee = [
          point.longitude,
          point.latitude
        ];

        const precedente =
          coordonnees[coordonnees.length - 1];

        if (
          !precedente ||
          precedente[0] !== coordonnee[0] ||
          precedente[1] !== coordonnee[1]
        ) {
          coordonnees.push(coordonnee);
        }
      });
    });

    return {
      geometry: {
        type: "LineString",
        coordinates: coordonnees
      },
      distance: route.summary.lengthInMeters,
      duration: route.summary.travelTimeInSeconds,
      trafficDelay:
        route.summary.trafficDelayInSeconds || 0,
      provider: "tomtom"
    };
  });
}

async function demanderRoutesOSRM(depart, destination) {
  const adresseOSRM =
    "https://router.project-osrm.org/route/v1/driving/" +
    depart[0] +
    "," +
    depart[1] +
    ";" +
    destination[0] +
    "," +
    destination[1] +
    "?overview=full" +
    "&geometries=geojson" +
    "&steps=true" +
    "&alternatives=3";

  const reponse = await fetch(adresseOSRM);

  if (!reponse.ok) {
    throw new Error("OSRM ne répond pas.");
  }

  const donnees = await reponse.json();

  if (
    donnees.code !== "Ok" ||
    !donnees.routes ||
    donnees.routes.length === 0
  ) {
    throw new Error("OSRM n'a trouvé aucun itinéraire.");
  }

  return donnees.routes.map(function (route) {
    return {
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      trafficDelay: 0,
      provider: "osrm"
    };
  });
}

function afficherRoutesSurCarte(routes) {
  afficherEtiquettesRoutes(routes);

  const dureeRouteRecommandee =
    routes[0].duration;

  const routesGeoJSON = {
    type: "FeatureCollection",

    features: routes.map(function (route, index) {
      const minutesSupplementaires = Math.max(
        0,
        Math.ceil(
          (route.duration - dureeRouteRecommandee) / 60
        )
      );

      return {
        type: "Feature",

        properties: {
          index: index,

          dureeSupplementaire:
            index === 0
              ? ""
              : "+" + minutesSupplementaires + " min"
        },

        geometry: route.geometry
      };
    })
  };

  // Met à jour les routes si la source existe déjà
  if (carte.getSource("itineraires")) {
    carte
      .getSource("itineraires")
      .setData(routesGeoJSON);

    return;
  }

  carte.addSource("itineraires", {
    type: "geojson",
    data: routesGeoJSON
  });

  // Couche de contour conservée pour la structure, mais rendue invisible :
  // les propositions de trajet n'ont plus de bordure blanche.
  carte.addLayer({
    id: "contours-itineraires",
    type: "line",
    source: "itineraires",

    paint: {
      "line-color": "#ffffff",
      "line-width": 0,
      "line-opacity": 0
    }
  });

  // Routes alternatives grises
  carte.addLayer({
    id: "routes-alternatives",
    type: "line",
    source: "itineraires",

    filter: [
      "!=",
      ["get", "index"],
      indexRouteSelectionnee
    ],

    paint: {
      "line-color": "#6b7280",
      "line-width": 6,
      "line-opacity": 0.9
    }
  });

  // Route actuellement sélectionnée
  carte.addLayer({
    id: "route-selectionnee",
    type: "line",
    source: "itineraires",

    filter: [
      "==",
      ["get", "index"],
      indexRouteSelectionnee
    ],

    paint: {
      "line-color": "#2563eb",
      "line-width": 7,
      "line-opacity": 1
    }
  });

}


// Place les étiquettes +X min sur les routes alternatives
function afficherEtiquettesRoutes(routes) {
  // Supprime les anciennes étiquettes
  etiquettesRoutes.forEach(function (element) {
    element.marqueur.remove();
  });

  etiquettesRoutes = [];

  if (!routes || routes.length < 2) {
    return;
  }

  const dureeRouteRecommandee =
    routes[0].duration;

  routes.forEach(function (route, index) {
    // La route recommandée n'affiche pas +X min
    if (index === 0) {
      return;
    }

    const coordonnees =
      route.geometry.coordinates;

    if (!coordonnees || coordonnees.length === 0) {
      return;
    }

    // Place l'étiquette vers le milieu du trajet
    const positionEtiquette =
      coordonnees[
        Math.floor(coordonnees.length / 2)
      ];

    const minutesSupplementaires = Math.max(
      0,
      Math.ceil(
        (
          route.duration -
          dureeRouteRecommandee
        ) / 60
      )
    );

    // Élément transmis à MapLibre
    const elementMarqueur =
      document.createElement("div");

    elementMarqueur.className =
      "etiquette-route";

    // Fond noir semi-transparent
    const fondNoir =
      document.createElement("div");

    fondNoir.className =
      "fond-etiquette-route";

    // Box intérieure grise ou bleue
    const boxDuree =
      document.createElement("div");

    boxDuree.className =
      "box-duree-route";

    boxDuree.textContent =
      "+" + minutesSupplementaires + " min";

    fondNoir.appendChild(boxDuree);
    elementMarqueur.appendChild(fondNoir);

    // Sélection de la route en touchant l'étiquette
    elementMarqueur.addEventListener(
      "click",
      function (evenement) {
        evenement.preventDefault();
        evenement.stopPropagation();

        selectionnerRoute(index, false);
      }
    );

    const marqueur = new maplibregl.Marker({
      element: elementMarqueur,
      anchor: "center"
    })
      .setLngLat(positionEtiquette)
      .addTo(carte);

    etiquettesRoutes.push({
      index: index,
      marqueur: marqueur,
      element: elementMarqueur
    });
  });

  mettreAJourEtiquettesRoutes();
}

// Change la couleur et la taille selon la route choisie
function mettreAJourEtiquettesRoutes() {
  etiquettesRoutes.forEach(function (etiquette) {
    const estSelectionnee =
      etiquette.index ===
      indexRouteSelectionnee;

    etiquette.element.classList.toggle(
      "route-etiquette-selectionnee",
      estSelectionnee
    );
  });
}

// Sélectionne l'un des itinéraires disponibles
function selectionnerRoute(index, cadrer) {
  const route = routesDisponibles[index];
  

  if (!route) {
    return;
  }

  indexRouteSelectionnee = index;

  // Agrandit et colore l'étiquette choisie
    mettreAJourEtiquettesRoutes();

  

  // La route choisie devient bleue
  if (carte.getLayer("route-selectionnee")) {
    carte.setFilter(
      "route-selectionnee",
      [
        "==",
        ["get", "index"],
        index
      ]
    );
  }

  // Les autres routes deviennent grises
  if (carte.getLayer("routes-alternatives")) {
    carte.setFilter(
      "routes-alternatives",
      [
        "!=",
        ["get", "index"],
        index
      ]
    );
  }

  // La nouvelle route devient la route active
  coordonneesRouteActive =
    route.geometry.coordinates;

  distanceRouteTotale = route.distance;
  dureeRouteTotale = route.duration;
  derniereGeometrieRoute = route.geometry;

  // Actualise les kilomètres, la durée et l'arrivée
  mettreAJourProgressionTrajet(
    positionUtilisateur
  );

  if (!navigationActive) {
    ajusterPanneauAuResumeTrajet();
  }

  // Cadre la totalité du trajet si demandé
  if (cadrer) {
    requestAnimationFrame(function () {
      cadrerItineraire(
        coordonneesRouteActive
      );
    });
  }
}

// Une fois la navigation démarrée, conserve uniquement
// l'itinéraire que l'utilisateur avait sélectionné.
function verrouillerRouteSelectionnee() {
  const routeChoisie =
    routesDisponibles[indexRouteSelectionnee];

  if (!routeChoisie) {
    return;
  }

  // Retire toutes les étiquettes « +X min ».
  etiquettesRoutes.forEach(function (etiquette) {
    etiquette.marqueur.remove();
  });

  etiquettesRoutes = [];

  // La route choisie devient la seule route disponible.
  routesDisponibles = [routeChoisie];
  indexRouteSelectionnee = 0;

  coordonneesRouteActive =
    routeChoisie.geometry.coordinates;
  distanceRouteTotale = routeChoisie.distance;
  dureeRouteTotale = routeChoisie.duration;
  derniereGeometrieRoute = routeChoisie.geometry;

  const sourceItineraires =
    carte.getSource("itineraires");

  if (sourceItineraires) {
    sourceItineraires.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            index: 0,
            dureeSupplementaire: ""
          },
          geometry: routeChoisie.geometry
        }
      ]
    });
  }

  if (carte.getLayer("route-selectionnee")) {
    carte.setFilter("route-selectionnee", [
      "==",
      ["get", "index"],
      0
    ]);
  }

  if (carte.getLayer("routes-alternatives")) {
    carte.setFilter("routes-alternatives", [
      "!=",
      ["get", "index"],
      0
    ]);
  }
}

// Permet de sélectionner une route alternative
// avec une zone tactile suffisamment grande sur téléphone.
carte.on("click", function (evenement) {
  if (!carte.getLayer("routes-alternatives")) {
    return;
  }

  const rayonTactile = 18;

  const zoneTactile = [
    [
      evenement.point.x - rayonTactile,
      evenement.point.y - rayonTactile
    ],
    [
      evenement.point.x + rayonTactile,
      evenement.point.y + rayonTactile
    ]
  ];

  // Recherche uniquement les itinéraires alternatifs.
  // La route bleue actuelle ne peut donc plus bloquer le clic.
  const alternatives = carte.queryRenderedFeatures(
    zoneTactile,
    {
      layers: ["routes-alternatives"]
    }
  );

  if (alternatives.length === 0) {
    return;
  }

  const nouvelIndex = Number(
    alternatives[0].properties.index
  );

  if (
    !Number.isInteger(nouvelIndex) ||
    nouvelIndex === indexRouteSelectionnee
  ) {
    return;
  }

  selectionnerRoute(nouvelIndex, false);
});



// Adapte la carte afin de montrer l'ensemble du trajet
function cadrerItineraire(coordonnees) {
  // Inclut toutes les propositions de trajet, pas uniquement celle qui est
  // sélectionnée, afin qu'aucune alternative ne sorte de l'écran.
  const toutesLesCoordonnees = routesDisponibles
    .flatMap(function (route) {
      return route.geometry && route.geometry.coordinates
        ? route.geometry.coordinates
        : [];
    });

  const coordonneesACadrer =
    toutesLesCoordonnees.length > 0
      ? toutesLesCoordonnees
      : coordonnees;

  const limites = new maplibregl.LngLatBounds(
    coordonneesACadrer[0],
    coordonneesACadrer[0]
  );

  coordonneesACadrer.forEach(function (coordonnee) {
    limites.extend(coordonnee);
  });

  // Réserve en bas l'espace réellement occupé par le panneau.
  const hauteurPanneauVisible = Math.max(
    0,
    panneauDestination.clientHeight -
      translationActuellePanneau
  );

  carte.fitBounds(limites, {
    padding: {
      top: 70,
      right: 45,
      bottom: hauteurPanneauVisible + 45,
      left: 45
    },

    maxZoom: 15.5,
    duration: 1500
  });
}

// Affiche la distance et la durée
function afficherInformations(distance, duree) {
  informationsTrajet.hidden = false;
  distanceTrajet.textContent = distance;
  dureeTrajet.textContent = duree;
}

// Transforme les minutes en texte lisible
function environDuree(minutes) {
  if (minutes < 60) {
    return "Environ " + minutes + " min";
  }

  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;

  return (
    "Environ " +
    heures +
    " h " +
    minutesRestantes +
    " min"
  );
}


// Récupération du bouton de recentrage
const boutonRecentrer = document.getElementById(
  "bouton-recentrer"
);

// Dès que l'utilisateur appuie sur la carte,
// le suivi automatique est désactivé
carte.getCanvas().addEventListener("pointerdown", function () {
  suiviPositionActif = false;
});

// Désactive le suivi pendant un déplacement manuel
carte.on("dragstart", function () {
  suiviPositionActif = false;
});

// Désactive le suivi pendant un zoom manuel
carte.on("zoomstart", function (evenement) {
  if (evenement.originalEvent) {
    suiviPositionActif = false;
  }
});

// Désactive le suivi pendant une rotation manuelle
carte.on("rotatestart", function (evenement) {
  if (evenement.originalEvent) {
    suiviPositionActif = false;
  }
});

// Le bouton réactive volontairement le suivi
boutonRecentrer.addEventListener("click", function () {
  if (positionUtilisateur === null) {
    alert("Ta position GPS n'est pas encore disponible.");
    return;
  }

  // Libère la vue de la carte avant le recentrage. Pendant le guidage,
  // le panneau est déjà entièrement masqué.
  if (!navigationActive) {
    definirPositionPanneau("basse");
  }

  // Réactive le suivi automatique
  suiviPositionActif = true;

  if (navigationActive) {
    // Remet la voiture si nécessaire
    if (elementUtilisateur !== null) {
      elementUtilisateur.classList.add(
        "mode-voiture"
      );
    }

    // Retour immédiat à la vue rapprochée du trajet
    carte.jumpTo({
      center: positionUtilisateur,
      zoom: 18.5,
      pitch:
        modeCarteCompatible3D() && mode3DActif
          ? 65
          : 0,

      bearing:
        orientationTelephone !== null
          ? orientationTelephone
          : carte.getBearing()
    });
  } else {
    // Recentrage normal hors navigation
    carte.easeTo({
      center: positionUtilisateur,
      zoom: 16,
      pitch:
        modeCarteCompatible3D() && mode3DActif
          ? 60
          : 0,
      bearing: carte.getBearing(),
      duration: 600
    });
  }
});

const boutonDemarrer = document.getElementById(
  "bouton-demarrer"
);

function placerInformationsDansPanneau() {
  listeResultats.insertAdjacentElement(
    "afterend",
    informationsTrajet
  );

  informationsTrajet.classList.remove(
    "informations-navigation-active"
  );
}

function placerInformationsEnNavigation() {
  document.querySelector("main").appendChild(
    informationsTrajet
  );

  informationsTrajet.classList.add(
    "informations-navigation-active"
  );
}

const boutonSupprimerItineraire =
  document.getElementById(
    "bouton-supprimer-itineraire"
  );

const boutonSauvegarderTrajet =
  document.getElementById(
    "bouton-sauvegarder-trajet"
  );

const favorisDestinationElement =
  document.getElementById(
    "favoris-destination"
  );

const recherchesRecentesElement =
  document.getElementById(
    "recherches-recentes"
  );

const listePlacesElement =
  document.getElementById(
    "liste-places"
  );

const fenetreSauvegardeFavori =
  document.getElementById(
    "fenetre-sauvegarde-favori"
  );

const nomFavori = document.getElementById(
  "nom-favori"
);

const boutonsLogoFavori =
  document.querySelectorAll(
    ".bouton-logo-favori"
  );

boutonDemarrer.addEventListener(
  "click",
  async function () {
    // Met le trajet en pause
    if (navigationActive) {
      navigationActive = false;
      suiviPositionActif = false;

      boutonPolice.hidden = true;
      boutonPoliceEclair.hidden = true;

      panneauDestination.classList.remove(
        "navigation-en-cours"
      );

      placerInformationsDansPanneau();
      requestAnimationFrame(function () {
        ajusterPanneauAuResumeTrajet();
        cadrerItineraire(coordonneesRouteActive);
      });

      boutonDemarrer.textContent = "Reprendre ?";

      boutonDemarrer.classList.remove(
        "navigation-active"
      );

      boutonDemarrer.classList.add(
        "trajet-en-pause"
      );

      boutonSupprimerItineraire.hidden = false;

      // Remet le point bleu à la place de la voiture
      if (elementUtilisateur !== null) {
        elementUtilisateur.classList.remove(
          "mode-voiture"
        );
      }

      return;
    }

    // Vérifie qu'un itinéraire existe
    if (!carte.getSource("itineraires")) {
      alert("Sélectionne d'abord une destination.");
      return;
    }

    // Vérifie que la position GPS existe
    if (positionUtilisateur === null) {
      alert(
        "Ta position GPS n'est pas encore disponible."
      );
      return;
    }

    await activerBoussole();

    // Active ou reprend la navigation
    navigationActive = true;
    suiviPositionActif = true;

    boutonPolice.hidden = false;
    boutonPoliceEclair.hidden = false;

    if (elementUtilisateur !== null) {
      elementUtilisateur.classList.add(
        "mode-voiture"
      );
    }

    boutonDemarrer.textContent = "Arrêter";

    boutonDemarrer.classList.remove(
      "trajet-en-pause"
    );

    boutonDemarrer.classList.add(
      "navigation-active"
    );

    boutonSauvegarderTrajet.hidden = true;
    boutonSupprimerItineraire.hidden = true;

    // Le résumé quitte le panneau uniquement pendant le guidage.
    placerInformationsEnNavigation();

    // La barre de recherche et tout le panneau inférieur disparaissent.
    panneauDestination.classList.add(
      "navigation-en-cours"
    );

    // Le choix est définitif : retire les autres chemins
    // et leurs étiquettes avant de passer en vue navigation.
    verrouillerRouteSelectionnee();

    // Active immédiatement la vue rapprochée
    carte.jumpTo({
      center: positionUtilisateur,
      zoom: 18.5,
      pitch:
        modeCarteCompatible3D() && mode3DActif
          ? 65
          : 0,

      bearing:
        orientationTelephone !== null
          ? orientationTelephone
          : carte.getBearing()
    });
  }
);

// Suppression complète de l'itinéraire
boutonSupprimerItineraire.addEventListener(
  "click",
  function () {
    navigationActive = false;
    suiviPositionActif = false;

    boutonPolice.hidden = true;
    boutonPoliceEclair.hidden = true;

    placerInformationsDansPanneau();

    panneauDestination.classList.remove(
      "itineraire-selectionne",
      "navigation-en-cours"
    );

    // Remet le symbole normal de position
    if (elementUtilisateur !== null) {
      elementUtilisateur.classList.remove(
        "mode-voiture"
      );
    }
    // Supprime les étiquettes +X min
    etiquettesRoutes.forEach(function (element) {
    element.marqueur.remove();
    });

    etiquettesRoutes = [];
    // Supprime les couches de toutes les routes
    [
    "durees-routes-alternatives",
    "route-selectionnee",
    "routes-alternatives",
    "contours-itineraires"
    ].forEach(function (identifiant) {
      if (carte.getLayer(identifiant)) {
        carte.removeLayer(identifiant);
      }
    });

    if (carte.getSource("itineraires")) {
      carte.removeSource("itineraires");
    }

    // Supprime le marqueur rouge
    if (marqueurDestination !== null) {
      marqueurDestination.remove();
      marqueurDestination = null;
    }

    // Efface les informations mémorisées
    derniereGeometrieRoute = null;
    coordonneesRouteActive = [];
    distanceRouteTotale = 0;
    dureeRouteTotale = 0;
    destinationActive = null;
    routesDisponibles = [];
    indexRouteSelectionnee = 0;
    derniereActualisationTrafic = 0;
    dernierRecalculItineraire = 0;
    compteurPositionsHorsRoute = 0;

    // Efface le champ de destination
    champDestination.value = "";

    listeResultats.innerHTML = "";
    listeResultats.hidden = true;

    // Cache le panneau du trajet
    informationsTrajet.hidden = true;

    // Rétablit l'état initial des boutons
    boutonDemarrer.textContent = "Démarrer";

    boutonDemarrer.classList.remove(
      "navigation-active",
      "trajet-en-pause"
    );

    boutonSauvegarderTrajet.hidden = true;
    fenetreSauvegardeFavori.hidden = true;

    boutonSupprimerItineraire.hidden = true;

    // Remet une vue générale
    if (positionUtilisateur !== null) {
      carte.easeTo({
        center: positionUtilisateur,
        zoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 700
      });
    }
  }
);

const boutonPolice = document.getElementById(
  "bouton-police"
);

const boutonPoliceEclair = document.getElementById(
  "bouton-police-eclair"
);

const boutonListePolice = document.getElementById(
  "bouton-liste-police"
);

const listePointsPoliceElement =
  document.getElementById(
    "liste-points-police"
  );

// Charge les points déjà enregistrés
let pointsPolice = chargerPointsPolice();

// Affiche les anciens points au lancement
pointsPolice.forEach(function (point) {
  creerMarqueurPolice(point);
});

afficherListePointsPolice();

// Complète progressivement les anciens signalements
// qui ne possèdent pas encore d'adresse.
completerAdressesPointsPolice();

boutonListePolice.addEventListener(
  "click",
  function () {
    const doitOuvrir =
      listePointsPoliceElement.hidden;

    listePointsPoliceElement.hidden =
      !doitOuvrir;

    boutonListePolice.setAttribute(
      "aria-expanded",
      String(doitOuvrir)
    );
  }
);

// Ajoute un point à la position GPS actuelle
boutonPolice.addEventListener("click", function () {
  if (positionUtilisateur === null) {
    alert("Ta position GPS n'est pas encore disponible.");
    return;
  }

  ajouterPointPolice(
    positionUtilisateur[0],
    positionUtilisateur[1],
    "police"
  );
});

// Le petit bouton crée un signalement Police de type « éclair ».
boutonPoliceEclair.addEventListener("click", function () {
  if (positionUtilisateur === null) {
    alert("Ta position GPS n'est pas encore disponible.");
    return;
  }

  ajouterPointPolice(
    positionUtilisateur[0],
    positionUtilisateur[1],
    "eclair"
  );
});

function ajouterPointPolice(
  longitude,
  latitude,
  typeSignalement = "police"
) {
  const nouveauPoint = {
    id: Date.now(),
    longitude: longitude,
    latitude: latitude,
    type: typeSignalement === "eclair" ? "eclair" : "police",
    adresse: formaterCoordonneesPolice(
      longitude,
      latitude
    )
  };

  pointsPolice.push(nouveauPoint);

  sauvegarderPointsPolice();
  creerMarqueurPolice(nouveauPoint);
  afficherListePointsPolice();

  mettreAJourAdressePointPolice(nouveauPoint);
}

function creerMarqueurPolice(point) {
  const symbole = document.createElement("div");

  symbole.className =
    point.type === "eclair"
      ? "marqueur-police marqueur-police-eclair"
      : "marqueur-police";
  symbole.textContent = "👮";

  // La fenêtre contient uniquement le bouton Delete
  const contenuPopup = document.createElement("div");
  contenuPopup.className = "contenu-popup-police";

  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.type = "button";
  boutonSupprimer.className = "bouton-supprimer-police";
  boutonSupprimer.textContent = "Delete";

  contenuPopup.appendChild(boutonSupprimer);

  const popup = new maplibregl.Popup({
    offset: 25,
    closeButton: false,
    closeOnClick: true,
    className: "popup-police-sombre"
  }).setDOMContent(contenuPopup);

  const marqueur = new maplibregl.Marker({
    element: symbole,
    anchor: "center"
  })
    .setLngLat([
      point.longitude,
      point.latitude
    ])
    .setPopup(popup)
    .addTo(carte);

  boutonSupprimer.addEventListener(
    "click",
    function (evenement) {
      evenement.preventDefault();
      evenement.stopPropagation();

      pointsPolice = pointsPolice.filter(
        function (pointEnregistre) {
          return pointEnregistre.id !== point.id;
        }
      );

      sauvegarderPointsPolice();

      popup.remove();
      marqueur.remove();
      afficherListePointsPolice();
    }
  );
}

function formaterCoordonneesPolice(longitude, latitude) {
  return (
    Number(latitude).toFixed(5) +
    ", " +
    Number(longitude).toFixed(5)
  );
}

async function rechercherAdressePointPolice(point) {
  const adresseAPI =
    "https://photon.komoot.io/reverse" +
    "?lon=" + encodeURIComponent(point.longitude) +
    "&lat=" + encodeURIComponent(point.latitude) +
    "&lang=fr";

  const reponse = await fetch(adresseAPI);

  if (!reponse.ok) {
    throw new Error("Adresse du signalement indisponible.");
  }

  const donnees = await reponse.json();

  if (!donnees.features || donnees.features.length === 0) {
    throw new Error("Aucune adresse trouvée.");
  }

  const proprietes = donnees.features[0].properties;

  const morceauxAdresse = [
    proprietes.name,
    proprietes.housenumber,
    proprietes.street,
    proprietes.postcode,
    proprietes.city,
    proprietes.state,
    proprietes.country
  ];

  return morceauxAdresse
    .filter(function (morceau, index, tableau) {
      return (
        morceau &&
        tableau.indexOf(morceau) === index
      );
    })
    .join(", ");
}

async function mettreAJourAdressePointPolice(point) {
  try {
    const adresse =
      await rechercherAdressePointPolice(point);

    if (adresse) {
      point.adresse = adresse;
      sauvegarderPointsPolice();
      afficherListePointsPolice();
    }
  } catch (erreur) {
    console.warn(
      "Adresse du signalement Police indisponible :",
      erreur
    );
  }
}

async function completerAdressesPointsPolice() {
  for (const point of pointsPolice) {
    if (point.adresse) {
      continue;
    }

    point.adresse = formaterCoordonneesPolice(
      point.longitude,
      point.latitude
    );

    await mettreAJourAdressePointPolice(point);
  }
}

function afficherListePointsPolice() {
  listePointsPoliceElement.innerHTML = "";

  if (pointsPolice.length === 0) {
    const message = document.createElement("p");
    message.className = "liste-police-vide";
    message.textContent =
      "Aucun signalement enregistré.";

    listePointsPoliceElement.appendChild(message);
    return;
  }

  pointsPolice
    .slice()
    .reverse()
    .forEach(function (point) {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "bouton-point-police";

      const adresse =
        point.adresse ||
        formaterCoordonneesPolice(
          point.longitude,
          point.latitude
        );

      bouton.textContent =
        (point.type === "eclair" ? "⚡ " : "") +
        adresse;

      bouton.addEventListener("click", function () {
        carte.easeTo({
          center: [point.longitude, point.latitude],
          zoom: 17,
          duration: 650
        });
      });

      listePointsPoliceElement.appendChild(bouton);
    });
}

// Sauvegarde les points dans la mémoire de l'appareil
function sauvegarderPointsPolice() {
  localStorage.setItem(
    "pointsPolice",
    JSON.stringify(pointsPolice)
  );
}

// Récupère les points enregistrés précédemment
function chargerPointsPolice() {
  const pointsSauvegardes =
    localStorage.getItem("pointsPolice");

  if (pointsSauvegardes === null) {
    return [];
  }

  try {
    return JSON.parse(pointsSauvegardes);
  } catch (erreur) {
    console.error(
      "Impossible de charger les points Police.",
      erreur
    );

    return [];
  }
}

async function activerBoussole() {
  if (boussoleActive) {
    return true;
  }

  if (!window.DeviceOrientationEvent) {
    console.warn("La boussole n'est pas disponible.");
    return false;
  }

  try {
    // Sur iPhone, l'autorisation doit être demandée
    // après un clic de l'utilisateur
    if (
      typeof DeviceOrientationEvent.requestPermission ===
      "function"
    ) {
      const autorisation =
        await DeviceOrientationEvent.requestPermission();

      if (autorisation !== "granted") {
        alert(
          "L'accès à l'orientation du téléphone a été refusé."
        );

        return false;
      }
    }

    window.addEventListener(
      "deviceorientation",
      mettreAJourOrientationTelephone,
      true
    );

    boussoleActive = true;
    return true;
  } catch (erreur) {
    console.error("Erreur de boussole :", erreur);
    return false;
  }
}

function mettreAJourOrientationTelephone(evenement) {
  let orientation = null;

  // Valeur spécifique et généralement plus fiable sur iPhone
  if (
    typeof evenement.webkitCompassHeading === "number"
  ) {
    orientation = evenement.webkitCompassHeading;
  } else if (typeof evenement.alpha === "number") {
    orientation = 360 - evenement.alpha;
  }

  if (orientation === null) {
    return;
  }

  orientationTelephone = orientation;

  // Sur iPhone, l'événement de boussole peut arriver plusieurs dizaines
  // de fois par seconde. On recentre et on tourne dans la même opération :
  // la rotation ne peut donc plus interrompre le suivi de la position.
if (
  navigationActive &&
  suiviPositionActif &&
  positionUtilisateur !== null
) {
  carte.jumpTo({
    center: positionUtilisateur,
    zoom: 18.5,
    pitch:
      modeCarteCompatible3D() && mode3DActif
        ? 65
        : 0,
    bearing: orientationTelephone,
    offset: [0, 0]
  });
}
}

const boutonsModeCarte = document.querySelectorAll(
  ".bouton-mode-carte"
);

const bouton3D = document.getElementById("bouton-3d");

let modeCarteActuel = "satellite";
let mode3DActif = false;

// Réagit au choix Explore, Satellite ou Swiss
boutonsModeCarte.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    const nouveauMode = bouton.dataset.mode;

    changerModeCarte(nouveauMode);
  });
});

function changerModeCarte(nouveauMode) {
  if (nouveauMode === modeCarteActuel) {
    return;
  }

    let nouveauStyle = STYLE_EXPLORE;

    if (nouveauMode === "satellite") {
    nouveauStyle = STYLE_SATELLITE;
    } else if (nouveauMode === "swiss") {
    nouveauStyle = STYLE_SWISS;
    }

  // La 3D est disponible avec Explore et Satellite.
  // Elle se désactive lors de chaque changement de fond.
  mode3DActif = false;
  modeCarteActuel = nouveauMode;
  mettreAJourBouton3D();

  // Met à jour l'apparence des boutons
  boutonsModeCarte.forEach(function (bouton) {
    bouton.classList.toggle(
      "mode-actif",
      bouton.dataset.mode === nouveauMode
    );
  });

  // Attend le chargement du nouveau fond
  carte.once("style.load", function () {
    // Recrée la route sélectionnée et ses alternatives
    if (routesDisponibles.length > 0) {
      afficherRoutesSurCarte(routesDisponibles);
      selectionnerRoute(indexRouteSelectionnee, false);
    }

    // Les fonds restent plats tant que la 3D Explore n'est pas activée.
    carte.easeTo({
      pitch: 0,
      duration: 650
    });
  });

  // Change le fond de carte
  carte.setStyle(nouveauStyle);
}

function mettreAJourBouton3D() {
  const modeCompatible = modeCarteCompatible3D();

  bouton3D.hidden = !modeCompatible;
  bouton3D.setAttribute(
    "aria-pressed",
    String(modeCompatible && mode3DActif)
  );
}

function modeCarteCompatible3D() {
  return (
    modeCarteActuel === "explore" ||
    modeCarteActuel === "satellite"
  );
}

bouton3D.addEventListener("click", function () {
  if (
    !modeCarteCompatible3D() ||
    !carte.isStyleLoaded()
  ) {
    return;
  }

  mode3DActif = !mode3DActif;

  if (mode3DActif) {
    ajouterBatiments3D();

    carte.easeTo({
      zoom: Math.max(carte.getZoom(), 15.3),
      pitch: navigationActive ? 65 : 60,
      duration: 650
    });
  } else {
    retirerBatiments3D();

    carte.easeTo({
      pitch: 0,
      duration: 650
    });
  }

  mettreAJourBouton3D();
});

function ajouterBatiments3D() {
  const identifiantSource = "batiments-3d-source";
  const identifiantCouche = "batiments-3d";

  if (carte.getLayer(identifiantCouche)) {
    return;
  }

  if (!carte.getSource(identifiantSource)) {
    carte.addSource(identifiantSource, {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet"
    });
  }

  // Place les bâtiments sous les noms de rues et de lieux.
  const couches = carte.getStyle().layers || [];
  const premiereCoucheTexte = couches.find(function (couche) {
    return (
      couche.type === "symbol" &&
      couche.layout &&
      couche.layout["text-field"]
    );
  });

  carte.addLayer(
    {
      id: identifiantCouche,
      source: identifiantSource,
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      filter: ["!=", ["get", "hide_3d"], true],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "render_height"], 0],
          0,
          "#d7d9dd",
          80,
          "#aeb4bd",
          200,
          "#89919d"
        ],
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          0,
          15,
          ["coalesce", ["get", "render_height"], 0]
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14,
          0,
          15,
          ["coalesce", ["get", "render_min_height"], 0]
        ],
        "fill-extrusion-opacity": 0.88
      }
    },
    premiereCoucheTexte
      ? premiereCoucheTexte.id
      : undefined
  );
}

function retirerBatiments3D() {
  const identifiantSource = "batiments-3d-source";
  const identifiantCouche = "batiments-3d";

  if (carte.getLayer(identifiantCouche)) {
    carte.removeLayer(identifiantCouche);
  }

  if (carte.getSource(identifiantSource)) {
    carte.removeSource(identifiantSource);
  }
}

mettreAJourBouton3D();



const surfaceCarte = carte.getCanvas();

let minuteurAppuiLong = null;
let positionDebutAppui = null;
let coordonneesAppuiLong = null;

const dureeAppuiLong = 3000;
const mouvementMaximum = 15;

// Commence à mesurer la durée de l'appui
surfaceCarte.addEventListener(
  "pointerdown",
  function (evenement) {
    // Seulement le bouton gauche de la souris
    // ou un toucher sur téléphone
    if (
      evenement.pointerType === "mouse" &&
      evenement.button !== 0
    ) {
      return;
    }

    const rectangle =
      surfaceCarte.getBoundingClientRect();

    const positionCarte = [
      evenement.clientX - rectangle.left,
      evenement.clientY - rectangle.top
    ];

    positionDebutAppui = {
      x: evenement.clientX,
      y: evenement.clientY
    };

    coordonneesAppuiLong =
      carte.unproject(positionCarte);

    annulerAppuiLong();

    minuteurAppuiLong = setTimeout(function () {
      afficherPropositionItineraire(
        coordonneesAppuiLong
      );

      minuteurAppuiLong = null;
    }, dureeAppuiLong);
  }
);

// Annule si le doigt se déplace
surfaceCarte.addEventListener(
  "pointermove",
  function (evenement) {
    if (
      minuteurAppuiLong === null ||
      positionDebutAppui === null
    ) {
      return;
    }

    const deplacementX =
      evenement.clientX - positionDebutAppui.x;

    const deplacementY =
      evenement.clientY - positionDebutAppui.y;

    const distanceDeplacement = Math.hypot(
      deplacementX,
      deplacementY
    );

    if (distanceDeplacement > mouvementMaximum) {
      annulerAppuiLong();
    }
  }
);

// Annule si le doigt est relâché avant trois secondes
surfaceCarte.addEventListener(
  "pointerup",
  annulerAppuiLong
);

surfaceCarte.addEventListener(
  "pointercancel",
  annulerAppuiLong
);

surfaceCarte.addEventListener(
  "pointerleave",
  annulerAppuiLong
);

// Empêche le menu du navigateur pendant un appui long
surfaceCarte.addEventListener(
  "contextmenu",
  function (evenement) {
    evenement.preventDefault();
  }
);

function annulerAppuiLong() {
  if (minuteurAppuiLong !== null) {
    clearTimeout(minuteurAppuiLong);
    minuteurAppuiLong = null;
  }
}

function afficherPropositionItineraire(coordonnees) {
  const contenu = document.createElement("div");
  contenu.className = "actions-position-selectionnee";

  // Bouton rouge : itinéraire
  const boutonItineraire = document.createElement(
    "button"
  );

  boutonItineraire.type = "button";
  boutonItineraire.className =
    "bouton-itineraire-position";
  boutonItineraire.textContent =
    "Itinéraire vers ici";

  // Bouton bleu : signalement Police
  const boutonPolicePosition = document.createElement(
    "button"
  );

  boutonPolicePosition.type = "button";
  boutonPolicePosition.className =
    "bouton-police-position";
  boutonPolicePosition.textContent = "Police";

  contenu.appendChild(boutonItineraire);
  contenu.appendChild(boutonPolicePosition);

  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: true,
    offset: 12,
    className: "popup-position-sombre"
  })
    .setLngLat([
      coordonnees.lng,
      coordonnees.lat
    ])
    .setDOMContent(contenu)
    .addTo(carte);

  // Calcule un itinéraire vers l'endroit sélectionné
  boutonItineraire.addEventListener(
    "click",
    function () {
      popup.remove();

      choisirDestination({
        display_name: "Point sélectionné sur la carte",
        lon: coordonnees.lng,
        lat: coordonnees.lat
      });
    }
  );

  // Ajoute un signalement Police à l'endroit sélectionné
  boutonPolicePosition.addEventListener(
    "click",
    function () {
      ajouterPointPolice(
        coordonnees.lng,
        coordonnees.lat
      );

      popup.remove();
    }
  );
}

function verifierRecalculItineraire(position) {
  if (
    destinationActive === null ||
    coordonneesRouteActive.length === 0 ||
    calculItineraireEnCours
  ) {
    return;
  }

  const maintenant = Date.now();
  const distanceRoute = distanceMinimaleDepuisRoute(
    position,
    coordonneesRouteActive
  );

  if (distanceRoute > DISTANCE_HORS_ROUTE_METRES) {
    compteurPositionsHorsRoute += 1;
  } else {
    compteurPositionsHorsRoute = 0;
  }

  const peutRecalculer =
    maintenant - dernierRecalculItineraire >=
    DELAI_MINIMUM_RECALCUL_MS;

  if (
    compteurPositionsHorsRoute >=
      POSITIONS_HORS_ROUTE_REQUISES &&
    peutRecalculer
  ) {
    compteurPositionsHorsRoute = 0;

    calculerItineraire(position, destinationActive, {
      cadrer: false,
      afficherChargement: false
    });

    return;
  }

  const traficDoitEtreActualise =
    maintenant - derniereActualisationTrafic >=
    INTERVALLE_ACTUALISATION_TRAFIC_MS;

  if (traficDoitEtreActualise && peutRecalculer) {
    calculerItineraire(position, destinationActive, {
      cadrer: false,
      afficherChargement: false
    });
  }
}

function distanceMinimaleDepuisRoute(position, route) {
  if (route.length === 1) {
    return calculerDistanceMetres(position, route[0]);
  }

  let distanceMinimale = Infinity;

  for (let index = 0; index < route.length - 1; index += 1) {
    const distance = distancePointSegmentMetres(
      position,
      route[index],
      route[index + 1]
    );

    if (distance < distanceMinimale) {
      distanceMinimale = distance;
    }
  }

  return distanceMinimale;
}

function distancePointSegmentMetres(point, debut, fin) {
  const latitudeReference = convertirEnRadians(point[1]);
  const metresParDegreLatitude = 111320;
  const metresParDegreLongitude =
    111320 * Math.cos(latitudeReference);

  const ax =
    (debut[0] - point[0]) * metresParDegreLongitude;
  const ay =
    (debut[1] - point[1]) * metresParDegreLatitude;
  const bx =
    (fin[0] - point[0]) * metresParDegreLongitude;
  const by =
    (fin[1] - point[1]) * metresParDegreLatitude;

  const vx = bx - ax;
  const vy = by - ay;
  const longueurCarree = vx * vx + vy * vy;

  if (longueurCarree === 0) {
    return Math.hypot(ax, ay);
  }

  const projection = Math.max(
    0,
    Math.min(1, -(ax * vx + ay * vy) / longueurCarree)
  );

  return Math.hypot(
    ax + projection * vx,
    ay + projection * vy
  );
}

function mettreAJourProgressionTrajet(position) {
  if (
    position === null ||
    coordonneesRouteActive.length === 0
  ) {
    return;
  }

  const indexProche = trouverPointRouteProche(
    position,
    coordonneesRouteActive
  );

  let distanceRestante = 0;

  // Distance entre la position et le point proche
  distanceRestante += calculerDistanceMetres(
    position,
    coordonneesRouteActive[indexProche]
  );

  // Additionne les segments restants de la route
  for (
    let index = indexProche;
    index < coordonneesRouteActive.length - 1;
    index += 1
  ) {
    distanceRestante += calculerDistanceMetres(
      coordonneesRouteActive[index],
      coordonneesRouteActive[index + 1]
    );
  }

  // Évite de dépasser la distance initiale
  distanceRestante = Math.min(
    distanceRestante,
    distanceRouteTotale
  );

  const proportionRestante =
    distanceRouteTotale > 0
      ? distanceRestante / distanceRouteTotale
      : 0;

  const secondesRestantes =
    dureeRouteTotale * proportionRestante;

  const minutesRestantes = Math.max(
    0,
    Math.ceil(secondesRestantes / 60)
  );

  const dateArrivee = new Date(
    Date.now() + secondesRestantes * 1000
  );

  heureArrivee.textContent =
    "Arrivée " +
    dateArrivee.toLocaleTimeString("fr-CH", {
      hour: "2-digit",
      minute: "2-digit"
    });

  dureeTrajet.textContent =
    environDuree(minutesRestantes);

  distanceTrajet.textContent =
    (distanceRestante / 1000).toFixed(1) +
    " km restants";

  informationsTrajet.hidden = false;
}

function trouverPointRouteProche(position, route) {
  let meilleurIndex = 0;
  let meilleureDistance = Infinity;

  route.forEach(function (coordonnee, index) {
    const distance = calculerDistanceMetres(
      position,
      coordonnee
    );

    if (distance < meilleureDistance) {
      meilleureDistance = distance;
      meilleurIndex = index;
    }
  });

  return meilleurIndex;
}

function calculerDistanceMetres(pointA, pointB) {
  const rayonTerre = 6371000;

  const latitudeA = convertirEnRadians(pointA[1]);
  const latitudeB = convertirEnRadians(pointB[1]);

  const differenceLatitude = convertirEnRadians(
    pointB[1] - pointA[1]
  );

  const differenceLongitude = convertirEnRadians(
    pointB[0] - pointA[0]
  );

  const valeurA =
    Math.sin(differenceLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(differenceLongitude / 2) ** 2;

  const valeurC =
    2 *
    Math.atan2(
      Math.sqrt(valeurA),
      Math.sqrt(1 - valeurA)
    );

  return rayonTerre * valeurC;
}

function convertirEnRadians(degres) {
  return degres * (Math.PI / 180);
}


// Charge les favoris déjà enregistrés sur le téléphone
function chargerFavorisDestination() {
  const sauvegarde = localStorage.getItem(
    "favorisDestination"
  );

  if (sauvegarde === null) {
    return {};
  }

  try {
    return JSON.parse(sauvegarde);
  } catch (erreur) {
    console.error(
      "Impossible de charger les favoris.",
      erreur
    );

    return {};
  }
}

// Enregistre les favoris sur le téléphone
function sauvegarderFavorisDestination() {
  localStorage.setItem(
    "favorisDestination",
    JSON.stringify(favorisDestination)
  );
}

function chargerListeEnregistree(cle) {
  const sauvegarde = localStorage.getItem(cle);

  if (sauvegarde === null) {
    return [];
  }

  try {
    const liste = JSON.parse(sauvegarde);
    return Array.isArray(liste) ? liste : [];
  } catch (erreur) {
    console.error(
      "Impossible de charger " + cle + ".",
      erreur
    );
    return [];
  }
}

function sauvegarderPlacesEnregistrees() {
  localStorage.setItem(
    "placesEnregistrees",
    JSON.stringify(placesEnregistrees)
  );
}

function sauvegarderRecherchesRecentes() {
  localStorage.setItem(
    "recherchesRecentes",
    JSON.stringify(recherchesRecentes)
  );
}

function creerBoutonLieuTexte(lieu, classeSupplementaire) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className =
    "bouton-lieu-panneau " + classeSupplementaire;

  const nom = document.createElement("strong");
  nom.textContent = lieu.nom || lieu.adresse;

  bouton.appendChild(nom);

  if (lieu.adresse && lieu.adresse !== lieu.nom) {
    const adresse = document.createElement("small");
    adresse.textContent = lieu.adresse;
    bouton.appendChild(adresse);
  }

  bouton.addEventListener("click", function () {
    choisirDestination({
      lon: lieu.longitude,
      lat: lieu.latitude,
      display_name: lieu.adresse || lieu.nom
    });
  });

  return bouton;
}

function afficherMessageListeVide(element, message) {
  const texte = document.createElement("p");
  texte.className = "liste-lieux-vide";
  texte.textContent = message;
  element.appendChild(texte);
}

// Menu indépendant du clic sur la destination.
function creerCarteLieuAvecMenu(boutonDestination, nomActuel, renommer, supprimer) {
  const carteLieu = document.createElement("div");
  carteLieu.className = "carte-favori-gerable";

  const boutonOptions = document.createElement("button");
  boutonOptions.type = "button";
  boutonOptions.className = "bouton-options-favori";
  boutonOptions.textContent = "⋮";
  boutonOptions.setAttribute("aria-label", "Options de " + nomActuel);
  boutonOptions.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "menu-options-favori";
  menu.hidden = true;

  const boutonRenommer = document.createElement("button");
  boutonRenommer.type = "button";
  boutonRenommer.textContent = "Renommer";

  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.type = "button";
  boutonSupprimer.className = "action-supprimer-favori";
  boutonSupprimer.textContent = "Supprimer";

  boutonOptions.addEventListener("click", function (evenement) {
    evenement.stopPropagation();
    const ouvrir = menu.hidden;
    fermerMenusOptionsFavoris();
    menu.hidden = !ouvrir;
    boutonOptions.setAttribute("aria-expanded", String(ouvrir));
  });

  boutonRenommer.addEventListener("click", function (evenement) {
    evenement.stopPropagation();
    fermerMenusOptionsFavoris();
    const nouveauNom = window.prompt("Nouveau nom du favori :", nomActuel);
    if (nouveauNom !== null && nouveauNom.trim()) {
      renommer(nouveauNom.trim());
    }
  });

  boutonSupprimer.addEventListener("click", function (evenement) {
    evenement.stopPropagation();
    fermerMenusOptionsFavoris();
    supprimer();
  });

  menu.append(boutonRenommer, boutonSupprimer);
  carteLieu.append(boutonDestination, boutonOptions, menu);
  return carteLieu;
}

function fermerMenusOptionsFavoris() {
  document.querySelectorAll(".menu-options-favori").forEach(function (menu) {
    menu.hidden = true;
  });
  document.querySelectorAll(".bouton-options-favori").forEach(function (bouton) {
    bouton.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", function (evenement) {
  if (!evenement.target.closest(".carte-favori-gerable")) {
    fermerMenusOptionsFavoris();
  }
});

function afficherPlacesEnregistrees() {
  listePlacesElement.innerHTML = "";

  if (placesEnregistrees.length === 0) {
    afficherMessageListeVide(listePlacesElement, "Autres lieux favoris.");
    return;
  }

  placesEnregistrees.forEach(function (lieu) {
    const bouton = creerBoutonLieuTexte(lieu, "bouton-place");
    const carteLieu = creerCarteLieuAvecMenu(
      bouton,
      lieu.nom || lieu.adresse || "Favori",
      function (nouveauNom) {
        lieu.nom = nouveauNom;
        sauvegarderPlacesEnregistrees();
        afficherPlacesEnregistrees();
      },
      function () {
        placesEnregistrees = placesEnregistrees.filter(function (item) {
          return item !== lieu;
        });
        sauvegarderPlacesEnregistrees();
        afficherPlacesEnregistrees();
      }
    );
    listePlacesElement.appendChild(carteLieu);
  });
}

function afficherRecherchesRecentes() {
  recherchesRecentesElement.innerHTML = "";

  if (recherchesRecentes.length === 0) {
    afficherMessageListeVide(
      recherchesRecentesElement,
      "Trois dernières recherches."
    );
    return;
  }

  recherchesRecentes.forEach(function (lieu) {
    recherchesRecentesElement.appendChild(
      creerBoutonLieuTexte(lieu, "bouton-recent")
    );
  });
}

function enregistrerRechercheRecente(resultat) {
  const longitude = Number(resultat.lon);
  const latitude = Number(resultat.lat);
  const adresse =
    resultat.display_name || "Destination";

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return;
  }

  recherchesRecentes = recherchesRecentes.filter(
    function (lieu) {
      return !(
        lieu.longitude === longitude &&
        lieu.latitude === latitude
      );
    }
  );

  recherchesRecentes.unshift({
    nom: adresse,
    adresse: adresse,
    longitude: longitude,
    latitude: latitude
  });

  recherchesRecentes = recherchesRecentes.slice(0, 3);

  sauvegarderRecherchesRecentes();
  afficherRecherchesRecentes();
}


function afficherFavorisDestination() {
  favorisDestinationElement.innerHTML = "";

  const types = ["maison", "travail"];

  types.forEach(function (type) {
    const favori = favorisDestination[type];

    if (!favori) {
      return;
    }

    const bouton = document.createElement(
      "button"
    );

    bouton.type = "button";
    bouton.className =
      "bouton-favori-destination";

    const icone = document.createElement("span");
    icone.className = "icone-favori-destination";
    icone.textContent =
      type === "maison" ? "🏠" : "💼";

    const textes = document.createElement("span");
    textes.className = "textes-favori-destination";

    const nom = document.createElement("strong");
    nom.textContent = favori.nom ||
      (type === "maison" ? "Maison" : "Travail");

    const adresse = document.createElement("small");
    adresse.textContent =
      favori.adresse || favori.nom || "Adresse enregistrée";

    textes.appendChild(nom);
    textes.appendChild(adresse);
    bouton.appendChild(icone);
    bouton.appendChild(textes);

    bouton.setAttribute(
      "aria-label",
      favori.nom || type
    );

    let minuteurAppuiLong = null;
    let appuiLongDeclenche = false;

    // Commence le compte des deux secondes
    bouton.addEventListener(
      "pointerdown",
      function () {
        appuiLongDeclenche = false;

        clearTimeout(minuteurAppuiLong);

        minuteurAppuiLong = setTimeout(
          function () {
            appuiLongDeclenche = true;

            afficherSuppressionFavori(
              type,
              bouton
            );
          },
          2000
        );
      }
    );

    // Annule l'appui long si le doigt est relâché
    bouton.addEventListener(
      "pointerup",
      function () {
        clearTimeout(minuteurAppuiLong);
      }
    );

    bouton.addEventListener(
      "pointercancel",
      function () {
        clearTimeout(minuteurAppuiLong);
      }
    );

    bouton.addEventListener(
      "pointerleave",
      function () {
        clearTimeout(minuteurAppuiLong);
      }
    );

    // Empêche le menu contextuel de Safari
    bouton.addEventListener(
      "contextmenu",
      function (evenement) {
        evenement.preventDefault();
      }
    );

    // Clic normal : lance le trajet
    bouton.addEventListener(
      "click",
      function (evenement) {
        // Après un appui long, ne lance pas le trajet
        if (appuiLongDeclenche) {
          evenement.preventDefault();
          evenement.stopPropagation();

          appuiLongDeclenche = false;
          return;
        }

        bouton.classList.add(
          "favori-active"
        );

        setTimeout(function () {
          bouton.classList.remove(
            "favori-active"
          );

          listeResultats.hidden = true;

          choisirDestination({
            lon: favori.longitude,
            lat: favori.latitude,

            display_name:
              favori.adresse ||
              favori.nom ||
              type
          });
        }, 170);
      }
    );

    const carteLieu = creerCarteLieuAvecMenu(
      bouton,
      nom.textContent,
      function (nouveauNom) {
        favorisDestination[type].nom = nouveauNom;
        sauvegarderFavorisDestination();
        afficherFavorisDestination();
      },
      function () {
        delete favorisDestination[type];
        sauvegarderFavorisDestination();
        afficherFavorisDestination();
      }
    );
    favorisDestinationElement.appendChild(carteLieu);
  });

  if (favorisDestinationElement.children.length === 0) {
    const message = document.createElement("p");
    message.className = "favoris-vides";
    message.textContent =
      "Enregistre Maison ou Travail avec le bouton Save.";

    favorisDestinationElement.appendChild(message);
  }

  favorisDestinationElement.hidden = false;
}

// Affiche le bouton Delete près du favori
function afficherSuppressionFavori(
  type,
  boutonFavori
) {
  // Supprime une ancienne fenêtre éventuelle
  const ancienMenu = document.getElementById(
    "menu-suppression-favori"
  );

  if (ancienMenu !== null) {
    ancienMenu.remove();
  }

  const menu = document.createElement("div");

  menu.id = "menu-suppression-favori";
  menu.className =
    "menu-suppression-favori";

  const boutonDelete =
    document.createElement("button");

  boutonDelete.type = "button";
  boutonDelete.className =
    "bouton-delete-favori";

  boutonDelete.textContent = "Delete";

  // Place la fenêtre sous la ligne sélectionnée
  const position =
    boutonFavori.getBoundingClientRect();

  menu.style.top =
    Math.min(
      window.innerHeight - 64,
      position.bottom + 8
    ) + "px";

  menu.style.right =
    "16px";

  boutonDelete.addEventListener(
    "click",
    function (evenement) {
      evenement.preventDefault();
      evenement.stopPropagation();

      // Supprime Maison ou Travail
      delete favorisDestination[type];

      sauvegarderFavorisDestination();
      afficherFavorisDestination();

      menu.remove();
    }
  );

  menu.appendChild(boutonDelete);
  document.body.appendChild(menu);
}

// Ouvre la fenêtre lorsque Save est touché
boutonSauvegarderTrajet.addEventListener(
  "click",
  function () {
    if (destinationActive === null) {
      return;
    }

    nomFavori.value = "";
    fenetreSauvegardeFavori.hidden = false;

    nomFavori.focus();
  }
);

// Enregistre Maison, Travail ou un lieu dans Places
boutonsLogoFavori.forEach(function (bouton) {
  bouton.addEventListener(
    "click",
    function () {
      if (destinationActive === null) {
        return;
      }

      const type = bouton.dataset.type;

      if (type === "favori") {
        const nouvellePlace = {
          id: String(Date.now()),
          nom:
            nomFavori.value.trim() ||
            champDestination.value,
          adresse: champDestination.value,
          longitude: destinationActive[0],
          latitude: destinationActive[1]
        };

        placesEnregistrees.unshift(nouvellePlace);
        sauvegarderPlacesEnregistrees();
        afficherPlacesEnregistrees();

        fenetreSauvegardeFavori.hidden = true;
        return;
      }

      favorisDestination[type] = {
        type: type,

        nom:
          nomFavori.value.trim() ||
          champDestination.value,

        adresse: champDestination.value,

        longitude: destinationActive[0],
        latitude: destinationActive[1]
      };

      sauvegarderFavorisDestination();

      // Ferme la fenêtre après la sélection
      fenetreSauvegardeFavori.hidden = true;

      afficherFavorisDestination();
    }
  );
});

// Ferme la fenêtre lorsqu'on touche le fond extérieur
fenetreSauvegardeFavori.addEventListener(
  "click",
  function (evenement) {
    if (
      evenement.target ===
      fenetreSauvegardeFavori
    ) {
      fenetreSauvegardeFavori.hidden = true;
    }
  }
);

// Affiche les favoris lorsqu'on touche la recherche
champDestination.addEventListener(
  "focus",
  function () {
    // Dès que l'on commence une recherche, le panneau offre assez de place
    // pour les suggestions et leur défilement.
    definirPositionPanneau("milieu");

    const contenuPanneau = document.getElementById(
      "contenu-panneau-destination"
    );

    if (contenuPanneau !== null) {
      contenuPanneau.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }

    afficherFavorisDestination();
  }
);

// Récupère les favoris sauvegardés au lancement
favorisDestination =
  chargerFavorisDestination();

placesEnregistrees =
  chargerListeEnregistree("placesEnregistrees");

recherchesRecentes =
  chargerListeEnregistree("recherchesRecentes")
    .slice(0, 3);

// Affiche immédiatement les trois sections
afficherFavorisDestination();
afficherRecherchesRecentes();
afficherPlacesEnregistrees();

// Panneau coulissant : bas, milieu et haut
const panneauDestination = document.getElementById(
  "panneau-destination"
);

const poigneePanneauDestination =
  document.getElementById(
    "poignee-panneau-destination"
  );

let positionPanneau = "milieu";
let panneauEnGlissement = false;
let debutGlissementY = 0;
let translationDebutPanneau = 0;
let translationActuellePanneau = 0;
let glissementEffectue = false;

function positionsPanneauDisponibles() {
  const hauteurPanneau =
    panneauDestination.getBoundingClientRect().height;

  return {
    haute: 0,
    milieu: Math.min(
      hauteurPanneau - 150,
      window.innerHeight * 0.46
    ),
    basse: Math.max(
      0,
      // Laisse une partie un peu plus haute du panneau visible en bas.
      hauteurPanneau - 132
    )
  };
}

function appliquerTranslationPanneau(translation) {
  translationActuellePanneau = translation;

  // Le contenu utilise cette valeur pour limiter sa hauteur à la partie
  // réellement visible du panneau. Il peut ainsi défiler au cran milieu.
  panneauDestination.style.setProperty(
    "--translation-panneau",
    translation + "px"
  );

  panneauDestination.style.transform =
    "translate3d(-50%, " + translation + "px, 0)";
}

function ajusterPanneauAuResumeTrajet() {
  if (
    informationsTrajet.hidden ||
    !panneauDestination.classList.contains(
      "itineraire-selectionne"
    ) ||
    informationsTrajet.parentElement !==
      document.getElementById("contenu-panneau-destination")
  ) {
    return;
  }

  const hauteurPanneau =
    panneauDestination.clientHeight;

  const hauteurPoignee =
    poigneePanneauDestination.offsetHeight;

  const contenuPanneau = document.getElementById(
    "contenu-panneau-destination"
  );

  const rectangleContenu =
    contenuPanneau.getBoundingClientRect();

  const rectangleInformations =
    informationsTrajet.getBoundingClientRect();

  // Le bas visible se place juste après le résumé et ses boutons.
  const hauteurContenuVisible =
    rectangleInformations.bottom -
    rectangleContenu.top +
    12;

  const translation = Math.max(
    0,
    hauteurPanneau -
      hauteurPoignee -
      hauteurContenuVisible
  );

  positionPanneau = "milieu";
  panneauDestination.dataset.position = "milieu";
  appliquerTranslationPanneau(translation);

  contenuPanneau.scrollTop = 0;
}

function definirPositionPanneau(position, animer = true) {
  const positions = positionsPanneauDisponibles();

  positionPanneau = position;
  panneauDestination.dataset.position = position;
  panneauDestination.classList.toggle(
    "panneau-en-mouvement",
    !animer
  );

  appliquerTranslationPanneau(positions[position]);

  if (position === "basse") {
    const contenuPanneau = document.getElementById(
      "contenu-panneau-destination"
    );

    contenuPanneau.scrollTop = 0;
  }

  panneauDestination.setAttribute(
    "aria-label",
    "Recherche et lieux enregistrés, panneau " + position
  );

  if (!animer) {
    requestAnimationFrame(function () {
      panneauDestination.classList.remove(
        "panneau-en-mouvement"
      );
    });
  }
}

function positionPanneauLaPlusProche(translation) {
  const positions = positionsPanneauDisponibles();
  const noms = ["haute", "milieu", "basse"];

  return noms.reduce(function (meilleure, position) {
    const distance = Math.abs(
      positions[position] - translation
    );
    const meilleureDistance = Math.abs(
      positions[meilleure] - translation
    );

    return distance < meilleureDistance
      ? position
      : meilleure;
  }, "milieu");
}

poigneePanneauDestination.addEventListener(
  "pointerdown",
  function (evenement) {
    panneauEnGlissement = true;
    glissementEffectue = false;
    debutGlissementY = evenement.clientY;
    translationDebutPanneau =
      translationActuellePanneau;

    panneauDestination.classList.add(
      "panneau-en-mouvement"
    );

    poigneePanneauDestination.setPointerCapture(
      evenement.pointerId
    );
  }
);

poigneePanneauDestination.addEventListener(
  "pointermove",
  function (evenement) {
    if (!panneauEnGlissement) {
      return;
    }

    const deplacement =
      evenement.clientY - debutGlissementY;

    if (Math.abs(deplacement) > 4) {
      glissementEffectue = true;
    }

    const positions = positionsPanneauDisponibles();
    const nouvelleTranslation = Math.max(
      positions.haute,
      Math.min(
        positions.basse,
        translationDebutPanneau + deplacement
      )
    );

    appliquerTranslationPanneau(
      nouvelleTranslation
    );
  }
);

function terminerGlissementPanneau(evenement) {
  if (!panneauEnGlissement) {
    return;
  }

  panneauEnGlissement = false;
  panneauDestination.classList.remove(
    "panneau-en-mouvement"
  );

  if (
    poigneePanneauDestination.hasPointerCapture(
      evenement.pointerId
    )
  ) {
    poigneePanneauDestination.releasePointerCapture(
      evenement.pointerId
    );
  }

  definirPositionPanneau(
    positionPanneauLaPlusProche(
      translationActuellePanneau
    )
  );
}

poigneePanneauDestination.addEventListener(
  "pointerup",
  terminerGlissementPanneau
);

poigneePanneauDestination.addEventListener(
  "pointercancel",
  terminerGlissementPanneau
);

poigneePanneauDestination.addEventListener(
  "click",
  function () {
    if (glissementEffectue) {
      glissementEffectue = false;
      return;
    }

    const positionSuivante = {
      basse: "milieu",
      milieu: "haute",
      haute: "milieu"
    };

    definirPositionPanneau(
      positionSuivante[positionPanneau]
    );
  }
);

window.addEventListener("resize", function () {
  definirPositionPanneau(positionPanneau, false);
});

// Position centrale au lancement.
requestAnimationFrame(function () {
  definirPositionPanneau("milieu", false);
});

// Éléments du choix du logo de navigation
const boutonLogoNavigation =
  document.getElementById(
    "bouton-logo-navigation"
  );

const voletLogosNavigation =
  document.getElementById(
    "volet-logos-navigation"
  );

const boutonsChoixLogoNavigation =
  document.querySelectorAll(
    ".bouton-choix-logo-navigation"
  );

// Ouvre ou ferme la liste sous le bouton
boutonLogoNavigation.addEventListener(
  "click",
  function () {
    const doitOuvrir =
      voletLogosNavigation.hidden;

    voletLogosNavigation.hidden =
      !doitOuvrir;

    boutonLogoNavigation.setAttribute(
      "aria-expanded",
      String(doitOuvrir)
    );
  }
);

// Sélectionne Voiture, Moto ou Licorne
boutonsChoixLogoNavigation.forEach(
  function (bouton) {
    bouton.addEventListener(
      "click",
      function () {
        logoNavigationActuel =
          bouton.dataset.logo;

        // Conserve le choix après fermeture
        localStorage.setItem(
          "logoNavigation",
          logoNavigationActuel
        );

        // Actualise la couleur du choix actif
        mettreAJourChoixLogoNavigation();

        // Change immédiatement le marqueur
        appliquerLogoNavigation();

        // Referme la liste
        voletLogosNavigation.hidden = true;

        boutonLogoNavigation.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    );
  }
);

// Change le contenu du marqueur GPS
function appliquerLogoNavigation() {
  if (elementUtilisateur === null) {
    return;
  }

  if (
    logoNavigationActuel === "voiture" &&
    contenuLogoVoiture !== ""
  ) {
    elementUtilisateur.innerHTML =
      contenuLogoVoiture;

    return;
  }

  if (logoNavigationActuel === "moto") {
    elementUtilisateur.innerHTML =
      '<span class="logo-navigation-emoji">🏍️</span>';

    return;
  }

  if (logoNavigationActuel === "licorne") {
    elementUtilisateur.innerHTML =
      '<span class="logo-navigation-emoji">🦄</span>';
  }
}

// Indique le choix actif dans la liste
function mettreAJourChoixLogoNavigation() {
  boutonsChoixLogoNavigation.forEach(
    function (bouton) {
      bouton.classList.toggle(
        "logo-actif",
        bouton.dataset.logo ===
          logoNavigationActuel
      );
    }
  );
}

// Affiche le choix enregistré au lancement
mettreAJourChoixLogoNavigation();

// Ferme le choix des logos de navigation
function fermerVoletLogosNavigation() {
  voletLogosNavigation.hidden = true;

  boutonLogoNavigation.setAttribute(
    "aria-expanded",
    "false"
  );
}

// Ferme le choix des véhicules
function fermerMenusDeSelection() {
  fermerVoletLogosNavigation();
}

// Ferme les deux menus dès qu'on touche la carte
carte.getCanvas().addEventListener(
  "pointerdown",
  fermerMenusDeSelection
);

// Ferme les deux menus pendant un déplacement
carte.on("dragstart", function () {
  fermerMenusDeSelection();
});

// Ferme les deux menus pendant un zoom manuel
carte.on("zoomstart", function (evenement) {
  if (evenement.originalEvent) {
    fermerMenusDeSelection();
  }
});

// Ferme les deux menus pendant une rotation manuelle
carte.on("rotatestart", function (evenement) {
  if (evenement.originalEvent) {
    fermerMenusDeSelection();
  }
});

// Empêche Safari d'agrandir l'interface de l'application.
// Les gestes commencés directement sur la carte restent autorisés
// afin que MapLibre puisse continuer à zoomer normalement.
function bloquerZoomPageHorsCarte(evenement) {
  const cible = evenement.target;

  if (
    !(cible instanceof Element) ||
    cible.closest("#map") === null
  ) {
    evenement.preventDefault();
  }
}

document.addEventListener(
  "gesturestart",
  bloquerZoomPageHorsCarte,
  { passive: false }
);

document.addEventListener(
  "gesturechange",
  bloquerZoomPageHorsCarte,
  { passive: false }
);
