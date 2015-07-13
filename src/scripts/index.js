// Globals and general ugliness.
window.$ = require('jquery');
window.jQuery = $;
require('../../node_modules/bootstrap/dist/js/bootstrap.min.js');
var versioning = require('./_includes/versioning');
window.L = require('leaflet');
require('leaflet-draw');
var MapBuilder = require('./_includes/mapbuilder');
var mapBuilder;

$(document).ready(function(){
    mapBuilder = new MapBuilder({
        ele: $('#map')[0],
        initialView: [90,0,-90,180]
    });

    $('body').on('click', '[data-action]', function(){
        var opts = $(this).data();
        if(actions[opts.action]){
            actions[opts.action](opts);
        } else {
            throw 'invalid action';
        }
    });

    $('#search-form').submit(function(){
        mapBuilder.search($('#search').val());
        return false;
    });
});


var actions = {
    save: function(){
        mapBuilder.save(function(e, json){
            var download = require('./_includes/download-string');
            download('my-map.geo.json', JSON.stringify(json,null,2));
        });
    },
    load: function(){
        mapBuilder.load(require('./sample.json'), function(e, msg){
            console.log(e, msg);
        });
    }
};
