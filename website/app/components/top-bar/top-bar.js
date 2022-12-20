import './top-bar.scss'
import template from './top-bar.html'
import { Component } from '../component'

import { SearchBar } from './search-bar/search-bar'
import { Switch } from './switch/switch'
import { Lang } from './lang/lang'

export class TopBar extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.initializeComponents(props.lang, props.isPaperMap, props.switches)
	}

	initializeComponents(lang, isPaperMap, switches) {
		this.teleportersComponent = new Switch('teleporters-switch-container', {
			class: 'fa-solid fa-location-pin',
			cookie_name: 'showTeleporters',
			state: !isPaperMap ? switches.showTeleporters : false,
			disabled: isPaperMap,
			events: { switchClick: (event) => this.triggerEvent('switchClick', event.detail) }
		})
		this.chestsComponent = new Switch('chest-switch-container', {
			class: 'fa-solid fa-box',
			cookie_name: 'showChests',
			state: !isPaperMap ? switches.showChests : false,
			disabled: isPaperMap,
			events: { switchClick: (event) => this.triggerEvent('switchClick', event.detail) }
		})
		this.territoriesComponent = new Switch('territories-switch-container', {
			class: 'fa-solid fa-draw-polygon',
			cookie_name: 'showTerritories',
			state: !isPaperMap ? switches.showTerritories : false,
			disabled: isPaperMap,
			events: { switchClick: (event) => this.triggerEvent('switchClick', event.detail) }
		})
		this.indoorComponent = new Switch('indoor-switch-container', {
			class: 'fa-solid fa-door-open',
			cookie_name: 'showIndoor',
			state: !isPaperMap ? switches.showIndoor : false,
			disabled: isPaperMap,
			events: { switchClick: (event) => this.triggerEvent('switchClick', event.detail) }
		})

		this.searchBarComponent = new SearchBar('center-container', {
			lang,
			events: {
				searchInputChanged: (event) => this.triggerEvent('searchInputChanged', event.detail),
				dungeonSearchClick: (event) => this.triggerEvent('dungeonSearchClick', event.detail),
				monsterSearchClick: (event) => this.triggerEvent('monsterSearchClick', event.detail),
				resourceSearchClick: (event) => this.triggerEvent('resourceSearchClick', event.detail),
				zoneSearchClick: (event) => this.triggerEvent('zoneSearchClick', event.detail),
				npcSearchClick: (event) => this.triggerEvent('npcSearchClick', event.detail),
				loadMoreResults: (event) => this.triggerEvent('loadMoreResults', event.detail),
			}
		})

		this.langSelectorComponent = new Lang('lang-selector-container', { lang })
	}

	disableAllSwitches() {
		// Add check if last map was paper of not to not update every time we switch map

		this.teleportersComponent.deactivateAndDisable()
		this.chestsComponent.deactivateAndDisable()
		this.territoriesComponent.deactivateAndDisable()
		this.indoorComponent.deactivateAndDisable()
	}

}