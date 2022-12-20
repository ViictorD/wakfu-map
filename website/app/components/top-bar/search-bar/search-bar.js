import './search-bar.scss'
import template from './search-bar.html'
import { Component } from '../../component'
import { DungeonResult } from './dungeon-result/dungeon-result'
import { MonsterResult } from './monster-result/monster-result'
import { ZoneResult } from './zone-result/zone-result'
import { ResourceResult } from './resource-result/resource-result'
import { NpcResult } from './npc-result/npc-result'

const RESULT_NAMES = [
	'dungeon-result',
	'monster-result',
	'zone-result',
	'resource-result',
	'npc-result',
]

export class SearchBar extends Component {
	constructor(placeHolderId, props) {
		super(placeHolderId, props, template)

		this.clearResultsComponents()
		this.lang = props.lang
		this.canCloseResults = true
		this.clickEventFn = null

		if (props.lang === 'en') {
			this.refs.input.placeholder = 'Search'
			this.refs['dungeon-name'].innerText = 'Dungeons'
			this.refs['monster-name'].innerText = 'Monsters'
			this.refs['resource-name'].innerText = 'Resources'
			this.refs['npc-name'].innerText = "NPC's"
			this.refs["no-result-p"].innerText = 'No result'
		}
		this.refs['results-container'].addEventListener('mouseenter', () => {
			this.canCloseResults = false
		})
		this.refs['search-container'].addEventListener('mouseenter', () => {
			this.canCloseResults = false
		})
		this.refs['results-container'].addEventListener('mouseleave', () => {
			this.canCloseResults = true
		})
		this.refs.input.addEventListener('focusin', () => {
			this.refs["results-container"].style.display = 'block'
			this.canCloseResults = false
			if (this.clickEventFn == null) {
				this.clickEventFn = this.hideResultsContainer.bind(this)
				document.addEventListener('mousedown', this.clickEventFn)
			}
		})
		this.refs.input.addEventListener('input', this.inputChanged.bind(this))
		this.refs["no-result-p"].innerText = this.lang === 'fr' ? 'Aucun résultat' : 'No result'

		this.refs['load-more-dungeons'].addEventListener('click', () => this.loadMoreResults('dungeon'))
		this.refs['load-more-monsters'].addEventListener('click', () => this.loadMoreResults('monster'))
		this.refs['load-more-zones'].addEventListener('click', () => this.loadMoreResults('zone'))
		this.refs['load-more-resources'].addEventListener('click', () => this.loadMoreResults('resource'))
		this.refs['load-more-npcs'].addEventListener('click', () => this.loadMoreResults('npc'))
	}

	hideResultsContainer(e) {
		if (this.canCloseResults) {
			this.refs["results-container"].style.display = 'none'
			document.removeEventListener('mousedown', this.clickEventFn)
			this.clickEventFn = null
		}
	}

	inputChanged() {
		if (this.timeoutId != null) {
			clearTimeout(this.timeoutId)
		}
		const query = this.refs.input.value.trim()
		if (query.length == 0) {
			if (!this.refs.results.classList.contains('display-none')) {
				this.refs.results.classList.add('display-none')
			}
			this.clearResults()
			return ;
		}
		this.timeoutId = setTimeout(() => {
			this.timeoutId = null
			this.triggerEvent('searchInputChanged', { value: query })
		}, 500)
	}

	loadMoreResults(type) {
		this.moreResultType = type
		const query = this.refs.input.value.trim()
		const offset = this.getLastResultId(type)
		if (offset > 0) {
			this.triggerEvent('loadMoreResults', { type, offset, query })
		}
	}

	getLastResultId(type) {
		const result_name = RESULT_NAMES.find((e) => e.includes(type))
		let max = 0
		document.querySelectorAll(`div[id*='${result_name}']`)
		.forEach((e) => {
			const id = parseInt(e.id.split('-')[2])
			if (id > max) {
				max = id
			}
		})
		return max
	}

