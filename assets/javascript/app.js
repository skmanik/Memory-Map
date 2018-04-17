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
var map, infoWindow, popup, Popup;

// =============================
// ========== ACTIONS ==========
// =============================

// toggle functions
function toggleDisplay() {

    hideAllInfo();

    isDisplayModeOn = true;

    console.log("Display mode activated!");
    $("#edit-mode").removeClass("active");
    $("#display-mode").addClass("active");

};

function toggleEdit() {

    hideAllInfo();

    isDisplayModeOn = false;

    console.log("Edit mode activated!");
    $("#display-mode").removeClass("active");
    $("#edit-mode").addClass("active");

};

function hideAllInfo() {

    console.log("Info hidden!");
    $("#side-panel").removeClass("smenu-open").addClass("smenu-close");
    $("#side-edit").removeClass("smenu-open").addClass("smenu-close");

};

// POPUP FUNCTION THAT DEFINES POPUPS
function definePopupClass() {

    Popup = function (position, content) {
        this.position = position;

        content.classList.add('popup-bubble-content');

        var pixelOffset = document.createElement('div');
        pixelOffset.classList.add('popup-bubble-anchor');
        pixelOffset.appendChild(content);

        this.anchor = document.createElement('div');
        this.anchor.classList.add('popup-tip-anchor');
        this.anchor.appendChild(pixelOffset);

        // Optionally stop clicks, etc., from bubbling up to the map.
        this.stopEventPropagation();
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

};

// init Map function that MUST be declared globally, do not move into doc ready
function initMap() {
    // POPUP CODE INITIALIZED
    definePopupClass();

    // our default location: berkeley
    var defaultLoc = { lat: 37.8712, lng: -122.2727 };

    // declaring map object
    var map = new google.maps.Map(document.getElementById("map"), {
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

    // adding click event that generates new markers
    google.maps.event.addListener(map, "click", function (e) {

        // makes so this only runs in edit mode
        if (isDisplayModeOn === true) {

            return;

        }

        //lat and lng is available in e object
        var latLng = e.latLng;

        // make new marker
        var clickMarker = new google.maps.Marker({
            position: { lat: latLng.lat(), lng: latLng.lng() },
            map: map,

        });

        // firebase of this new marker
        var newLatitude = {
            lat: latLng.lat(),
            lng: latLng.lng(),
        }

        database.ref().push(newLatitude);

        map.panTo(clickMarker.getPosition());
        console.log("did it move?");

        console.log(clickMarker);
        console.log(latLng.lat());

        // info window stuff
        var contentString = "<div class='clickme'>" + "Hi! There!" + "</div>";

        var infowindow = new google.maps.InfoWindow({
            content: contentString
        });

        clickMarker.addListener("click", function () {

            if (isDisplayModeOn === true) {

                // POPUP CODE
                popup = new Popup(
                    new google.maps.LatLng(latLng.lat(), latLng.lng()),
                    document.getElementById("content"));
                popup.setMap(map);

                infowindow.open(map, clickMarker);

            } else if (isDisplayModeOn === false) {

                $("#side-edit").removeClass("smenu-close").addClass("smenu-open");

            }

        });

        // whatever panel open, close them
        hideAllInfo();

    });

    // custom popup attempt


    // =============================
    // ========== display ==========
    // =============================

    // FIREBASE LORD HELP US
    $("#edit-button").on("click", function (event) {

        var currentTime = moment(currentTime).format("hh:mm a");
        var content = $("#comment-input").val().trim();
        var blurb = $("#blurb-input").val().trim();
        var location = $("#location-input").val().trim();
        var date = $("#date-input").val().trim();

        console.log("content: ", content);
        console.log("time: ", currentTime);
        console.log("blurb: ", blurb);
        console.log("location: ", location);
        console.log("date: ", date);

        var newComment = {
            content: content,
            blurb: blurb,
            location: location,
            date: date,
            time: currentTime
        };

        database.ref().push(newComment);

    });

    // allows display mode to be activated
    $("#display-mode").on("click", toggleDisplay);

    // allows edit mode to be activated
    $("#edit-mode").on("click", toggleEdit);

    // for the side panels
    $(".close-button").on("click", function () {

        $("#side-panel").removeClass("smenu-open").addClass("smenu-close");
        $("#side-edit").removeClass("smenu-open").addClass("smenu-close");
        console.log("sidebar closed");

    });

    // for clicking on the blurb 
    $(document.body).on("click", ".clickme", function () {

        console.log("Blurb clicked!");

        if ($("#display-mode").hasClass("active")) {

            console.log("Display mode has class active!");

            // open side info when display mode is active
            $("#side-panel").removeClass("smenu-close").addClass("smenu-open");

        } else if ($("#edit-mode").hasClass("active")) {

            console.log("Edit mode has class active!");

            // open side edit when edit mode is active
            $("#side-edit").removeClass("smenu-close").addClass("smenu-open");

        }

    });

    // POPUP CODE
    $("#content").on("click", function () {

        console.log("Test!");

    });

};

// =====================================================
// === DOCUMENT READY: ONLY FOR NON GOOGLE MAP STUFF ===
// =====================================================

$(document).ready(function () {

    // initialize toggle
    toggleDisplay();

    // document ready closing tag
});