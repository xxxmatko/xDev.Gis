define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/query",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/dom-style",
  "esri/domUtils",
  "esri/SpatialReference",
  "esri/layers/layer",
  "esri/layers/TileInfo",
  "esri/geometry/Extent",
  "esri/geometry/webMercatorUtils",
  "../../Maps"
],
function(declare, lang, array, query, on, domConstruct, domStyle, domUtils, SpatialReference, Layer, TileInfo, Extent, webMercatorUtils, GoogleMaps){
  var GoogleMapsLayer = declare([Layer], {
    //#region [ Fields ]
    
    _gmap_maptypechanged_connect: null,
    _gmap_tiltchanged_connect: null,
    _gmap_idle_connect: null,
    _streetView_visiblechanged_connect: null,
    _map_extentchange_connect: null,
    _map_pan_connect: null,
    _map_resize_connect: null,
    _layer_visibilitychange_connect: null,
    _layer_opacitychange_connect: null,

    _gmap: null,
    _gmapDiv: null,
    _pegmanDiv: null,
    _streetViewDiv: null,
    _streetViewService: null,
    _streetView: null,

    _replacePegman_timeout: null,

    mapType: null,
    styles: null,
    allowStreetView: null,

    //#endregion


    //#region [ Constructor ]  

    constructor: function(args) {
      args = args || {};
// TODO : SKONTROLOVAT CI NIE JE LEPSI EVENT NA REAKCIU ZMENU EXTENTU, ABY SA ZACALA ZMENA NARAZ
      // Set the spatial reference - need because of skippin after mousewheel to different location
      this.spatialReference = new SpatialReference({ 
        wkid: 102100 
      });

      // This tileInfo does not actually do anything. It simply tricks nav control to show a slider bar if only gmaps are used, which should be a rare case
      this.tileInfo = new TileInfo({
        rows: 256,
        cols: 256,
        dpi: 96,
        origin: {
          x: -20037508.342787,
          y: 20037508.342787
        },
        spatialReference: {
          wkid: 102100
        },
        lods: [{
          level: 0, resolution: 156543.033928, scale: 591657527.591555
        }, {
          level: 1, resolution: 78271.5169639999,scale: 295828763.795777
        }, {
          level: 2, resolution: 39135.7584820001, scale: 147914381.897889
        }, {
          level: 3, resolution: 19567.8792409999, scale: 73957190.948944
        }, {
          level: 4, resolution: 9783.93962049996, scale: 36978595.474472
        }, {
          level: 5, resolution: 4891.96981024998, scale: 18489297.737236
        }, {
          level: 6, resolution: 2445.98490512499, scale: 9244648.868618
        }, {
          level: 7, resolution: 1222.99245256249, scale: 4622324.434309
        }, {
          level: 8, resolution: 611.49622628138, scale: 2311162.217155
        }, {
          level: 9, resolution: 305.748113140558, scale: 1155581.108577
        }, {
          level: 10, resolution: 152.874056570411, scale: 577790.554289
        }, {
          level: 11, resolution: 76.4370282850732, scale: 288895.277144
        }, {
          level: 12, resolution: 38.2185141425366, scale: 144447.638572
        }, {
          level: 13, resolution: 19.1092570712683, scale: 72223.819286
        }, {
          level: 14, resolution: 9.55462853563415, scale: 36111.909643
        }, {
          level: 15, resolution: 4.77731426794937, scale: 18055.954822
        }, {
          level: 16, resolution: 2.38865713397468, scale: 9027.977411
        }, {
          level: 17, resolution: 1.19432856685505, scale: 4513.988705
        }, {
          level: 18, resolution: 0.597164283559817, scale: 2256.994353
        }, {
          level: 19, resolution: 0.298582141647617, scale: 1128.497176
        }, {
          level: 20, resolution: 0.149291070823808, scale: 564.248588
        }]
      });

      this.fullExtent = new Extent({
        xmin: -20037508.34,
        ymin: -20037508.34,
        xmax: 20037508.34,
        ymax: 20037508.34,
        spatialReference: {
          wkid: 102100
        }
      });

      this.initialExtent = new Extent({
        xmin: -20037508.34,
        ymin: -20037508.34,
        xmax: 20037508.34,
        ymax: 20037508.34,
        spatialReference: {
          wkid: 102100
        }
      });

      this.opacity = (typeof(args.opacity) === "number") ? args.opacity : 1;
      this.mapType = (typeof(args.mapType) === "string") ? args.mapType : GoogleMapsLayer.MAP_TYPE_ROADMAP;
      this.styles = (args.styles instanceof Array) ? args.styles : [];
      this.allowStreetView = (typeof(args.allowStreetView) === "boolean") ? args.allowStreetView : false;

      // It seems _setMap will only get called if loaded = true, so set it here first
      this.loaded = true;
      this.onLoad(this);
    },

    //#endregion


    //#region [ Methods : Public ]

    /**
     * Gets handle for the Google Map instance.
     */
    getGMap: function() {
      return this._gmap;
    },


    /**
     * Sets layer opacity.
     *
     * @param {number} value Opacity value from 0-1.
     */
    setOpacity: function(value) {
      if (typeof (value) !== "number") {
          throw new TypeError("GoogleMapsLayer : setOpacity() : Invalid type of argument 'value'.");
      } 

      value = Math.min(Math.max(value, 0), 1);

      // Store the new value
      var hasChanged = this.opacity != value;
      this.opacity = value;

      if(!this._gmapDiv || !hasChanged) {
        return;
      }

      // Change the opacity of the div
      domStyle.set(this._gmapDiv, "opacity", this.opacity);

      // Emit event using esri default emitter
      this.onOpacityChange(this.opacity);
    },


    /**
     * Sets map type of the Google map.
     *
     * @param {string} value Map type.
     */
    setMapType: function(value) {
      if (typeof (value) !== "string") {
          throw new TypeError("GoogleMapsLayer : setMapType() : Invalid type of argument 'value'.");
      } 

      var types = [
        GoogleMapsLayer.MAP_TYPE_SATELLITE,
        GoogleMapsLayer.MAP_TYPE_HYBRID,
        GoogleMapsLayer.MAP_TYPE_ROADMAP,
        GoogleMapsLayer.MAP_TYPE_TERRAIN
      ];

      // Check for the valid map type
      if (types.indexOf(value) === -1) {
          throw new Error("GoogleMapsLayer : setMapType() : Parameter 'mapType' (" + value + ") is invalid.");
      }

      // Store the new value
      var hasChanged = this.mapType != value;
      this.mapType = value;

      // If the google map is not ready finish now
      if(!this._gmap || !hasChanged) {
        return;
      }

      // Disconnect gmap event handler for the map type change event
      if (this._gmap_maptypechanged_connect) {
        GoogleMaps.event.removeListener(this._gmap_maptypechanged_connect);
        this._gmap_maptypechanged_connect = null;
      }

      // Set the map type for the google map
      this._gmap.setMapTypeId(this._getGoogleMapType(this.mapType));

      // Reconnect for the gmap event map type change event
      this._gmap_maptypechanged_connect = GoogleMaps.event.addListener(this._gmap, "maptypeid_changed", lang.hitch(this, this._gmap_onMapTypeChanged));

      // Emit change event
      this._onMapTypeChanged({
        mapType: this.mapType
      });
    },


    /**
     * Sets map type of the Google map.
     *
     * @param {string} value Map type.
     */
    setStyles: function(value) {
      value = value || [];

      if (!(value instanceof Array)) {
          throw new TypeError("GoogleMapsLayer : setStyles() : Invalid type of argument 'value'.");
      } 

      this.styles = value;

      // If the google map is not ready finish now
      if(!this._gmap) {
        return;
      }

      // Set the styles for the google maps
      this._gmap.setOptions({
        styles: this.styles
      });
    },


    /**
     * Sets whether the street view is allowed or not.
     *
     * @param {boolean} value If set to true, street view is allowed.
     */
    setAllowStreetView: function(value) {
      if (typeof (value) !== "boolean") {
          throw new TypeError("GoogleMapsLayer : setAllowStreetView() : Invalid type of argument 'value'.");
      } 

      // Store the new value
      var hasChanged = this.allowStreetView != value;
      this.allowStreetView = value;

      // If the google map is not ready finish now
      if(!this._gmap || !hasChanged) {
        return;
      }

      // Hide Street view and hide pegman if street view is disabled
      if(!this.allowStreetView) {
        domUtils.hide(this._pegmanDiv);
        // Hide the street view
        if (this._streetView) {
          this._streetView.setVisible(false);
        }
        return;
      }

      domUtils.show(this._pegmanDiv);
    },
    
    //#endregion


    //#region [ Methods : Private ]

    /**
     * Sets extent for the layer.
     *
     * @param {object} extent Instance of an esri Extent.
     */
    _setExtent: function(extent) {
      // Get extent center
      var center = webMercatorUtils.webMercatorToGeographic(extent.getCenter());
      center = new GoogleMaps.LatLng(center.y, center.x);

      // Get extent bounds      
      var bounds = webMercatorUtils.webMercatorToGeographic(extent.expand(0.5));
      bounds = new GoogleMaps.LatLngBounds(
        new GoogleMaps.LatLng(bounds.ymin, bounds.xmin, true), 
        new GoogleMaps.LatLng(bounds.ymax, bounds.xmax, true)
      );
    
      this._gmap.fitBounds(bounds);
      this._gmap.setCenter(center);
    },


    /**
     * Gets the Google maps type.
     *
     * @param {string} type Internal map type.
     */
    _getGoogleMapType: function(type) {
      switch (type.toLowerCase()) {
        case GoogleMapsLayer.MAP_TYPE_ROADMAP:
          return GoogleMaps.MapTypeId.ROADMAP;

        case GoogleMapsLayer.MAP_TYPE_HYBRID:
          return GoogleMaps.MapTypeId.HYBRID;

        case GoogleMapsLayer.MAP_TYPE_SATELLITE:
          return GoogleMaps.MapTypeId.SATELLITE;

        case GoogleMapsLayer.MAP_TYPE_TERRAIN:
          return GoogleMaps.MapTypeId.TERRAIN;

        default:
          throw new Error("GoogleMapsLayer : _getGoogleMapType() : Unsupported map type '" + type + "'.");
          break;
      }
    },


    /**
     * Creates HTML element for the layer.
     *
     * @param {object} map Instance of the map.
     * @param {HTMLNode} container HTML element which is the container for layer elements.
     */
    _setMap: function(map, container) {
      this.inherited(arguments);

      // Store map instance
      this._map = map;

      // Create default style
      var style = {
          position: "absolute",
          top: 0,
          left: 0,
          width: (this._map.width || container.offsetWidth) + "px",
          height: (this._map.height || container.offsetHeight) + "px"
      }

      // Create layer div
      this._div = domConstruct.create("div", {
        id: this.id,
        style: lang.mixin({}, style, {
          width: 0,
          height: 0
        }) 
      }, container);

      // Create element for the Google maps 
      this._gmapDiv = domConstruct.create("div", {
        id: this._map.id + "_" + this.id + "_gmap",
        style: style
      }, this._div);

      // Create element for the pegman
      this._pegmanDiv = domConstruct.create("div", {
        id: this._map.id + "_" + this.id + "_gmap_controls_pegman",
        style: {
          position: "absolute",
          top: "5px",
          left: "5px"
        }
      }, this._map.root);

      // Create element for the streetview
      this._streetViewDiv = domConstruct.create("div", {
        id: this._map.id + "_" + this.id + "_gmap_streetview",
        style: style
      }, this._map.root);

      // Connect for the layer visibility events
      this._layer_visibilitychange_connect = on(this, "visibility-change", lang.hitch(this, "_layer_onVisibilityChange"));
      this._layer_opacitychange_connect = on(this, "opacity-change", lang.hitch(this, "_layer_onOpacityChange"));

      // Initialise google maps
      if (this.visible) {
        this._initGoogleMaps();
      }
      
      return this._div;
    },


    /**
     * Destroys HTML element for the layer.
     */
    _unsetMap: function() {
      // Kill connect to esri map
      array.forEach([
        "_layer_visibilitychange_connect",
        "_layer_opacitychange_connect",
        "_map_extentchange_connect",
        "_map_pan_connect",
        "_map_resize_connect"
      ], function(handler) {
        if(this[handler] && typeof(this[handler].remove) === "function") {
          this[handler].remove();
          this[handler] = null;
        }
      }, this);
    
      // Kill connects to google map
      array.forEach([
        "_gmap_maptypechanged_connect",
        "_gmap_tiltchanged_connect",
        "_gmap_idle_connect",
        "_streetView_visiblechanged_connect"
      ], function(handler) {
        if(this[handler]) {
          GoogleMaps.event.removeListener(this[handler]);
          this[handler] = null;
        }
      }, this);

      if (this._streetView) {
        this._streetView.setVisible(false);
      }

      this._streetViewService = null;
      this._streetView = null;
      this._gmap = null;
    
      // Destroy created html nodes
      domConstruct.destroy(this._streetViewDiv);
      domConstruct.destroy(this._pegmanDiv);
      domConstruct.destroy(this._gmapDiv);
      domConstruct.destroy(this._div);
    },    


    /**
     * Initialises google maps.
     */
    _initGoogleMaps: function() {
      // Get the current extent
      var extent = this._map.extent;

      // Get the center from map constructor or from its extent
      var center = !extent ? this._map._params.center : webMercatorUtils.webMercatorToGeographic(extent.getCenter());
      center = new GoogleMaps.LatLng(center.y, center.x);

      // Get the level
      var level = this._map._params.zoom || this._map.getLevel();

      // Prepare options for the Google maps
      var params = {
        center: center,
        zoom: (level > -1) ? level : 1,
        panControl: false,
        mapTypeControl: false,
        zoomControl: false,
        scaleControl: false,
        streetViewControl: this.allowStreetView,
        mapTypeId: this._getGoogleMapType(this.mapType),
        styles: this.styles
      };

      // Create the instance of the Google maps
      this._gmap = new GoogleMaps.Map(this._gmapDiv, params);

      // Set the extent after map load if there is not level at the beginning
      if (level < 0) {
        on.once(this._map, "load", lang.partial(lang.hitch(this, "_map_onLoad"), extent));
      }

      // TODO : NEED TO SET EXTENT AGAIN - PROBLEM WHEN SCROLL MOVE TO DIFFERENT AREA
      //this._setExtent(extent);

      // Init streetview
      this._streetViewService = new GoogleMaps.StreetViewService();
      this._streetView = new GoogleMaps.StreetViewPanorama(this._streetViewDiv, {
        enableCloseButton: true,
        visible: false,
        panControl: true
      });
      this._gmap.setStreetView(this._streetView);

      // Connect to map events
      this._map_extentchange_connect = on(this._map, "extent-change", lang.hitch(this, "_map_onExtentChange"));
      this._map_pan_connect = on(this._map, "pan", lang.hitch(this, "_map_onPan"));
      this._map_resize_connect = on(this._map, "resize", lang.hitch(this, "_map_onResize"));
      
      // Connect to google maps events
      this._gmap_maptypechanged_connect = GoogleMaps.event.addListener(this._gmap, "maptypeid_changed", lang.hitch(this, "_gmap_onMapTypeChanged"));
      this._gmap_tiltchanged_connect = GoogleMaps.event.addListener(this._gmap, "tilt_changed", lang.hitch(this, "_gmap_onTiltChanged"));
      this._gmap_idle_connect = GoogleMaps.event.addListener(this._gmap, "idle", lang.hitch(this, "_gmap_onIdle"));
      GoogleMaps.event.addListenerOnce(this._gmap, "tilesloaded", lang.hitch(this, "_gmap_onTilesLoaded"));

      // Connect to stretview events
      this._streetView_visiblechanged_connect = GoogleMaps.event.addListener(this._streetView, "visible_changed", lang.hitch(this, "_streetView_onVisibleChanged"));
    },


    /**
     * Moves the pegman control to the target div.
     */
    _replacePegman: function() {
      // Clear the timeout if needed
      if(this._replacePegman_timeout) {
        clearTimeout(this._replacePegman_timeout);
        this._replacePegman_timeout = null;
      }

      // Get the pegman
      var pegman = query("img[src*=cb_scout]", this._gmapDiv)[0];
      if(pegman) {
        domConstruct.place(pegman.parentNode.parentNode, this._pegmanDiv);
        return;
      }

      // Wait for the pegman
      this._replacePegman_timeout = setTimeout(lang.hitch(this, "_replacePegman"), 25);
    },

    //#endregion


    //#region [ Event Triggers ]

    /**
     * Fires "maptype-changed" event.
     *
     * @param {objec} e Event arguments.
     */
    _onMapTypeChanged: function(e) {
      this.emit("maptype-changed", e);
    },


    /**
     * Fires "streetview-visibility-changed" event.
     *
     * @param {objec} e Event arguments.
     */
    _onStreetViewVisibilityChanged: function(e) {
      this.emit("streetview-visibility-changed", e);
    },

    //#endregion


    //#region [ Event Handlers ]

    /**
     * Event handler for the map "load" event.
     *
     * @param {object} e Event arguments.
     */
    _map_onLoad: function(extent, e) {
      this._setExtent(extent);
    },


    /**
     * Event handler for the "visibility-change" event.
     *
     * @param {object} e Event arguments.
     */
    _layer_onVisibilityChange: function(e) {
      console.info("_layer_onVisibilityChange(%o)", e);
      // TODO : SKONTROLOVAT PRECO PO UPDATE VISIVIBLE TRUE SA ZMENI EXTENT NA BLBY , pozri metodu _setExtent ci robi spravne to co robit ma - pri inciializacii sa totiz pouzije center
      // aj pri posune, len pri zoom eto blbne
      // We are going to show the layer
      if(e.visible) {
        domUtils.show(this._gmapDiv);
        domUtils.show(this._pegmanDiv);

        // If the google map is not started yet than do it now
        if (!this._gmap) {
          this._initGoogleMaps();
          return;
        }

        // Resize the google map to the current size        
        GoogleMaps.event.trigger(this._gmap, "resize");

        // TODO : SHOULD I SET EXTENT AGAIN? - AFTER HIDE AND SHOW AGAIN THE EXTENT IS WRONG !!!
        this._setExtent(this._map.extent);

        // Reconnect event handlers
        this._map_extentchange_connect = this._map_extentchange_connect || on(this._map, "extent-change", lang.hitch(this, "_map_onExtentChange"));
        this._map_pan_connect = this._map_pan_connect || on(this._map, "pan", lang.hitch(this, "_map_onPan"));
        return;
      }

      // We are going to hide the google maps layer
      if (!this._gmapDiv) {
        return;
      }

      domUtils.hide(this._gmapDiv);
      domUtils.hide(this._pegmanDiv);
        
      if (this._gmap) {
        // Get google maps current bounds
        var bounds = this._gmap.getBounds();

        // Create esri extent
        var extent = new Extent(
          bounds.getSouthWest().lng(), 
          bounds.getSouthWest().lat(), 
          bounds.getNorthEast().lng(), 
          bounds.getNorthEast().lat()
        );

        // Set the map extent
        this._map.setExtent(webMercatorUtils.geographicToWebMercator(extent));
      }

      // Hide the street view
      if (this._streetView) {
        this._streetView.setVisible(false);
      }

      // Remove connects
      if(this._map_pan_connect) {
        this._map_pan_connect.remove();
        this._map_pan_connect = null;
      }
      if(this._map_extentchange_connect) {
        this._map_extentchange_connect.remove();
        this._map_extentchange_connect = null;
      }
    },


    /**
     * Event handler for the "opacity-change" event.
     *
     * @param {object} e Event arguments.
     */
    _layer_onOpacityChange: function (e) {
      console.info("_layer_onOpacityChange(%o)", e);
    },


    /**
     * Event handler for the google map "maptypeid_changed" event.
     */
    _gmap_onMapTypeChanged: function() {
      console.info("_gmap_onMapTypeChanged()");

      // Change the inner value
      this.setMapType(this._gmap.getMapTypeId());
    },


    /**
     * Event handler for the google map "idle" event.
     */
    _gmap_onIdle: function() {
      console.info("_gmap_onIdle()");
    },


    /**
     * Event handler for the google map "tilesloaded" event.
     */
    _gmap_onTilesLoaded: function() {
      console.info("_gmap_onTilesLoaded()");
      this._replacePegman();
    },


    /**
     * Event handler for the google map "tilt_changed" event.
     */
    _gmap_onTiltChanged: function() {
      console.info("_gmap_onTiltChanged()");
      /*
      // when oblique is shown, we should disable esri mouse events because the projection changes.
          var t = this._gmap.getTilt();
          if (t == 45) {
            //this._toggleEsriControl(true);
            //this._map._isPanGMaps = this._map.isPan;
            //this._map.disablePan();
            dojo.place(this._gmapDiv, this._topDiv);
            this._map.disableMapNavigation();
          } else if (t == 0) {
            //this._toggleEsriControl(false);
            //if (this._map._isPanGMaps) this._map.enablePan();
            dojo.place(this._gmapDiv, this._element);
            this._map.enableMapNavigation();
          }
      */
    },


    /**
     * Event handler for the streetview "visible_changed" event.
     */
    _streetView_onVisibleChanged: function() {
      var isVisible = this._streetView.getVisible();
      console.info("visible_changed(%o)", isVisible);

      if(isVisible) {
        domUtils.show(this._streetViewDiv);
      }
      else {
        domUtils.hide(this._streetViewDiv);
      }

      this._onStreetViewVisibilityChanged({
        isStreetViewVisible: isVisible
      });
    },


    /**
     * Event handler fot he esri map "extent-change" event.
     *
     * @param {object} e Event arguments.
     */
    _map_onExtentChange: function(e) {
      console.warn("_map_onExtentChange(%o)", arguments);
      
      if (e.levelChange) {
        this._setExtent(e.extent);
        return;
      } 

      var center = webMercatorUtils.webMercatorToGeographic(e.extent.getCenter());
      center = new GoogleMaps.LatLng(center.y, center.x);

      this._gmap.setCenter(center);
    },


    /**
     * Event handler fot he esri map "pan" event.
     *
     * @param {object} e Event arguments.
     */
    _map_onPan: function(e) {
      console.warn("_map_onPan(%o)", arguments);
      
      if (this._gmap.getTilt() != 0) {
        return;
      }

      var center = webMercatorUtils.webMercatorToGeographic(e.extent.getCenter());
      center = new GoogleMaps.LatLng(center.y, center.x);

      this._gmap.setCenter(center);
    },


    /**
     * Event handler fot he esri map "resize" event.
     *
     * @param {object} e Event arguments.
     */
    _map_onResize: function(e) {
      console.warn("_map_onResize(%o)", arguments);
      
      if(!this._gmapDiv) {
        return;
      }

      var style = {
        width: e.width + "px",
        height: e.height + "px"
      };

      domStyle.set(this._gmapDiv, style);
      domStyle.set(this._streetViewDiv, style);

      GoogleMaps.event.trigger(this._gmap, "resize");
    }
    
    //#endregion
  });


  /**
   * Map types.
   */
  lang.mixin(GoogleMapsLayer, {
    MAP_TYPE_SATELLITE: "satellite",
    MAP_TYPE_HYBRID: "hybrid",
    MAP_TYPE_ROADMAP: "roadmap",
    MAP_TYPE_TERRAIN: "terrain"
  });


  /**
   * Map styles.
   */
  lang.mixin(GoogleMapsLayer, {
    MAP_STYLE_GRAY: [{
      featureType: "all",
      stylers: [{
        saturation: -80
      }, {
        lightness: 20
      }]
    }],
    MAP_STYLE_LIGHT_GRAY: [{
      featureType: "all",
      stylers: [{
        saturation: -80
      }, {
        lightness: 60
      }]
    }],
    MAP_STYLE_NIGHT: [{
      featureType: "all",
      stylers: [{
        invert_lightness: "true"
      }]
    }]
  });


  return GoogleMapsLayer;
});