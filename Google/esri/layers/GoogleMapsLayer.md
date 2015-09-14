# GoogleMapsLayer

## Popis
Implementácia esri layer-a pre zobrazenie Google Maps ako ďalšej vrstvy v mape.

## Príklady
* [GoogleMapsLayer](https://github.com/xxxmatko/xDev.Gis/blob/master/Examples/GoogleMapsLayer.html)

## Konštruktor
Názov								| Popis
----------------------------------- | ---------------------------------------------------------------------------------------------------------------------
new GoogleMapsLayer(url, options?)	| Vytvorí nový GoogleMapsLayer objekt.

## Vlastnosti
Názov				| Typ 		| Popis
------------------- | ---------	| ---------------------------------------------------------------------------------------------------------------------
allowStreetView		| bool		| Ak je ```true```, tak je povolené zapnutie street view.
mapType				| string	| Typ zobrazovanej mapy.
opacity				| number	| Nastavenie priehľadnosti mapy.
styles				| object 	| Definícia štýlov pre zobrazovanú mapu.

## Metódy
Názov						| Návratový typ	| Popis
--------------------------- | -------------	| ---------------------------------------------------------------------------------------------------------------------
getGMap						| object		| Vráti objekt reprezentujúci inštanciu Google mapy.
setOpacity(value)			| 				| Nastaví prehliadnosť mapy.
setMapType(value)			|				| Nastaví typ zobrazovanej mapy. Podporované typy sú: GoogleMapsLayer.MAP_TYPE_SATELLITE, GoogleMapsLayer.MAP_TYPE_HYBRID, GoogleMapsLayer.MAP_TYPE_ROADMAP, GoogleMapsLayer.MAP_TYPE_TERRAIN.
setStyles(value)			| 				| Nastaví štýl zobrazovanej mapy.
setAllowStreetView(value)	|				| Nastaví hodnotu, ktorá ak je ```true```, tak je povolené zapnúť Street View.

## Udalosti
Názov				| Parametre					| Popis
------------------- | -------------------------	| ---------------------------------------------------------------------------------------------------------------------
maptype-changed		| ```javascript
						{  
							mapType: <string>  
						}```						| sd
