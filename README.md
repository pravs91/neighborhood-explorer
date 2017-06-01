# Neighborhood explorer 
A web app to explore points of interest in a neighborhood using Google Maps and Yelp Fusion APIs.

## Technologies used
- [Knockout JS](http://knockoutjs.com/documentation/introduction.html)
- [Google Maps API](https://developers.google.com/maps/documentation/javascript/)
- [Yelp Fusion API](https://www.yelp.com/developers/documentation/v3)
- HTML, CSS, Javascript
- Bootstrap framework
- jQuery

## Features
- Users can zoom into region of interest using Google Maps SearchBox. Auto-complete of search term is provided using Google Maps Geocoding API
- Users can search points of interest using the search box. Data is retrieved from Yelp Fusion APIs using AJAX calls
- Clicking on a business will open an InfoWindow on the marker with additional information. 
- Results can be filtered by name (Knockout declarative bindings are used to show relevant results on map)
- Results can be filtered by distance, rating and popularity (review count)

## To use the app
Clone this repository and open index.html. Make sure Knockout JS is installed.
