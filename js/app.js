var map;
var mapCenter;
var mapBounds; //  use to fit all markers in map
var queryLocation; // zoomed area on map
var markers = []; // global markers array to hold all markers
var globalInfoWindow;

var defaultIcon, highlightedIcon;

function initMap(){
    // Constructor creates a new map - only center and zoom are required.
    mapCenter = new google.maps.LatLng(40.7413549, -73.9980244);
    map = new google.maps.Map(document.getElementById('map'), {
      center: mapCenter,
      zoom: 13,
      mapTypeControl: false
    });

    // resize map when window size changes
    google.maps.event.addDomListener(window, 'resize', resize);

    globalInfoWindow = new google.maps.InfoWindow();

    // This autocomplete is for use in the geocoder entry box.
    var zoomAutocomplete = new google.maps.places.Autocomplete(
        document.getElementById('zoom-to-area-text'));
    // Bias the boundaries within the map for the zoom to area text.
    zoomAutocomplete.bindTo('bounds', map);

    // add event listener to zoom in map
    // fired when user selects an option from auto-complete results
    zoomAutocomplete.addListener('place_changed', function() {
      zoomToArea(this);
    });

    // default style for marker icons.
    defaultIcon = makeMarkerIcon('ff3300');

    // Create a "highlighted location" marker color for when the user
    // mouses over the marker.
    highlightedIcon = makeMarkerIcon('FFFF24');

    // show default results for Brookly, New York when the map is loaded
    queryLocation = "Brooklyn, NY, USA";
    geocodeAndZoom(queryLocation);
    appViewModel.getSearchResults();
}

// function to resize map to fit all markers
function resize(){
    mapBounds = new google.maps.LatLngBounds();
    map.setCenter(mapCenter);
    // add all marker positions to bounds
    for (var i = 0; i < markers.length; i++) {
      mapBounds.extend(markers[i].position);
    }
    if(markers.length > 0){
        map.fitBounds(mapBounds);    
    }
}

// function to handle google maps error
function mapError(){
    window.alert("An error occured in loading Google Maps API");
}

function geocodeAndZoom(address){
  // Initialize the geocoder.
  var geocoder = new google.maps.Geocoder();

  // Geocode the address/area entered to get the center. Then, center the map
  // on it and zoom in
  geocoder.geocode(
    { address: address,
      // componentRestrictions: {locality: 'New York'}
    }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        mapCenter = results[0].geometry.location;
        map.setCenter(results[0].geometry.location);
        map.setZoom(15);
      } else {
        window.alert('We could not find that location - try entering a more' +
            ' specific place.');
      }
    });
}

// This function takes the input value in the find nearby area text input
// locates it, and then zooms into that area. This is so that the user can
// show all listings, then decide to focus on one area of the map.
// Based on Udacity's Google Maps API course
function zoomToArea(zoomAutocomplete) {
    
    queryLocation = zoomAutocomplete.getPlace().formatted_address;
    // console.log(queryLocation);

    // Get the address or place that the user entered.
    // since this function will only be called when user selects an option
    // from auto-complete results, it is okay to use queryLocation itself

    var address = queryLocation;
    // Make sure the address isn't blank.
    if (address === '') {
      window.alert('You must enter an area, or address.');
    } else {
        geocodeAndZoom(address);
    }
}

var yelpAccessToken;
var CORS_ANYWHERE_URL = 'https://cors-anywhere.herokuapp.com/';

// function to get access_token from Yelp Fusion API
function getYelpAccessToken(){
    // HACK to use client side JS with Yelp V3
    // https://github.com/Rob--W/cors-anywhere
    var yelpAuthUrl = CORS_ANYWHERE_URL + "https://api.yelp.com/oauth2/token";
    return $.ajax({
        url: yelpAuthUrl,
        method: "POST",
        data: {
            grant_type: 'client_credentials',
            client_id: 'FN__lFwA6r2MtH9jdbVnQA',
            client_secret: 'nJV84pTy5CxUprC1H6ArVYylEG5NQ1QL75laX3GkVtbvERL1gryeqnINnAD2zCi8'
        },
    });   
}