	insertResults(results) {
		this.clearResults()
		if (this.refs.results.classList.contains('display-none')) {
			this.refs.results.classList.remove('display-none')
		}
		const { dungeons, monsters, resources, zones, npcs } = results

		if (dungeons.length == 0 && monsters.length == 0 && zones.length == 0
			&& resources.length == 0 && npcs.length == 0) {
			this.updateResultsContainerVisibility('dungeons-result', false)
			this.updateResultsContainerVisibility('monsters-result', false)
			this.updateResultsContainerVisibility('zones-result', false)
			this.updateResultsContainerVisibility('resources-result', false)
			this.updateResultsContainerVisibility('npcs-result', false)
			if (this.refs['no-result'].classList.contains('display-none')) {
				this.refs['no-result'].classList.remove('display-none')
			}
			return ;
		}
		else if (!this.refs['no-result'].classList.contains('display-none')){
			this.refs['no-result'].classList.add('display-none')
		}

		// Dungeon
		dungeons.length > 0 ? this.updateResultsContainerVisibility('dungeons-result', true) : this.updateResultsContainerVisibility('dungeons-result', false)
		this.insertResultDungeonRows(dungeons)
		this.updatePlusVisibility(this.refs['load-more-dungeons'], dungeons.length)

		// Monster
		monsters.length > 0 ? this.updateResultsContainerVisibility('monsters-result', true) : this.updateResultsContainerVisibility('monsters-result', false)
		this.insertResultMonsterRows(monsters)
		this.updatePlusVisibility(this.refs['load-more-monsters'], monsters.length)

		// Zone
		zones.length > 0 ? this.updateResultsContainerVisibility('zones-result', true) : this.updateResultsContainerVisibility('zones-result', false)
		this.insertResultZoneRows(zones)
		this.updatePlusVisibility(this.refs['load-more-zones'], zones.length)

		// Resources
		resources.length > 0 ? this.updateResultsContainerVisibility('resources-result', true) : this.updateResultsContainerVisibility('resources-result', false)
		this.insertResultResourceRows(resources)
		this.updatePlusVisibility(this.refs['load-more-resources'], resources.length)
		
		// Npcs
		npcs.length > 0 ? this.updateResultsContainerVisibility('npcs-result', true) : this.updateResultsContainerVisibility('npcs-result', false)
		this.insertResultNpcRows(npcs)
		this.updatePlusVisibility(this.refs['load-more-npcs'], npcs.length)

		// Scrollbar handler
		if (this.refs['results-rows'].scrollHeight > this.refs['results-rows'].clientHeight) {
			this.refs['results-rows'].style.overflowY = 'scroll'
			this.refs['results-rows'].style.marginRight = '0px'
		}
		else {
			this.refs['results-rows'].style.overflowY = 'hidden'
			this.refs['results-rows'].style.marginRight = '10px'
		}
	}

	updatePlusVisibility(elem, len) {
		if (len < 5 && !elem.classList.contains('display-none')) {
			elem.classList.add('display-none')
		}
		else if (len == 5 && elem.classList.contains('display-none')) {
			elem.classList.remove('display-none')
		}
	}

	insertMoreResults(results) {
		const { dungeons, monsters, resources, zones, npcs } = results

		const offset = this.getLastResultId(this.moreResultType)
		if (this.moreResultType == 'dungeon') {
			if (dungeons.length > 0) {
				this.insertResultDungeonRows(dungeons, offset)
				this.updatePlusVisibility(this.refs['load-more-dungeons'], dungeons.length)
			}
			else {
				this.updatePlusVisibility(this.refs['load-more-dungeons'], 1)
			}
		}
		else if (this.moreResultType == 'monster') {
			if (monsters.length > 0) {
				this.insertResultMonsterRows(monsters, offset)
				this.updatePlusVisibility(this.refs['load-more-monsters'], monsters.length)
			}
			else {
				this.updatePlusVisibility(this.refs['load-more-monsters'], 1)
			}
		}
		else if (this.moreResultType == 'zone') {
			if (zones.length > 0) {
				this.insertResultZoneRows(zones, offset)
				this.updatePlusVisibility(this.refs['load-more-zones'], zones.length)
			}
			else {
				this.updatePlusVisibility(this.refs['load-more-zones'], 1)
			}
		}
		else if (this.moreResultType == 'resource') {
			if (resources.length > 0) {
				this.insertResultResourceRows(resources, offset)
				this.updatePlusVisibility(this.refs['load-more-resources'], resources.length)
			}
			else {
				this.updatePlusVisibility(this.refs['load-more-resources'], 1)
			}
		}
		else if (this.moreResultType == 'npc') {
			if (npcs.length > 0) {
				this.insertResultNpcRows(npcs, offset)
				this.updatePlusVisibility(this.refs['load-more-npcs'], npcs.length)
			}
			else {
				this.updatePlusVisibility(this.refs['load-more-npcs'], 1)
			}
		}
	}

