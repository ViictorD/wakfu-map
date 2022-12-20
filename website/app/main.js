import { library, dom } from '@fortawesome/fontawesome-svg-core'
import { faLocationPin, faBox, faDrawPolygon, faDoorOpen, faMagnifyingGlass, faArrowLeftLong } from '@fortawesome/free-solid-svg-icons'

import { generateSwitchCookieIfNotExists, getSwitchesCookie, setSwitchCookie, getCookie } from "./cookie.js";
import './main.scss'
import template from './main.html'
import { ApiService } from './services/api'

import { Map } from './components/map/map'
import { TopBar } from './components/top-bar/top-bar'
import { InfoPanel } from './components/info-panel/info-panel'
import { MonsterPanel } from "./components/monster-panel/monster-panel.js";
import { ResourcePanel } from "./components/resource-panel/resource-panel.js";
import { NpcPanel } from "./components/npc-panel/npc-panel.js";
import { DragableMarker } from "./components/dragable-marker/dragable-marker.js";
import { NavigationButton } from './components/navigation-button/navigation-button.js';

class ViewController {
	constructor() {
		this.lat = null
		this.lng = null
		this.initFontAwesome()
		this.redirectLanguage()
		document.getElementById('app').outerHTML = template
		if (!window.location.hostname.includes('localhost')) {
			this.api = new ApiService('https://api.wakfu-map.com')
		}
		else {
			this.api = new ApiService()
		}
		generateSwitchCookieIfNotExists()
		this.loadLanguage()
		this.readUrl()
		this.initializeComponents()
		this.initializeMarkers();
		this.loadMap()
		this.extendedInfoPanelComponent = null
		this.historyMaxId = 0
		this.currentHistoryId = 0
		this.historyCount = 0

		window.onpopstate = async (e) => {
			if (e.state && !isNaN(e.state.map_id)) {
				let zoom_level = null
				if ('zoom_level' in e.state) {
					zoom_level = e.state.zoom_level
				}
				await this.changeMap(e.state.map_id, null, e.state.origin_point, true, zoom_level, true)
				this.historyCount -= this.currentHistoryId > e.state.id ? 2 : 0;
				this.currentHistoryId = e.state.id
				if (this.historyCount == 0) {
					this.navigationButtonComponent.hide()
				}
			}
		}
	}

	initFontAwesome() {
		library.add(faLocationPin)
		library.add(faBox)
		library.add(faDrawPolygon)
		library.add(faDoorOpen)
		library.add(faMagnifyingGlass)
		library.add(faArrowLeftLong)
		dom.watch()
	}

	redirectLanguage() {
		let cookie_lang = getCookie('lang')
		if (cookie_lang === undefined) {
			return ;
		}
		if (cookie_lang == 'fr' && window.location.pathname !== '/') {
			window.location.pathname = '/'
		}
		if (cookie_lang == 'en' && window.location.pathname.indexOf(`/${cookie_lang}/`) == -1) {
			window.location.pathname = `/${cookie_lang}`
		}
	}

	loadLanguage() {
		let lang = 'fr'
		if (window.location.pathname.indexOf('/en/') != -1) {
			lang = 'en'
		}
		this.lang = lang
	}

	readUrl() {
		let is_indoor = false;
		this.map_id = -1
		if (window.location.search.length > 0) {
			let searchParams = new URLSearchParams(window.location.search)
			if (searchParams.has('indoor')) {
				setSwitchCookie('showIndoor', true)
				is_indoor = true
			}
			if (searchParams.has('map_id')) {
				const map_id = parseInt(searchParams.get('map_id'))
				if (!isNaN(map_id)) {
					this.map_id = map_id
				}
			}
			if (searchParams.has('lat')) {
				const lat = parseInt(searchParams.get('lat'))
				if (!isNaN(lat)) {
					this.lat = lat
				}
			}
			if (searchParams.has('lng')) {
				const lng = parseInt(searchParams.get('lng'))
				if (!isNaN(lng)) {
					this.lng = lng
				}
			}
		}
		if (!is_indoor) {
			setSwitchCookie('showIndoor', false)
		}
	}

