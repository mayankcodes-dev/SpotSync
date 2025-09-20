maptilersdk.config.apiKey = maptilerApiKey;

const parsedCampground = JSON.parse(campground);

const map = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.BRIGHT,
    center: campground.geometry.coordinates, // starting position [lng, lat]
    zoom: 10 // starting zoom
});

new maptilersdk.Marker()
    .setLngLat(parsedCampground.geometry.coordinates)
    .setPopup(
        new maptilersdk.Popup({ offset: 25 })
            .setHTML(
                `<h3>${parsedCampground.title}</h3><p>${parsedCampground.location}</p>`
            )
    )
    .addTo(map)