// function to get results from Yelp based on search string
function getYelpBusinesses(access_token, location, searchString){
    // use CORS_ANYWHERE hack for Yelp V3
    var yelpBusinessSearchUrl = CORS_ANYWHERE_URL + "https://api.yelp.com/v3/businesses/search";
    $.ajax({
        url: yelpBusinessSearchUrl,
        method: "GET",
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", "Bearer " + access_token);
        },
        data: {
            term: searchString,
            location: location,
            radius: 8000 // search within 5 miles
        }
    }).done(function(response){
        // console.log(response);
        // set mapCenter
        var region = response.region;
        mapCenter = new google.maps.LatLng(region.center.latitude, region.center.longitude);
        // populate the businesses from response
        response.businesses.forEach(function(business, index){
            // store distance in miles
            business["miles"] = (business.distance /(1000 * 1.6)).toFixed(1);
            // some CSS id stuff to expand/collapse business
            business["collapseId"] = 'collapse' + (index+1);
            business["collapseHref"] = '#collapse' + (index+1);
            // add price as null if not found
            if(business.price === undefined){
                business.price = null;
            }
            // push business into ViewModel's observable array
            appViewModel.yelpBusinesses.push(business);
        });
        createMarkers(appViewModel.yelpBusinesses);
    }).fail(function(error){
        // handle error on AJAX request
        alert("An error occured in getting Yelp results! Please try again.");
    });
}

// function to remove all markers from map
function removeMarkers(){
    for(var i = 0; i < markers.length; i++){
        markers[i].setMap(null);
    }
}


