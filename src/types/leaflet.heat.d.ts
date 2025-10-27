import * as L from 'leaflet';

declare module 'leaflet' {
  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: any;
  }

  function heatLayer(latlngs: L.LatLngExpression[], options?: HeatLayerOptions): L.Layer;
}
