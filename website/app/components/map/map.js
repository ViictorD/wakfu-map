import './map.scss'
import L from 'leaflet'
import 'leaflet-ellipse'
import { Component } from '../component'
import template from './map.html'

const yx = L.latLng;

const xy = (x, y) => {
	if (L.Util.isArray(x)) {
		return yx(x[1], x[0]);
	}
	return yx(y, x);
};

export class Map extends Component {
	constructor (mapPlaceholderId, props) {
		super(mapPlaceholderId, props, template)
		this.lang = props.lang
		this.map = null
		this.layers = {}
		this.dungeonPopup = null
		this.focusTerritoryId = null
		this.npcMarker = null
		this.draggableMarker = null
	}
	
	initMap(map_id, map_data, markers, isIndoor, dest_point = null, zoom_level = null, latlng = null) {
		this.markers = markers
		const tiles_width = map_data.width + (256 - (map_data.width + 256) % 256)
		const tiles_height = map_data.height + (256 - (map_data.height + 256) % 256)
		
		let half_map_width = map_data.width / 2
		let half_map_height = map_data.height / 2
		const map_bounds = [
			xy(-half_map_width, -half_map_height),
			xy([map_data.width + half_map_width, map_data.height + half_map_height])
		 ]
		const tiles_bounds = [xy(0, 0), xy([tiles_width, tiles_height])];
		
		const factor = 1 / Math.pow(2, map_data.max_zoom)
		const customCRS = L.extend({}, L.CRS.Simple, {
			transformation: new L.Transformation(factor, 0, factor, 0)
		});
		this.map = L.map(this.refs.mapContainer, {
			crs: customCRS,
			maxBounds: map_bounds,
			minZoom: map_data.min_zoom,
			maxZoom: map_data.max_zoom,
		})
		
		this.map.zoomControl.setPosition('bottomright')
	
		L.tileLayer(`${window.location.origin}/img/tiles/${map_id}/${isIndoor ? 'indoor' : 'outdoor'}/{z}/{x}_{y}.png`, {
			bounds: tiles_bounds,
			noWrap: true,
			minZoom: map_data.min_zoom,
			maxZoom: map_data.max_zoom,
			tms: true,
			continuousWorld: false,
		}).addTo(this.map)
		
		if (latlng != null && latlng.lat != null && latlng.lng != null
			&& latlng.lat >= map_bounds[0].lat && latlng.lat <= map_bounds[1].lat
			&& latlng.lng >= map_bounds[0].lng && latlng.lng <= map_bounds[1].lng) {
			this.createDraggableMarker({x: latlng.lng, y: latlng.lat}, false, false)
			dest_point = [latlng.lng, latlng.lat]
		}

		let fitBounds = [xy(0, 0), xy([map_data.width, map_data.height])]
		if (dest_point != null) {
			if (zoom_level != null) {
				this.map.setView(xy(dest_point), zoom_level);
			}
			else {
				this.map.setView(xy(dest_point), map_data.max_zoom);
			}
		}
		else {
			this.map.fitBounds(fitBounds);
		}

	}

	removeMap() {
		this.disableFocusTerritory()
		this.removeNpcMarker()
		this.layers = {}
		this.dungeonPopup = null
		this.draggableMarker = null
		if (this.map != null) {
			this.map.remove()
			this.map = null
		}
	}

	getIcon(marker) {
		return L.icon({
			iconUrl: marker.iconUrl,
			iconSize: marker.iconSize,
			iconAnchor: [marker.iconSize[0] / 2, marker.iconSize[1]],
			popupAnchor: [marker.iconSize[0] / 2, -marker.iconSize[1]],
		})
	}

	addTeleportersGeoJSON(geojson) {
		let icon = this.getIcon(this.markers.teleporter)
		this.layers["teleporters"] = L.geoJSON(geojson, {
			pointToLayer: (feature, latlng) => {
				return L.marker(latlng, {
					icon: icon
				})
			},
			onEachFeature: this.onEachTeleporter.bind(this)
		})
	}

	addPaperDataGeoJSON(geojson) {
		this.layers["paper_teleporters"] = L.geoJSON(geojson, {
			style: (_) => {
				return {
					opacity: 0,
					fillOpacity: 0,
					color: 'white',
				}
			},
			pointToLayer: (feature, latlng) => {
				const { circle_radius } = feature.properties
				return L.ellipse(latlng, [circle_radius, circle_radius / 2], 0)
			},
			onEachFeature: this.onEachPaperTeleporter.bind(this)
		})
	}