	initializeComponents() {
		const switches = getSwitchesCookie()
		this.mapComponent = new Map('map-placeholder', {
			lang: this.lang,
			events: { teleporterClicked: (event) => {
				let { dest_map_id, origin_point, dest_point } = event.detail
				this.changeMap(dest_map_id, origin_point, dest_point, false, null, true)
			},
			mouseoverTerritory: (event) => {
				let { level_min, level_max, name } = event.detail
				this.infoPanelComponent.setName(name)
				this.infoPanelComponent.setLevel(level_min, level_max)
			},
			mouseoutTerritory: () => {
				this.infoPanelComponent.setSaved()
			}}
		})
		this.topBarComponent = new TopBar('top-bar-placeholder', {
			lang: this.lang,
			isPaperMap: this.map_id < 0,
			switches,
			events: {
				switchClick: (event) => {
					const { checked, name } = event.detail
					if (['showTeleporters', 'showChests', 'showTerritories'].indexOf(name) != -1) {
						this.mapComponent.updateLayerByName(name, checked)
					}
					if (name === 'showIndoor') {
						this.showIndoor(checked)
					}
				},
				searchInputChanged: (event) => {
					const { value } = event.detail
					this.api.getSearch(this.lang, value)
					.then((data) => {
						if (data !== null) {
							this.topBarComponent.searchBarComponent.insertResults(data)
						}
					})
					.catch((err) => console.error(err))
				},
				loadMoreResults: (event) => {
					const { type, offset, query } = event.detail
					this.api.getSearchMore(this.lang, type, offset, query)
					.then((data) => {
						if (data !== null) {
							this.topBarComponent.searchBarComponent.insertMoreResults(data)
						}
					})
					.catch((err) => console.error(err))
				},
				dungeonSearchClick: async (event) => {
					this.clearExtendedInfoPanel()
					const { map_id, point } = event.detail
					let origin_point = null
					if (this.map > 0) {
						const center = this.mapComponent.map.getCenter()
						origin_point = [center.lng, center.lat]
					}
					const dest_point = point.coordinates
					setSwitchCookie('showTeleporters', true)
					if (this.map_id != map_id) {
						await this.changeMap(map_id, origin_point, dest_point, false)
					}
					else {
						this.topBarComponent.teleportersComponent.activateAndEnable(true)
						this.mapComponent.updateLayerByName('showTeleporters', true)
					}
					this.mapComponent.addPopupDungeonToMarker(event.detail)
				},
				monsterSearchClick: async (event) => {
					this.clearExtendedInfoPanel()
					this.extendedInfoPanelComponent = new MonsterPanel('extended-info-panel-placeholder', {
						data: event.detail,
						events: {
							closeClick: () => {
								this.clearExtendedInfoPanel()
							},
							monsterTerritoryClick: (event) => {
								const { location } = event.detail
								this.focusZone(location)
							}
						}
					})
					const { location } = event.detail
					const first_location = location[0]
					this.focusZone(first_location)
				},
				resourceSearchClick: async (event) => {
					this.clearExtendedInfoPanel()
					this.extendedInfoPanelComponent = new ResourcePanel('extended-info-panel-placeholder', {
						data: event.detail,
						events: {
							closeClick: () => {
								this.clearExtendedInfoPanel()
							},
							resourceTerritoryClick: (event) => {
								const { location } = event.detail
								this.focusZone(location)
							}
						}
					})
					const { location } = event.detail
					const first_location = location[0]
					this.focusZone(first_location)
				},
				zoneSearchClick: async (event) => {
					this.clearExtendedInfoPanel()
					const { location } = event.detail
					this.focusZone(location)
				},
				npcSearchClick: async (event) => {
					this.clearExtendedInfoPanel()
					this.extendedInfoPanelComponent = new NpcPanel('extended-info-panel-placeholder', {
						data: event.detail,
						events: {
							closeClick: () => {
								this.mapComponent.removeNpcMarker()
								this.clearExtendedInfoPanel()
							},
							npcTerritoryClick: (event) => {
								const { location, npc_id } = event.detail
								this.setNpcMarker(location, npc_id)
							}
						}
					})
					const { location, npc_id } = event.detail
					const first_location = location[0]
					this.setNpcMarker(first_location, npc_id)
				}
			},
		})
		this.infoPanelComponent = new InfoPanel('info-panel-placeholder', {})
		this.dragableMarkerComponent = new DragableMarker('dragable-marker-placeholder', {
			events: {
				createDraggableMarker: (e) => {
					this.mapComponent.createDraggableMarker(e.detail)
				},
				removeExistingDraggableMarker: () => {
					this.mapComponent.removeExistingDraggableMarker()
				}
			}
		})
		this.navigationButtonComponent = new NavigationButton('navigation-button-placeholder', {
			lang: this.lang,
			events: { popstate: () => {
				history.back()
			}}
		})
	}

