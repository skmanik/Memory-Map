// ================================
// ======= GLOBAL VARIABLES =======
// ================================

// initializing firebase
var config = {
    apiKey: "AIzaSyDHwZqvulvp_MbrSBxHDe3jjR1VF1PqCwo",
    authDomain: "memory-map-3b3c8.firebaseapp.com",
    databaseURL: "https://memory-map-3b3c8.firebaseio.com",
    projectId: "memory-map-3b3c8",
    storageBucket: "memory-map-3b3c8.appspot.com",
    messagingSenderId: "784730700070"
};
firebase.initializeApp(config);

var database = firebase.database();

// variables for modes
var isDisplayModeOn;

// variable for Google Maps
var map, infoWindow, Popup;
var loc;

// variable to keep track of the marker we are editing
var lastMarkerClicked;

var markerCount = 0;

// ================================
// ======= GLOBAL FUNCTIONS =======
// ================================

// init Map function that MUST be declared globally, do not move into doc ready
function initMap() {
    // popup code initialized
    definePopupClass();

    // our default location: berkeley
    var defaultLoc = { lat: 37.8712, lng: -122.2727 };

    // declaring map object
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLoc,
        zoom: 13,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
            {
                featureType: "poi",
                stylers: [{ visibility: "off" }]
            },
            {
                featureType: "transit",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    // adding search bar
    var input = document.getElementById("pac-input");
    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);
    autocomplete.addListener("place_changed", function () {

        var place = autocomplete.getPlace();

        if (!place.geometry) {

            return;

        }

        if (place.geometry.viewport) {

            map.fitBounds(place.geometry.viewport);

        } else {

            map.setCenter(place.geometry.location);
            map.setZoom(17);

        }

    });

    // firebase markers initialized
    database.ref().on("child_added", function (childSnapshot) {

        console.log(childSnapshot);

        if (!childSnapshot.val().content) {
            return;
        };

        var contentString = "<div class='clickme'>" + childSnapshot.val().content.slice(0, 40) + " ...</div>";

        var infowindow = new google.maps.InfoWindow({
            content: contentString
        });

        console.log("Markers: " + markerCount);
        markerCount += 1;

        var marker = new google.maps.Marker({
            position: { lat: childSnapshot.val().markLat, lng: childSnapshot.val().markLng },
            map: map,
            name: childSnapshot.val().name,
            content: childSnapshot.val().content,
            date: childSnapshot.val().date,
            location: childSnapshot.val().location,
            key: childSnapshot.key
        });

        // popup that replaces infowindow
        var content = document.createElement("div");
        content.setAttribute("class", "floaty");
        content.innerHTML = contentString;

        var popup = new Popup(
            new google.maps.LatLng(childSnapshot.val().markLat, childSnapshot.val().markLng),
            content);

        popup.marker = marker;
        marker.popup = popup;
        marker.infowindow = infowindow;
        marker.addListener("click", displayMarkerData);

    });

    // allows map to track clicks
    map.addListener("click", function (e) {

        // makes so the rest of the function only runs in edit mode
        if (isDisplayModeOn === true) {
            return;
        }

        // lat and lng is available in e object
        loc = e.latLng;
        console.log(loc.lat() + "   " + loc.lng());

        // info window stuff
        var contentString = "<div class='clickme'>" + "A memory hasn't been added yet!" + "</div>";

        var infowindow = new google.maps.InfoWindow({
            content: contentString
        });

        // make new marker
        var marker = new google.maps.Marker({
            position: { lat: loc.lat(), lng: loc.lng() },
            map: map,
        });

        map.panTo(marker.getPosition());
        console.log("did it move?");
        console.log(marker);
        console.log(loc.lat());

        // update last clicked marker for editing
        updateLastMarkerClicked(marker);

        // new marker data
        // popup that replaces infowindow
        var content = document.createElement("div");
        content.setAttribute("class", "floaty");
        content.innerHTML = contentString;

        var popup = new Popup(
            new google.maps.LatLng(marker.position.lat, marker.position.lng),
            content);

        popup.marker = marker;
        marker.popup = popup;
        marker.infowindow = infowindow;
        marker.addListener("click", displayMarkerData);

        // whatever panel open, close it
        hideAllInfo();

    });

    // ======================
    // ====== FIREBASE ======

    $("#edit-button").on("click", function (event) {
        event.preventDefault();

        var currentTime = moment(currentTime).format("hh:mm a");
        var name = $("#name-input").val().trim();
        var content = $("#comment-input").val().trim();
        var location = $("#location-input").val().trim();
        var date = $("#date-input").val().trim();

        console.log("Memory Name:", name);
        console.log("content: ", content);
        console.log("time: ", currentTime);
        console.log("location: ", location);
        console.log("date: ", date);

        var newComment = {
            name: name,
            content: content,
            location: location,
            date: date,
            time: currentTime, // picture?
            markLat: loc.lat(), // cannot be stored as one object, the "loc" object contains functions
            markLng: loc.lng()
        };

        // if it has a key, it is an old marker we need to update
        if (lastMarkerClicked.key) {
            console.log("comment: " + newComment);
            console.log("key: " + database.ref().child(lastMarkerClicked.key));
            database.ref().child(lastMarkerClicked.key).update(newComment)
                .then(() => {
                    console.log("Successfully updated marker.");
                })
                .catch(err => {
                    console.log("error code: " + err.code + " error: " + err);
                });
            lastMarkerClicked.popup.content.innerHTML = content.slice(0, 40) + " ..."; // update popup text
        } else {
            database.ref().push(newComment);
        }

        $("#name-input").val("");
        $("#comment-input").val("");
        $("#location-input").val("");
        $("#date-input").val("");
        $("#side-edit").removeClass("smenu-open").addClass("smenu-close"); // close side edit once you've hit submit!

    });

    // ===============================
    // ====== UI RELATED EVENTS ======

    // allows display mode to be activated
    $("#display-mode").on("click", toggleDisplay);

    // allows edit mode to be activated
    $("#edit-mode").on("click", toggleEdit);

    // allows close button in side panels to be activated
    $(".close-button").on("click", function () {

        $("#side-panel").removeClass("smenu-open").addClass("smenu-close");
        $("#side-edit").removeClass("smenu-open").addClass("smenu-close");
        console.log("sidebar closed");

    });

};

