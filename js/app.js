
var map;
var map_center;
var map_bounds; //  use to fit all markers in map
var query_location;
var markers = [];
var globalInfoWindow;

var defaultIcon, highlightedIcon;

function initMap(){
    // Constructor creates a new map - only center and zoom are required.
    map_center = new google.maps.LatLng(40.7413549, -73.9980244);
    map = new google.maps.Map(document.getElementById('map'), {
      center: map_center,
      zoom: 13,
      mapTypeControl: false
    });

    google.maps.event.addDomListener(window, 'resize', resize);
    map_bounds = new google.maps.LatLngBounds();

    globalInfoWindow = new google.maps.InfoWindow();

    // This autocomplete is for use in the geocoder entry box.
    var zoomAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('zoom-to-area-text'));
    // Bias the boundaries within the map for the zoom to area text.
    zoomAutocomplete.bindTo('bounds', map);

    // add event listener to zoom in map
    zoomAutocomplete.addListener('place_changed', function() {
      zoomToArea(this);
    });

    // default style for marker icons.
    defaultIcon = makeMarkerIcon('ff3300');

    // Create a "highlighted location" marker color for when the user
    // mouses over the marker.
    highlightedIcon = makeMarkerIcon('FFFF24');
}

// function to resize map to fit all markers
function resize(){
    // console.log("resize");
    map.setCenter(map_center);
    for (var i = 0; i < markers.length; i++) {
      // markers[i].setMap(map);
      map_bounds.extend(markers[i].position);
    }
    if(markers.length > 0){
        map.fitBounds(map_bounds);    
    }
}

// This function takes the input value in the find nearby area text input
// locates it, and then zooms into that area. This is so that the user can
// show all listings, then decide to focus on one area of the map.
// Based on Udacity's Google Maps API course
function zoomToArea(zoomAutocomplete) {
    
    // console.log(zoomAutocomplete.getPlace());
    query_location = zoomAutocomplete.getPlace().formatted_address;

    // Initialize the geocoder.
    var geocoder = new google.maps.Geocoder();
    // Get the address or place that the user entered.
    var address = document.getElementById('zoom-to-area-text').value;
    // Make sure the address isn't blank.
    if (address == '') {
      window.alert('You must enter an area, or address.');
    } else {
      // Geocode the address/area entered to get the center. Then, center the map
      // on it and zoom in
      geocoder.geocode(
        { address: address,
          // componentRestrictions: {locality: 'New York'}
        }, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            map_center = results[0].geometry.location;
            map.setCenter(results[0].geometry.location);
            map.setZoom(15);
          } else {
            window.alert('We could not find that location - try entering a more' +
                ' specific place.');
          }
        });
      }
}

var yelp_access_token;
var CORS_ANYWHERE_URL = 'https://cors-anywhere.herokuapp.com/';

function getYelpAccessToken(){
    // HACK to use client side JS with Yelp V3
    // https://github.com/Rob--W/cors-anywhere
    var yelp_auth_url = CORS_ANYWHERE_URL + "https://api.yelp.com/oauth2/token";
    return $.ajax({
        url: yelp_auth_url,
        method: "POST",
        data: {
            grant_type: 'client_credentials',
            client_id: 'FN__lFwA6r2MtH9jdbVnQA',
            client_secret: 'nJV84pTy5CxUprC1H6ArVYylEG5NQ1QL75laX3GkVtbvERL1gryeqnINnAD2zCi8'
        },
    })   
}

function getYelpBusinesses(access_token, location, searchString){
    var yelp_business_search_url = CORS_ANYWHERE_URL + "https://api.yelp.com/v3/businesses/search";
    $.ajax({
        url: yelp_business_search_url,
        method: "GET",
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", "Bearer " + access_token);
        },
        data: {
            term: searchString,
            location: location,
            radius: 8000 // 5 miles
        }
    }).done(function(response){
        // console.log(response);
        // set map_center
        var region = response.region;
        map_center = new google.maps.LatLng(region.center.latitude, region.center.longitude);
        // populate the businesses from response
        response.businesses.forEach(function(business){
            appViewModel.yelpBusinesses.push(business);
        })
        createMarkers(appViewModel.yelpBusinesses);
    }).fail(function(error){
        alert("An error occured in getting Yelp results! Please try again.");
    })
}