	clearExtendedInfoPanel() {
		if (this.extendedInfoPanelComponent != null) {
			this.extendedInfoPanelComponent.clearEvents()
			document.getElementById('extended-info-panel-placeholder').innerHTML = '';
			this.extendedInfoPanelComponent = null
			this.mapComponent.disableFocusTerritory()
		}
	}

	async setNpcMarker(location, npc_id) {
		if (this.map_id != location.map_id) {
			let origin_point = null
			if (this.map > 0) {
				const center = this.mapComponent.map.getCenter()
				origin_point = [center.lng, center.lat]
			}
			await this.changeMap(location.map_id, origin_point, location.point.coordinates, false)
			this.mapComponent.setNpcMarker(location, npc_id)
		}
		else {
			this.mapComponent.setNpcMarker(location, npc_id)
			this.mapComponent.setMaxZoom(location.point.coordinates)
		}
	}

	async focusZone(location) {
		if (this.map_id != location.map_id) {
			await this.changeMap(location.map_id, null, null, false)
		}
		this.topBarComponent.territoriesComponent.activateAndEnable(true)
		this.mapComponent.updateLayerByName('showTerritories', true)
		this.mapComponent.focusTerritory(location.ambiance_id)
	}

	initializeMarkers() {
		this.markers = {}
		this.markers["teleporter"] = {
			iconUrl: '/img/markers/teleporter.png',
			iconSize: [40, 40],
		}
		this.markers["chest"] = {
			iconUrl: '/img/markers/chest.png',
			iconSize: [40, 40],
		}
		this.markers["npc_1"] = {
			iconUrl: '/img/markers/guild.png',
			iconSize: [40, 40],
		}
		this.markers["npc_2"] = {
			iconUrl: '/img/markers/mercenary.png',
			iconSize: [40, 40],
		}
		this.markers["custom_marker"] = {
			iconUrl: '/img/gui/poi/custom_marker.png',
			iconSize: [32, 32],
		}
	}

