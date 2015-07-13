module.exports = {
    search: function(keyword, cb){
        $.ajax({
            url: 'http://open.mapquestapi.com/nominatim/v1/search.php',
            method: 'get',
            datatype: 'json',
            data: {
                format: 'json',
                q: keyword
            },
            error: function(e){
                cb(e);
            }
        }).done(function(result){
            result = result.map(function(item){
                return {
                    name: item.display_name,
                    latlng: new L.LatLng(item.lat, item.lon)
                };
            });
            cb(null, {
                attribution: 'MapQuest',
                results: result
            });
        });
    }
};