function removeMarkers(){
    for(var i = 0; i < markers.length; i++){
        markers[i].setMap(null);
    }
}


function createMarkers(businesses){
    removeMarkers();
    markers = [];
    for(var i = 0; i < businesses().length; i++){
        var position = {lat: businesses()[i].coordinates.latitude, lng: businesses()[i].coordinates.longitude};
        var title = businesses()[i].name;
        var marker = new google.maps.Marker({
            position: position,
            title: title,
            id: businesses()[i].id,
            icon: defaultIcon
        })
        marker.setMap(map);
        markers.push(marker);
        marker.addListener('click',(function(marker){
            return function(){
                console.log(marker.title + " clicked!");
                // marker.setAnimation(google.maps.Animation.BOUNCE);
                populateInfoWindow(marker, globalInfoWindow);
            }            
        })(marker))
        // Two event listeners - one for mouseover, one for mouseout,
        // to change the colors back and forth.
        marker.addListener('mouseover', function() {
            this.setIcon(highlightedIcon);
        });
        marker.addListener('mouseout', function() {
            this.setIcon(defaultIcon);
        });        
    }
    resize();
}

function getBusinessInfo(id){
    var yelp_business_info_url = CORS_ANYWHERE_URL + "https://api.yelp.com/v3/businesses/" + id;
    return $.ajax({
        url: yelp_business_info_url,
        method: "GET",
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", "Bearer " + yelp_access_token);
        }
    })    
}

function populateInfoWindow(marker, infoWindow){
    if(infoWindow.marker != marker){
        infoWindow.marker = marker;
        infoWindow.open(map, marker);        
        infoWindow.setContent('Getting Yelp info for ' + marker.title + '...');
        // Make sure the marker property is cleared if the infowindow is closed.
        infoWindow.addListener('closeclick', function() {
            infoWindow.marker = null;
        });
        // get more info through yelp Business API
        getBusinessInfo(marker.id)
        .done(function(response){
            console.log(response);
            infoWindow.setContent('<div>' + response.name + '</div>');
        }).fail(function(error){
            alert("An error occured in getting Yelp business API result! Please try again.")
        });
    }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
// Based on Udacity's Google Maps API course
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
      'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
      '|40|_|%E2%80%A2',
      new google.maps.Size(21, 36),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34),
      new google.maps.Size(21,36));
    return markerImage;
}

var ViewModel = function(){
    var self = this;
    self.searchString = ko.observable("");
    self.yelpBusinesses = ko.observableArray([]);

    self.getSearchResults = function(){
        if(yelp_access_token === undefined){
            getYelpAccessToken()
            .done(function(response){
                yelp_access_token = response.access_token;
                // clear the businesses
                self.yelpBusinesses([]);
                getYelpBusinesses(yelp_access_token, query_location, self.searchString(), self.yelpBusinesses);
            }).fail(function(error){
                alert("An error occured in getting Yelp access token! Please try again.");
            })            
        } else{
            // clear the businesses
            self.yelpBusinesses([]);
            getYelpBusinesses(yelp_access_token, query_location, self.searchString(), self.yelpBusinesses);
        }
    }

    self.updateInfoWindow = function(){
        this.active = 1; // css class
        var curr_id = this.id;
        markers.forEach(function(marker){
            if(marker.id == curr_id){
                populateInfoWindow(marker, globalInfoWindow);
            }
        })
    }
}

var appViewModel = new ViewModel();
ko.applyBindings(appViewModel);