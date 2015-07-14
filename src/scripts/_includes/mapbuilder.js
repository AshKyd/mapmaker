require('./serializeobject');
var WeakMap = require('es6-weak-map');
var JsonEditor = require('json-editor');
var geodata = require('./geodata');

JSONEditor.defaults.options.theme = 'bootstrap3';
JSONEditor.defaults.options.disable_collapse = true;
JSONEditor.defaults.options.disable_properties = true;
JSONEditor.defaults.options.disable_edit_json = true;
L.Icon.Default.imagePath = 'images/';

var icons = {};
['red','orange','yellow','green','blue','violet'].forEach(function(color){
    icons[color] = L.icon({
        iconUrl: 'images/marker-'+color+'.png',
        iconRetinaUrl: 'images/marker-'+color+'-2x.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [-3, -76]
    });
});

function MapBuilder(opts){
    var _this = this;

    var map = L.map(opts.ele).setView([51.505, -0.09], 13);
    L.tileLayer('https://tiles.ash.ms/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    // Initialise the FeatureGroup to store editable layers
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    map.on('click mapmove', function(){
        _this.propPaneHide();
        if(_this.searchPoint){
            _this.searchPoint = undefined;
            _this.map.removeLayer(_this.searchPoint);
        }
    });

    // Initialise the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    _this.layerOnClick = function(e){
        _this.propPaneLoad(e.target);
        console.log(e.target);
        return false;
    };

    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;

        if (type === 'marker') {
            // Do marker specific actions
        }

        drawnItems.addLayer(layer);
        layer.on('click', _this.layerOnClick);
        _this.propPaneLoad(layer);
    });

    _this.schema = {
        base: require('../schema/base')
    };

    _this.opts = opts;
    _this.map = map;
    _this.drawnItems = drawnItems;
    _this.drawControl = drawControl;
    _this.properties = new WeakMap();
    _this.propPane = $(opts.ele).next();
    _this.propPaneHide();
}

MapBuilder.prototype = {
    save: function(cb){
        var _this = this;
        var propMap = _this.drawnItems.getLayers().map(function(layer){
            return _this.properties.get(layer);
        });
        var geojson = _this.drawnItems.toGeoJSON();
        geojson.features.forEach(function(feature, i){
            feature.properties = propMap[i];
        });
        cb(null, geojson);
    },
    load: function(providedJson, cb){
        var _this = this;
        _this.drawnItems.clearLayers();
        try{
            L.geoJson(providedJson, {
                style: function(feature) {
                    if(feature.properties.style){
                        return feature.properties.style;
                    }
                },
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng);
                },
                onEachFeature: function(feature, layer) {
                    _this.setProps(layer, feature.properties);
                    layer.on('click', _this.layerOnClick);
                }
            }).addTo(_this.drawnItems);

            _this.map.fitBounds(_this.drawnItems.getBounds());
        }catch(e){
            return cb(e);
        }
        return cb(null, _this);
    },
    propPaneShow: function(){
        this.propPane.css('transform', 'translateX(0)');
    },
    propPaneHide: function(){
        var _this = this;
        _this.propPane.css('transform', 'translateX('+_this.propPane.outerWidth()+'px)');
        window.setTimeout(function(){
            if(_this.editor){
                _this.editor.destroy();
            }
        },200);
    },
    propPaneLoad: function(layer){
        var _this = this;
        _this.propPaneShow();

        if(_this.editor){
            _this.editor.destroy();
        }

        var startval = this.properties.get(layer);
        var editor = new JSONEditor(_this.propPane[0], {
            schema: _this.schema.base,
            startval: startval
        });
        editor.on('change', function(){
            _this.setProps(layer, editor.getValue());
        });
        _this.editor = editor;
        _this.setProps(layer, editor.getValue());
    },
    setProps: function(layer, props){
        var _this = this;
        _this.properties.set(layer, props);
        if(layer.setStyle){
            layer.setStyle(props.style);
        }
        if(props.marker && props.marker.icon){
            var icon = icons[props.marker.icon];
            if(icon && layer.setIcon){
                layer.setIcon(icon);
            }
        }
    },
    search: function(){
        var _this = this;
        geodata.search($('#search').val(), function(err, results){
            if(err){
                alert('An error occurred while searching.');
            } else {
                var result = results.results[0];
                _this.map.panTo(result.latlng);
                var template = $('<div><h2></h2><button class="btn btn-default" id="add-point">Add to map</button></div>')
                    .find('h2')
                        .text(result.name)
                        .end()
                    .html();

                _this.searchPoint = new L.Marker(result.latlng)
                    .bindPopup(template)
                    .addTo(_this.map)
                    .openPopup();

                $('#add-point').click(function(){
                    _this.map.removeLayer(_this.searchPoint);
                    var newMarker = new L.Marker(result.latlng)
                        .on('click', _this.layerOnClick)
                        .addTo(_this.drawnItems);
                    _this.propPaneLoad(newMarker);
                    var val = _this.editor.getValue();
                    val.name = result.name;
                    _this.editor.setValue(val);
                    _this.searchPoint = undefined;
                });
            }
        });
    }
};

module.exports = MapBuilder;