	addChestsGeoJSON(geojson) {
		let icon = this.getIcon(this.markers.chest)
		this.layers["chests"] = L.geoJSON(geojson, {
			pointToLayer: (_, latlng) => {
				return L.marker(latlng, {
					icon: icon
				})
			},
		})
	}

	addTerritoriesGeoJSON(geojson) {
		this.layers["territories"] = L.geoJSON(geojson, {
			style: (_) => {
				return {
					opacity: 0.6,
					fillOpacity: 0.2,
					color: 'white',
				}
			},
			onEachFeature: this.onEachTerritories.bind(this)
		})
	}

	onEachTeleporter(feature, layer) {
		layer.on({ click: (e) => {
			const origin_point = [e.latlng.lng, e.latlng.lat]
			const dest_map_id = feature.properties.dest_map_id
			const dest_point = feature.properties.dest_point.coordinates
			this.triggerEvent('teleporterClicked', { dest_map_id, origin_point, dest_point })
		}})
	}

	onEachPaperTeleporter(feature, layer) {
		layer.on({ click: (e) => {
			const { dest_map_id } = feature.properties
			this.triggerEvent('teleporterClicked', { dest_map_id, origin_point: null, dest_point: null })
		}})
		layer.on({ mouseover: (e) => {
			const { marker_name_point, dest_map_id, name } = feature.properties
			e.target.setStyle({ opacity: 0.6, fillOpacity: 0.2, color: 'white' })
			let popup = L.popup(xy(marker_name_point.coordinates), {
				content: `<p style="max-width: 210px">${name}</p>`,
				className: "paper-teleporter-popup",
				closeButton: false,
				offset: [0, 35]
			})
			this.map.openPopup(popup)
		}})
		layer.on({ mouseout: (e) => {
			e.target.setStyle({ opacity: 0, fillOpacity: 0 })
			this.map.closePopup();
		}})
	}

	onEachTerritories(feature, layer) {
		layer.on({ mouseover: (e) => {
			const { level_min, level_max, name, ambiance_id } = feature.properties
			if (this.focusTerritoryId !== ambiance_id) {
				e.target.setStyle({ opacity: 0.8, fillOpacity: 0.5, color: 'white' })
			}
			else {
				e.target.setStyle({ opacity: 0.8, fillOpacity: 0.5, color: 'red' })
			}
			this.triggerEvent('mouseoverTerritory', { level_min, level_max, name })

		}})
		layer.on({ mouseout: (e) => {
			const { ambiance_id } = feature.properties
			if (this.focusTerritoryId !== ambiance_id) {
				e.target.setStyle({ opacity: 0.6, fillOpacity: 0.2 })
			}
			else {
				e.target.setStyle({ opacity: 0.6, fillOpacity: 0.2 })
			}
			this.triggerEvent('mouseoutTerritory')
		}})
	}

	toggleLayer(layerName) {
		const layer = this.layers[layerName]
		if (layer !== undefined && !this.map.hasLayer(layer)) {
			this.map.addLayer(layer)
		}
	}

	disableLayer(layerName) {
		const layer = this.layers[layerName]
		if (layer !== undefined  && this.map.hasLayer(layer)) {
			this.map.removeLayer(layer)
		}
	}

	updateLayerByName(name, checked) {
		if (name === 'showTeleporters') {
			checked ? this.toggleLayer('teleporters') : this.disableLayer('teleporters')
		}
		else if (name === 'showChests') {
			checked ? this.toggleLayer('chests') : this.disableLayer('chests')
		}
		else if (name === 'showTerritories') {
			checked ? this.toggleLayer('territories') : this.disableLayer('territories')
		}
	}

	addPopupDungeonToMarker(dungeon, unbindFirst = false) {
		const { dungeon_id, name, point, min_level } = dungeon

		const teleporter = this.layers.teleporters.getLayers().find((layer) => {
			const { lat, lng } = layer.getLatLng()
			return lat === point.coordinates[1] && lng === point.coordinates[0]
		})

		const teleporter_marker_width = teleporter.options.icon.options.iconSize[0]


		this.dungeonPopup = L.popup(xy(point.coordinates), {
			content:
			`<div>
				<div id="dungeon-illustration-container"></div>
				<h3>${name}</h3>
				<p>Level: ${min_level}</p>
			</div>`,
			className: "dungeon-popup",
			offset: [-(teleporter_marker_width / 2), 0],
			closeOnClick: false,
		})

		if (unbindFirst) {
			teleporter.unbindPopup()
		}

		teleporter.bindPopup(this.dungeonPopup).openPopup()
		let img = new Image();
		img.onload = () => {
			document.getElementById("dungeon-illustration-container").appendChild(img);
		}
		img.src = `/img/gui/map/dungeon_illustrations/${dungeon_id}.png`;
		this.dungeonPopup.data = dungeon
	}