// =============================
// ====== OTHER FUNCTIONS ======

// function that displays marker data (whether firebase or live)
function displayMarkerData() {

    var marker = this;

    loc = marker.position;
    console.log(loc.lat() + "   " + loc.lng());

    $(".name").text(marker.name);
    $(".blurb").text(marker.content);
    $(".location").text(marker.location);
    $(".date").text(marker.date);

    updateLastMarkerClicked(marker);

    if (isDisplayModeOn === true) {

        console.log(map);
        marker.popup.setMap(map);

        // marker.infowindow.open(map, marker);

    } else if (isDisplayModeOn === false) {

        $("#side-edit").removeClass("smenu-close").addClass("smenu-open");

    }

}

// function called when a marker gets clicked (or its blurb gets clicked)
function updateLastMarkerClicked(marker) {
    lastMarkerClicked = marker;
};

function blurbClicked(popup) {

    console.log("Blurb clicked!");

    // update last clicked marker since this opens the sidepanel
    updateLastMarkerClicked(popup.marker);

    if ($("#display-mode").hasClass("active")) {

        console.log("Display mode has class active!");

        // open side info when display mode is active
        $("#side-panel").removeClass("smenu-close").addClass("smenu-open");


    } else if ($("#edit-mode").hasClass("active")) {

        console.log("Edit mode has class active!");

        // open side edit when edit mode is active
        $("#side-edit").removeClass("smenu-close").addClass("smenu-open");

    }

};

// toggle functions
function toggleDisplay() {

    hideAllInfo();

    isDisplayModeOn = true;

    console.log("Display mode activated!");
    $("#edit-mode").removeClass("active");
    $("#display-mode").addClass("active");

}

// toggle functions
function toggleEdit() {

    hideAllInfo();

    isDisplayModeOn = false;

    console.log("Edit mode activated!");
    $("#display-mode").removeClass("active");
    $("#edit-mode").addClass("active");

}

// hide toggles
function hideAllInfo() {

    console.log("Info hidden!");
    $("#side-panel").removeClass("smenu-open").addClass("smenu-close");
    $("#side-edit").removeClass("smenu-open").addClass("smenu-close");

}

// function for popups
function definePopupClass() {

    Popup = function (position, content) {
        this.position = position;
        this.content = content;

        content.classList.add('popup-bubble-content');

        var pixelOffset = document.createElement('div');
        pixelOffset.classList.add('popup-bubble-anchor');
        pixelOffset.classList.add("floating");
        pixelOffset.appendChild(content);

        this.anchor = document.createElement('div');
        this.anchor.classList.add('popup-tip-anchor');
        this.anchor.appendChild(pixelOffset);

        // Optionally stop clicks, etc., from bubbling up to the map.
        this.stopEventPropagation();

        // Adds a click listener whenever a popup is created
        this.addClickListener();
    };
    // NOTE: google.maps.OverlayView is only defined once the Maps API has
    // loaded. That is why Popup is defined inside initMap().
    Popup.prototype = Object.create(google.maps.OverlayView.prototype);

    /** Called when the popup is added to the map. */
    Popup.prototype.onAdd = function () {
        this.getPanes().floatPane.appendChild(this.anchor);
    };

    /** Called when the popup is removed from the map. */
    Popup.prototype.onRemove = function () {
        if (this.anchor.parentElement) {
            this.anchor.parentElement.removeChild(this.anchor);
        }
    };

    /** Called when the popup needs to draw itself. */
    Popup.prototype.draw = function () {
        var divPosition = this.getProjection().fromLatLngToDivPixel(this.position);
        // Hide the popup when it is far out of view.
        var display =
            Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000 ?
                'block' :
                'none';

        if (display === 'block') {
            this.anchor.style.left = divPosition.x + 'px';
            this.anchor.style.top = divPosition.y + 'px';
        }
        if (this.anchor.style.display !== display) {
            this.anchor.style.display = display;
        }
    };

    /** Stops clicks/drags from bubbling up to the map. */
    Popup.prototype.stopEventPropagation = function () {
        var anchor = this.anchor;
        anchor.style.cursor = 'auto';

        ['click', 'dblclick', 'contextmenu', 'wheel', 'mousedown', 'touchstart',
            'pointerdown']
            .forEach(function (event) {
                anchor.addEventListener(event, function (e) {
                    e.stopPropagation();
                });
            });
    };

    // This will add a function that will listen for clicks on the popups
    Popup.prototype.addClickListener = function () {
        var anchor = this.anchor;
        var popup = this;
        anchor.style.cursor = 'auto';

        anchor.addEventListener('click', function (e) {
            // Edit this function to do stuff on click 
            blurbClicked(popup);

            // Just make sure that the click doesn't go through to the map
            e.stopPropagation();
        });
    };

};

// =====================================================
// === DOCUMENT READY: ONLY FOR NON GOOGLE MAP STUFF ===
// =====================================================

$(document).ready(function () {

    // initialize toggle
    toggleDisplay();

    // document ready closing tag
});