	insertResultDungeonRows(dungeons, offset = 0) {
		for (let dungeon of dungeons) {
			++offset
			let result_div = document.createElement('div')
			result_div.setAttribute("id", `dungeon-result-${offset}`)
			this.refs['dungeons-result'].appendChild(result_div)
			dungeon.point = JSON.parse(dungeon.point)
			let component = new DungeonResult(`dungeon-result-${offset}`, {
				data: dungeon,
				events: { dungeonSearchClick: (event) => {
					this.triggerEvent('dungeonSearchClick', event.detail)
					this.refs["results-container"].style.display = 'none'
				}}
			})
			this.results.dungeons.push(component)
		}
	}

	insertResultMonsterRows(monsters, offset = 0) {
		for (let monster of monsters) {
			++offset
			let result_div = document.createElement('div')
			result_div.setAttribute("id", `monster-result-${offset}`)
			this.refs['monsters-result'].appendChild(result_div)
			let component = new MonsterResult(`monster-result-${offset}`, {
				data: monster,
				events: { monsterSearchClick: (event) => {
					this.triggerEvent('monsterSearchClick', event.detail)
					this.refs["results-container"].style.display = 'none'
				}}
			})
			this.results.monsters.push(component)
		}
	}

	insertResultResourceRows(resources, offset = 0) {
		for (let resource of resources) {
			++offset
			let result_div = document.createElement('div')
			result_div.setAttribute("id", `resource-result-${offset}`)
			this.refs['resources-result'].appendChild(result_div)
			let component = new ResourceResult(`resource-result-${offset}`, {
				data: resource,
				events: { resourceSearchClick: (event) => {
					this.triggerEvent('resourceSearchClick', event.detail)
					this.refs["results-container"].style.display = 'none'
				}}
			})
			this.results.resources.push(component)
		}
	}

	insertResultZoneRows(zones, offset = 0) {
		for (let zone of zones) {
			++offset
			let result_div = document.createElement('div')
			result_div.setAttribute("id", `zone-result-${offset}`)
			this.refs['zones-result'].appendChild(result_div)
			let component = new ZoneResult(`zone-result-${offset}`, {
				data: zone,
				events: { zoneSearchClick: (event) => {
					this.triggerEvent('zoneSearchClick', event.detail)
					this.refs["results-container"].style.display = 'none'
				}}
			})
			this.results.zones.push(component)
		}
	}

	insertResultNpcRows(npcs, offset = 0) {
		for (let npc of npcs) {
			++offset
			let result_div = document.createElement('div')
			result_div.setAttribute("id", `npc-result-${offset}`)
			this.refs['npcs-result'].appendChild(result_div)
			let component = new NpcResult(`npc-result-${offset}`, {
				data: npc,
				events: { npcSearchClick: (event) => {
					this.triggerEvent('npcSearchClick', event.detail)
					this.refs["results-container"].style.display = 'none'
				}}
			})
			this.results.npcs.push(component)
		}
	}

	clearResultsComponents() {
		this.results = {
			dungeons: [],
			monsters: [],
			zones: [],
			resources: [],
			npcs: []
		};
	}

	updateResultsContainerVisibility(ref, enable) {
		if (enable && this.refs[ref].classList.contains('display-none')) {
			this.refs[ref].classList.remove('display-none')
		}
		else if (!enable && !this.refs[ref].classList.contains('display-none')) {
			this.refs[ref].classList.add('display-none')
		}
	}

	clearResults() {
		this.clearResultsComponents()
		RESULT_NAMES.forEach((result_name) => {
			document.querySelectorAll(`div[id*='${result_name}']`).forEach((e) => e.remove())
		})
	}

}