	focusTerritory(ambiance_id) {
		this.disableFocusTerritory()
		const territory = this.layers.territories.getLayers().find((layer) => {
			return layer.feature.geometry.properties.ambiance_id === ambiance_id
		})
		territory.setStyle({ color: 'red' })
		this.focusTerritoryId = ambiance_id
	}

	disableFocusTerritory() {
		if (this.focusTerritoryId != null) {
			const territory = this.layers.territories.getLayers().find((layer) => {
				return layer.feature.geometry.properties.ambiance_id === this.focusTerritoryId
			})
			if (territory !== undefined) {
				territory.setStyle({ opacity: 0.6, fillOpacity: 0.2, color: 'white' })
			}
			this.focusTerritoryId = null
		}
	}

	removeNpcMarker() {
		if (this.npcMarker !== null && this.map != null) {
			this.map.removeLayer(this.npcMarker)
			this.npcMarker = null
		}
	}

	setNpcMarker(location, npc_id) {
		this.removeNpcMarker()
		const { point } = location
		let icon = this.getIcon(this.markers[`npc_${npc_id}`])
		this.npcMarker = L.marker(xy(point.coordinates), { icon })
		this.npcMarker.data = { location, npc_id }
		if (this.map != null) {
			this.map.addLayer(this.npcMarker)
		}
	}

	setMaxZoom(point) {
		this.map.setView(xy(point), this.map.getMaxZoom())
	}

	createDraggableMarker(position, isMouseCoord = true, openPopup = true) {
		const { x, y } = position
		const url = this.markers["custom_marker"].iconUrl
		const size = this.markers["custom_marker"].iconSize
		let icon = L.icon({
			iconUrl: url,
			iconSize: size,
			iconAnchor: [size[0] / 2, size[1] / 2],
			popupAnchor: [size[0] / 2, -size[1]],
		})

		const latlng = isMouseCoord ? this.map.containerPointToLatLng(L.point(x, y)) : xy([x, y])

		const popup = L.popup(latlng, {
			content: `
			<div>
				<p id="share-location">${this.lang == "fr" ? "Partager la position" : "Share location"}</p>
			<div>`,
			className: "custom-marker-popup",
			closeButton: false,
			offset: [-size[0] / 2, size[1] / 2]
		})

		this.draggableMarker = L.marker(latlng, {
			icon,
			draggable: true,
			riseOnHover: true,
			zIndexOffset: 10000
		})
		this.map.addLayer(this.draggableMarker)
		this.draggableMarker.on('popupopen', () => {
			document.getElementById("share-location").addEventListener("click", (e) => {
				const { lat, lng } = this.draggableMarker.getLatLng()
				const searchParams = new URLSearchParams(window.location.search);
				searchParams.set("lat", lat)
				searchParams.set("lng", lng)
				const url = `${window.location.origin}/?${searchParams.toString()}`
				navigator.clipboard.writeText(url)
				.then(() => {
					const target = e.target ? e.target : e.srcElement;
					target.innerText = this.lang == "fr" ? "URL Copié !" : "URL Copied !"
					setTimeout(() => {
						target.innerText = this.lang == "fr" ? "Partager la position" : "Share location"
					}, 2000)
				},
				() => {
					const target = e.target ? e.target : e.srcElement;
					target.innerText = this.lang == "fr" ? "Erreur" : "Error";
					setTimeout(() => {
						target.innerText = this.lang == "fr" ? "Partager la position" : "Share location"
					}, 2000)
				})
			})
		})
		this.draggableMarker.bindPopup(popup);
		if (openPopup) {
			this.draggableMarker.openPopup();
		}
	}

	removeExistingDraggableMarker() {
		if (this.draggableMarker !== null) {
			this.map.removeLayer(this.draggableMarker)
			this.draggableMarker = null
		}
	}
}