// function to create markers based on yelp results
function createMarkers(businesses){
    removeMarkers();
    markers = [];
    // iterate through observable array and create marker
    for(var i = 0; i < businesses().length; i++){
        var position = {lat: businesses()[i].coordinates.latitude, lng: businesses()[i].coordinates.longitude};
        var title = businesses()[i].name;
        var marker = new google.maps.Marker({
            position: position,
            title: title,
            id: businesses()[i].id,
            icon: defaultIcon
        });
        marker.setMap(map);
        // push marker into global markers array
        markers.push(marker);
        // add listener for click to open infoWindow
        marker.addListener('click',(function(marker){
            return function(){
                map.panTo(marker.getPosition());
                populateInfoWindow(marker, globalInfoWindow);
            };            
        })(marker));
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

// function to get info about a single business when it's clicked on results pane
function getBusinessInfo(id){
    var yelp_business_info_url = CORS_ANYWHERE_URL + "https://api.yelp.com/v3/businesses/" + id;
    return $.ajax({
        url: yelp_business_info_url,
        method: "GET",
        beforeSend: function(xhr){
            xhr.setRequestHeader("Authorization", "Bearer " + yelpAccessToken);
        }
    });    
}

// function to populate infowindow DOM
function populateInfoWindow(marker, infoWindow){
    if(infoWindow.marker != marker){
        marker.setIcon(highlightedIcon);        
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
            // console.log(response);

            // populate stuff to render on infoWindow
            var address = "";
            response.location.display_address.forEach(function(part){
                address += part + '<br>';
            });
            var categories = "";
            for(var i=0; i < response.categories.length; i++){
                categories += response.categories[i].title;
                if(i < response.categories.length - 1){
                    categories += ", ";
                }
            }
            var photos = "";
            response.photos.forEach(function(url){
                photos += '<img width="100" height="100" style="margin-right: 5px;" src="' + url + '" alt="yelp image">'; 
            });
            var open_now = (response.hours !== undefined) ? response.hours[0].is_open_now ? "Yes" : "No" : "N/A";
            var infoHtml = 
                '<div>' +
                  '<h4 style="color: #cc0000">' + response.name + '</h4>' + 
                  '<p> <b> Rating: </b>' + response.rating + ' (' + response.review_count + ' reviews) </p>' +
                  '<p> <b> Address: <br></b>' + address + ' </p>' +
                  '<p> <b> Phone: </b>' + response.display_phone + '</p>' +
                  '<p> <b> Open Now: </b>' + open_now + '</p>' +
                  '<p> <b> Category: </b>' + categories + '</p>' +
                  '<p> <b> Recent photos: </b><br>' + photos + '<br><br>' +
                  '<a href="' + response.url + '"> Yelp Page</a><br>' +
                  '<small class="text-muted"> Data provided by Yelp Fusion API</small>' +
                '</div>';
            infoWindow.setContent(infoHtml);
            infoWindow.open(map, marker); // to make infowindow fit again in map bounds
        }).fail(function(error){
            // handle error on AJAX request
            alert("An error occured in getting Yelp business API result! Please try again.");
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

// knockout ViewModel (MVVM paradigm)
var ViewModel = function(){
    var self = this;
    self.searchString = ko.observable("pizza");
    self.yelpBusinesses = ko.observableArray([]);
    self.sortOption = ko.observable(""); // parameter to sort by
    self.filterText = ko.observable(""); // filter text for search results

    // function to get search results from yelp, bound to "submit" event on form
    self.getSearchResults = function(){
        if(yelpAccessToken === undefined){
            getYelpAccessToken()
            .done(function(response){
                yelpAccessToken = response.access_token;
                // clear the businesses if already exists
                self.yelpBusinesses([]);
                getYelpBusinesses(yelpAccessToken, queryLocation, self.searchString(), self.yelpBusinesses);
            }).fail(function(error){
                alert("An error occured in getting Yelp access token! Please try again.");
            });            
        } else{
            // clear the businesses
            self.yelpBusinesses([]);
            getYelpBusinesses(yelpAccessToken, queryLocation, self.searchString(), self.yelpBusinesses);
        }
    };

    // function to uncolor all markers
    self.uncolorAll = function(){
        markers.forEach(function(marker){
            marker.setIcon(defaultIcon);
        });        
    };

    // function bound to click event on a business
    self.updateInfoWindow = function(){
        // set all markers to default color
        self.uncolorAll();
        var curr_id = this.id;
        markers.forEach(function(marker){
            if(marker.id == curr_id){
                // open info window for this marker
                populateInfoWindow(marker, globalInfoWindow);
            }
        });
    };

    // filter the results pane if filterText exists
    // use KO computed
    self.filteredBusinesses = ko.computed(function(){
        var filter = self.filterText().toLowerCase();
        if(!filter){
            // show all markers if filter is empty
            markers.forEach(function(marker){
                marker.setMap(map);
            });
            return self.yelpBusinesses();
        } else {
            // show only the markers that contain filter text
            markers.forEach(function(marker){
                if(marker.title.toLowerCase().indexOf(filter) === -1){
                    marker.setMap(null);
                } else{
                    marker.setMap(map);
                }
            });
            // filter the businesses array
            return ko.utils.arrayFilter(self.yelpBusinesses(), function(business){
                return business.name.toLowerCase().indexOf(filter) >= 0;
            });
        }
    }, this);

    // sort business results by distance
    self.sortByDistance = function(){
        self.sortOption("distance");
        self.yelpBusinesses.sort(function(business1, business2){
            if(business1.distance < business2.distance){
                return -1;
            } else if(business1.distance > business2.distance){
                return 1;
            } else {
                return 0;
            }
        });
        return true; // for radio button click highlight
    };

    // sort business results by rating
    self.sortByRating = function(){
        self.sortOption("rating");
        // sort by rating descending
        self.yelpBusinesses.sort(function(business1, business2){
            if(business1.rating < business2.rating){
                return 1;
            } else if(business1.rating > business2.rating){
                return -1;
            } else {
                return 0;
            }
        });
        return true; // for radio button click highlight
    };

    // sort business results by popularity (review count)
    self.sortByReviewCount = function(){
        self.sortOption("popularity");
        // sort by review count descending
        self.yelpBusinesses.sort(function(business1, business2){
            if(business1.review_count < business2.review_count){
                return 1;
            } else if(business1.review_count > business2.review_count){
                return -1;
            } else {
                return 0;
            }
        });        
        return true; // for radio button click highlight
    };
};

// create ViewModel and bind to KO
var appViewModel = new ViewModel();
ko.applyBindings(appViewModel);