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