	async loadMap(dest_point = null, zoom_level = null) {
		let map_data = await this.api.getMapData(this.lang, this.map_id)
		if (map_data == null) {
			if (this.lang == "fr") {
				document.getElementById("load-failed-1").innerText = "Il y a rien ici"
				document.getElementById("load-failed-2").innerHTML = "Retournez plutôt dans le <a href=\"/\">Krosmoz</a>"
			}
			else {
				document.getElementById("load-failed-1").innerText = "There is nothing here"
				document.getElementById("load-failed-2").innerHTML = "Go back to the <a href=\"/en\">Krosmoz</a> instead"
			}
			document.getElementById("load-failed").style.display = "block"
			document.getElementById("info-panel-placeholder").style.display = "none"
			document.getElementById("dragable-marker-placeholder").style.display = "none"
			return ;
		}
		else {
			document.getElementById("load-failed").style.display = "none"
			document.getElementById("info-panel-placeholder").style.display = "block"
			document.getElementById("dragable-marker-placeholder").style.display = "block"
		}

		this.infoPanelComponent.setName(map_data.name)
		this.infoPanelComponent.saveName(map_data.name)

		if (map_data.is_indoor) {
			this.topBarComponent.indoorComponent.activate();
		}
		else {
			this.topBarComponent.indoorComponent.deactivateAndDisable();
		}

		const switches = getSwitchesCookie()
		this.mapComponent.initMap(
			this.map_id, map_data,
			this.markers,
			switches.showIndoor,
			dest_point,
			zoom_level,
			{ lat: this.lat, lng: this.lng }
		)

		if (this.map_id < 0) {
			this.topBarComponent.disableAllSwitches();
			let paper_data = await this.api.getPaperData(this.lang, this.map_id)
			if (paper_data != null) {
				this.mapComponent.addPaperDataGeoJSON(paper_data)
				this.mapComponent.toggleLayer("paper_teleporters")
			}
			return
		}

		let teleporters_data = await this.api.getTeleporters(this.map_id)
		if (teleporters_data != null && teleporters_data.length > 0) {
			this.mapComponent.addTeleportersGeoJSON(teleporters_data)
			this.topBarComponent.teleportersComponent.activateAndEnable(switches.showTeleporters)
		}
		else {
			this.topBarComponent.teleportersComponent.deactivateAndDisable();
		}
		
		let chests_data = await this.api.getChests(this.map_id)
		if (chests_data != null && chests_data.length > 0) {
			this.mapComponent.addChestsGeoJSON(chests_data)
			this.topBarComponent.chestsComponent.activateAndEnable(switches.showChests)
		}
		else {
			this.topBarComponent.chestsComponent.deactivateAndDisable()
		}

		let territories_data = await this.api.getTerritories(this.lang, this.map_id)
		if (territories_data && territories_data.length > 0) {
			this.infoPanelComponent.searchMinMaxLevelFromTerritoriesAndSet(territories_data)
			this.mapComponent.addTerritoriesGeoJSON(territories_data)
			this.topBarComponent.territoriesComponent.activateAndEnable(switches.showTerritories)
		}
		else {
			this.topBarComponent.territoriesComponent.deactivateAndDisable()
			this.infoPanelComponent.setLevel(1, 230)
		}
		
		this.mapComponent.updateLayerByName("showTeleporters", switches.showTeleporters)
		this.mapComponent.updateLayerByName("showChests", switches.showChests)
		this.mapComponent.updateLayerByName("showTerritories", switches.showTerritories)
	}

	showIndoor(checked) {
		const latlng = this.mapComponent.map.getCenter()
		const center = [latlng.lng, latlng.lat]
		const zoom_level = this.mapComponent.map.getZoom()
		window.history.replaceState(
			{ "map_id": this.map_id, origin_point: center, zoom_level },
			"",
			window.location.pathname + window.location.search
		)
		window.history.pushState(
			{ map_id: this.map_id, origin_point: center, zoom_level },
			"",
			`${window.location.pathname}?map_id=${this.map_id}${checked ? '&indoor' : ''}`
		)
		this.mapComponent.removeMap()
		this.readUrl()
		this.loadMap(center, zoom_level)
	}

	async changeMap(dest_map_id, origin_point, dest_point, ispopstate, zoom_level = null, remove_extended = false) {
		if (isNaN(dest_map_id)) {
			return ;
		}
		if (!ispopstate) {
			window.history.replaceState({ "map_id": this.map_id, origin_point, id: this.historyMaxId }, "", window.location.pathname + window.location.search)
			this.historyMaxId += 1
			this.currentHistoryId = this.historyMaxId
			window.history.pushState({ map_id: dest_map_id, origin_point: dest_point, id: this.historyMaxId }, "", `${window.location.pathname}?map_id=${dest_map_id}`)
		}
		this.lat = null;
		this.lng = null;
		if (zoom_level != null) {
			const center = this.mapComponent.map.getCenter()
			dest_point = [center.lng, center.lat]
		}
		if (remove_extended) {
			this.clearExtendedInfoPanel()
		}
		this.mapComponent.removeMap()
		this.readUrl()
		await this.loadMap(dest_point, zoom_level)
		if (this.historyCount == 0) {
			this.navigationButtonComponent.show();
		}
		this.historyCount += 1
	}
}

window.ctrl = new ViewController()